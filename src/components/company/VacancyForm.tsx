/**
 * @file VacancyForm.tsx
 * @description Formulario para publicar o editar una vacante.
 *
 * El salario es obligatorio (sin salario no se publica). Los requisitos pueden ser conocimientos
 * (se comparan con el diagnóstico de la persona y enlazan a cursos) o condiciones (turnos, carné…,
 * que confirma la persona y no penalizan). La validación muestra un resumen de errores y un mensaje
 * junto a cada campo.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { AlertTriangle, Check, ChevronDown, Eye, Plus, Save, Send, Trash2, X } from 'lucide-react';

import type { JobOffer, OfferRequirement, RequirementKind, WorkModality, Workday } from '../../types';
import { offersService } from '../../services/offersService';
import { COMPANY_PRESET_ROLES } from '../../mockData';
import { REQUIREMENT_SKILLS } from '../../data/requirementSkills';
import { LOCAL_TRAINING_CATALOG } from '../../data/trainingCatalogData';
import { PageHeader } from '../common/AppShell';
import VacancyPreview from './VacancyPreview';
import type { PreviewOffer } from './VacancyPreview';

const SECTORS = ['Tecnología', 'Logística', 'Comercio', 'Hostelería', 'Industria', 'Administración pública', 'Sanidad', 'Economía social', 'Servicios'];
const CONTRACTS = ['Indefinido', 'Temporal', 'Contrato formativo', 'Prácticas remuneradas', 'Fijo discontinuo'];
const MODALITIES: WorkModality[] = ['Presencial', 'Híbrido', 'Remoto'];
const WORKDAYS: Workday[] = ['Completa', 'Parcial', 'Por turnos'];

/** Vocabulario de habilidades del catálogo de cursos (el mismo que usa `offerMatch`). */
const SKILL_VOCABULARY: string[] = [
  ...new Set([
    ...Object.values(REQUIREMENT_SKILLS).flat(),
    ...LOCAL_TRAINING_CATALOG.flatMap(course => course.skillsCovered),
    'Comunicación',
    'Inglés'
  ])
].sort((a, b) => a.localeCompare(b, 'es'));

interface RequirementDraft {
  key: string;
  label: string;
  kind: RequirementKind;
  essential: boolean;
  trainable: boolean;
  skills: string[];
}

interface Draft {
  title: string;
  sector: string;
  city: string;
  commute: string;
  modality: WorkModality;
  workday: Workday;
  contract: string;
  salaryMin: string;
  salaryMax: string;
  description: string;
  requirements: RequirementDraft[];
  openToNewcomers: boolean;
  closesAt: string;
  responseDays: string;
}

type Errors = Partial<Record<string, string>>;

const today = (): string => new Date().toISOString().slice(0, 10);
const inDays = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

let keyCounter = 0;
const newKey = (): string => `req-${Date.now().toString(36)}-${keyCounter++}`;

const emptyRequirement = (kind: RequirementKind = 'knowledge'): RequirementDraft => ({
  key: newKey(), label: '', kind, essential: true, trainable: false, skills: []
});

function draftFromOffer(offer?: JobOffer): Draft {
  if (!offer) {
    return {
      title: '', sector: '', city: '', commute: '', modality: 'Presencial', workday: 'Completa', contract: '',
      salaryMin: '', salaryMax: '', description: '', requirements: [emptyRequirement()],
      openToNewcomers: true, closesAt: inDays(30), responseDays: '7'
    };
  }
  return {
    title: offer.title, sector: offer.sector, city: offer.city, commute: offer.commute, modality: offer.modality,
    workday: offer.workday, contract: offer.contract, salaryMin: String(offer.salaryMin), salaryMax: String(offer.salaryMax),
    description: offer.description,
    requirements: offer.requirements.map(r => ({ key: r.id, label: r.label, kind: r.kind, essential: r.essential, trainable: r.trainable, skills: r.skills })),
    openToNewcomers: offer.openToNewcomers, closesAt: offer.closesAt, responseDays: String(offer.responseDays)
  };
}

/** Convierte "21.000" o "21000" en número (o NaN). */
const parseEuros = (value: string): number => Number(value.replace(/[.\s€]/g, '').replace(',', '.'));

function validate(draft: Draft, isNew: boolean): Errors {
  const errors: Errors = {};
  if (!draft.title.trim()) errors.title = 'Indica el nombre del puesto.';
  if (!draft.sector.trim()) errors.sector = 'Indica el sector de la empresa.';
  if (!draft.city.trim()) errors.city = 'Indica la ciudad (o "Remoto").';
  if (draft.modality !== 'Remoto' && !draft.commute.trim()) {
    errors.commute = 'Explica cómo llegar: zona y transporte público más cercano.';
  }
  if (!draft.contract.trim()) errors.contract = 'Indica el tipo de contrato.';

  const min = parseEuros(draft.salaryMin);
  const max = parseEuros(draft.salaryMax);
  if (!draft.salaryMin.trim() || !Number.isFinite(min) || min <= 0) {
    errors.salaryMin = 'El salario mínimo es obligatorio: sin salario no se publica la vacante.';
  } else if (min < 1000) {
    errors.salaryMin = 'El salario es bruto anual (por ejemplo, 20000).';
  }
  if (!draft.salaryMax.trim() || !Number.isFinite(max) || max <= 0) {
    errors.salaryMax = 'El salario máximo es obligatorio (puede ser igual al mínimo).';
  } else if (!errors.salaryMin && max < min) {
    errors.salaryMax = 'El salario máximo no puede ser menor que el mínimo.';
  }

  if (draft.description.trim().length < 20) errors.description = 'Describe el puesto en al menos una frase (20 caracteres).';

  if (draft.requirements.length === 0) errors.requirements = 'Añade al menos un requisito.';
  draft.requirements.forEach((req, index) => {
    if (!req.label.trim()) errors[`req-${req.key}`] = `Escribe el texto del requisito ${index + 1}.`;
  });

  if (!draft.closesAt) errors.closesAt = 'Indica la fecha de cierre.';
  else if (isNew && draft.closesAt < today()) errors.closesAt = 'La fecha de cierre no puede ser anterior a hoy.';

  const days = Number(draft.responseDays);
  if (!Number.isInteger(days) || days < 1 || days > 60) {
    errors.responseDays = 'Indica en cuántos días respondéis (entre 1 y 60).';
  }
  return errors;
}

/** Secciones numeradas del formulario (y del índice lateral). */
type SectionId = 'puesto' | 'condiciones' | 'requisitos' | 'plazos';
const SECTIONS: { id: SectionId; title: string; fields: string[] }[] = [
  { id: 'puesto', title: 'Puesto', fields: ['title', 'sector', 'description', 'city', 'commute'] },
  { id: 'condiciones', title: 'Condiciones', fields: ['contract', 'salaryMin', 'salaryMax'] },
  { id: 'requisitos', title: 'Requisitos', fields: ['requirements'] },
  { id: 'plazos', title: 'Plazos', fields: ['closesAt', 'responseDays'] }
];

/** Orden de los campos para el resumen de errores y para mover el foco al primero. */
const FIELD_ORDER = SECTIONS.flatMap(section => section.fields);

function sectionOf(field: string): SectionId {
  const key = field.startsWith('req-') ? 'requirements' : field;
  return SECTIONS.find(section => section.fields.includes(key))?.id ?? 'puesto';
}

function fieldRank(field: string): number {
  const index = FIELD_ORDER.indexOf(field.startsWith('req-') ? 'requirements' : field);
  return index === -1 ? 99 : index;
}

function fieldId(field: string): string {
  return field.startsWith('req-') ? `vacancy-${field}-label` : `vacancy-${field}`;
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

/** Etiqueta + control + pista + error, enlazados por id para lectores de pantalla. */
function Field({ id, label, error, hint, required, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="label-tech">{label}{required && ' *'}</label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-meta text-fg-3 mt-1.5">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-meta text-danger mt-1.5">{error}</p>}
    </div>
  );
}

/** Atributos de accesibilidad de un control según su estado de error. */
function a11y(id: string, error?: string, hint?: string) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy };
}

interface VacancyFormProps {
  companyEmail: string;
  companyName: string;
  /** Vacante a editar. Sin ella, se publica una nueva. */
  offer?: JobOffer;
  onSaved: (offer: JobOffer, isNew: boolean) => void;
  onCancel?: () => void;
}

export default function VacancyForm({ companyEmail, companyName, offer, onSaved, onCancel }: VacancyFormProps) {
  const isNew = !offer;
  const [draft, setDraft] = useState<Draft>(() => draftFromOffer(offer));
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string>('');
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Tras el primer intento de envío, los errores se recalculan al escribir.
  const liveErrors = useMemo(() => (submitted ? validate(draft, isNew) : errors), [submitted, draft, isNew, errors]);

  const set = <K extends keyof Draft>(field: K, value: Draft[K]) => setDraft(prev => ({ ...prev, [field]: value }));

  const updateRequirement = (key: string, patch: Partial<RequirementDraft>) =>
    setDraft(prev => ({ ...prev, requirements: prev.requirements.map(r => (r.key === key ? { ...r, ...patch } : r)) }));

  const removeRequirement = (key: string) =>
    setDraft(prev => ({ ...prev, requirements: prev.requirements.filter(r => r.key !== key) }));

  const addRequirement = (kind: RequirementKind) => {
    const req = emptyRequirement(kind);
    setDraft(prev => ({ ...prev, requirements: [...prev.requirements, req] }));
    // Lleva el foco al nuevo requisito cuando se haya pintado.
    window.setTimeout(() => document.getElementById(fieldId(`req-${req.key}`))?.focus(), 0);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaveError('');
    setSubmitted(true);
    const found = validate(draft, isNew);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      window.setTimeout(() => summaryRef.current?.focus(), 0);
      return;
    }

    setSaving(true);
    try {
      const requirements: OfferRequirement[] = draft.requirements.map((r, index) => ({
        id: offer?.requirements.some(existing => existing.id === r.key) ? r.key : `r${index + 1}-${r.key}`,
        label: r.label.trim(),
        kind: r.kind,
        essential: r.essential,
        trainable: r.trainable,
        skills: r.kind === 'knowledge' ? r.skills : []
      }));
      const saved = await offersService.saveOffer({
        id: offer?.id,
        companyEmail,
        companyName,
        title: draft.title.trim(),
        sector: draft.sector.trim(),
        city: draft.city.trim(),
        commute: draft.commute.trim(),
        modality: draft.modality,
        workday: draft.workday,
        contract: draft.contract.trim(),
        salaryMin: parseEuros(draft.salaryMin),
        salaryMax: parseEuros(draft.salaryMax),
        description: draft.description.trim(),
        requirements,
        openToNewcomers: draft.openToNewcomers,
        closesAt: draft.closesAt,
        responseDays: Number(draft.responseDays),
        status: offer?.status ?? 'open'
      });
      onSaved(saved, isNew);
    } catch (error) {
      console.error('[empresas] No se ha podido guardar la vacante:', error);
      setSaveError('No se ha podido guardar la vacante. Inténtalo de nuevo en unos segundos.');
    } finally {
      setSaving(false);
    }
  };

  const errorList = Object.entries(liveErrors)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .sort(([a], [b]) => fieldRank(a) - fieldRank(b));

  /** Errores por sección, para el índice lateral. */
  const errorsBySection = useMemo(() => {
    const counts: Record<SectionId, number> = { puesto: 0, condiciones: 0, requisitos: 0, plazos: 0 };
    errorList.forEach(([field]) => { counts[sectionOf(field)] += 1; });
    return counts;
  }, [errorList]);

  const activeSection = useActiveSection();

  const previewOffer: PreviewOffer = {
    companyName,
    title: draft.title,
    sector: draft.sector,
    city: draft.city,
    commute: draft.commute,
    modality: draft.modality,
    workday: draft.workday,
    contract: draft.contract,
    salaryMin: parseEuros(draft.salaryMin),
    salaryMax: parseEuros(draft.salaryMax),
    description: draft.description,
    requirements: draft.requirements,
    openToNewcomers: draft.openToNewcomers,
    closesAt: draft.closesAt,
    responseDays: Number(draft.responseDays)
  };

  const focusField = (field: string) => {
    const target = document.getElementById(fieldId(field));
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'center' });
  };

  return (
    <div>
      <PageHeader
        eyebrow={isNew ? 'Publicar vacante' : 'Editar vacante'}
        title={isNew ? 'Publica una vacante' : `Editar: ${offer.title}`}
        description="Las personas verán el puesto, el salario y los requisitos, y te mostrarán su interés. Tú revisas las candidaturas y decides a quién contactar. Sin comisiones de intermediación."
      />

      <div className="xl:grid xl:grid-cols-[11rem_minmax(0,1fr)] xl:gap-8">
        {/* ÍNDICE FIJO (ESCRITORIO ANCHO) */}
        <nav aria-label="Secciones del formulario" className="hidden xl:block">
          <ol className="sticky top-8 space-y-1">
            {SECTIONS.map((section, index) => {
              const errorCount = submitted ? errorsBySection[section.id] : 0;
              const current = activeSection === section.id;
              return (
                <li key={section.id}>
                  <a
                    href={`#vacancy-section-${section.id}`}
                    aria-current={current ? 'location' : undefined}
                    className={`flex min-h-11 items-center gap-2.5 rounded px-2 text-body ${current ? 'bg-raised text-fg font-semibold' : 'text-fg-2 hover:text-fg'}`}
                  >
                    <span className={`nums flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-meta ${current ? 'border-accent text-accent-strong' : 'border-line-strong text-fg-3'}`}>
                      {index + 1}
                    </span>
                    <span className="flex-1">{section.title}</span>
                    {errorCount > 0 && (
                      <span className="nums rounded-full bg-danger-soft px-1.5 text-meta font-semibold text-danger" title={`${errorCount} por revisar`}>
                        {errorCount}
                        <span className="sr-only"> por revisar</span>
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        <form onSubmit={handleSubmit} className="min-w-0 space-y-4" noValidate>
          {errorList.length > 0 && submitted && (
            <div ref={summaryRef} tabIndex={-1} role="alert" className="alert alert-danger">
              <AlertTriangle aria-hidden="true" />
              <details className="min-w-0 flex-1 group">
                <summary className="flex min-h-6 cursor-pointer list-none items-center justify-between gap-3">
                  <strong>
                    {errorList.length === 1 ? 'Falta 1 campo por revisar' : `Faltan ${errorList.length} campos por revisar`}
                  </strong>
                  <span className="flex items-center gap-1 text-meta text-fg-2">
                    <span className="group-open:hidden">Ver cuáles</span>
                    <span className="hidden group-open:inline">Ocultar</span>
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </span>
                </summary>
                <ul className="mt-2 space-y-1">
                  {errorList.map(([field, message]) => (
                    <li key={field}>
                      <a
                        href={`#${fieldId(field)}`}
                        onClick={e => { e.preventDefault(); focusField(field); }}
                        className="text-body underline underline-offset-2 hover:text-accent-strong"
                      >
                        {message}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}

          {/* 1 · PUESTO */}
          <FormSection id="puesto" number={1} title="Puesto" description="Qué es el puesto y dónde está.">
            <div className="grid md:grid-cols-2 gap-4">
              <Field id="vacancy-title" label="Puesto" required error={liveErrors.title} hint="Elige de la lista o escribe el tuyo.">
                <input
                  {...a11y('vacancy-title', liveErrors.title, 'Elige de la lista o escribe el tuyo.')}
                  type="text"
                  list="vacancy-roles"
                  value={draft.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="Ej. Atención al cliente"
                  className="input-technical"
                />
                <datalist id="vacancy-roles">
                  {COMPANY_PRESET_ROLES.map(role => <option key={role} value={role} />)}
                </datalist>
              </Field>
              <Field id="vacancy-sector" label="Sector" required error={liveErrors.sector}>
                <input
                  {...a11y('vacancy-sector', liveErrors.sector)}
                  type="text"
                  list="vacancy-sectors"
                  value={draft.sector}
                  onChange={e => set('sector', e.target.value)}
                  placeholder="Ej. Logística"
                  className="input-technical"
                />
                <datalist id="vacancy-sectors">
                  {SECTORS.map(s => <option key={s} value={s} />)}
                </datalist>
              </Field>
            </div>

            <div className="mt-4">
              <Field id="vacancy-description" label="Descripción" required error={liveErrors.description} hint="Qué hará la persona y con quién trabajará.">
                <textarea
                  {...a11y('vacancy-description', liveErrors.description, 'Qué hará la persona y con quién trabajará.')}
                  rows={4}
                  value={draft.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Ej. Atenderás por teléfono y correo a nuestros clientes. Una compañera te acompañará las primeras semanas."
                  className="input-technical resize-y"
                />
              </Field>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <Field id="vacancy-city" label="Ciudad" required error={liveErrors.city}>
                <input
                  {...a11y('vacancy-city', liveErrors.city)}
                  type="text"
                  value={draft.city}
                  onChange={e => set('city', e.target.value)}
                  placeholder="Ej. Getafe (Madrid)"
                  className="input-technical"
                />
              </Field>
              <Field
                id="vacancy-commute"
                label="Cómo llegar"
                required={draft.modality !== 'Remoto'}
                error={liveErrors.commute}
                hint="Zona y transporte público más cercano."
              >
                <input
                  {...a11y('vacancy-commute', liveErrors.commute, 'Zona y transporte público más cercano.')}
                  type="text"
                  value={draft.commute}
                  onChange={e => set('commute', e.target.value)}
                  placeholder="Ej. Polígono Los Ángeles · Cercanías C-4, 10 min a pie"
                  className="input-technical"
                />
              </Field>
            </div>
          </FormSection>

          {/* 2 · CONDICIONES */}
          <FormSection id="condiciones" number={2} title="Condiciones" description="Sin salario no se publica: es lo primero que mira la persona.">
            <div className="grid sm:grid-cols-2 gap-4">
              <fieldset>
                <legend className="label-tech">Modalidad *</legend>
                <div className="grid grid-cols-3 gap-2">
                  {MODALITIES.map(m => (
                    <button key={m} type="button" aria-pressed={draft.modality === m} onClick={() => set('modality', m)} className="option px-2 text-body font-medium text-center">
                      {m}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="label-tech">Jornada *</legend>
                <div className="grid grid-cols-3 gap-2">
                  {WORKDAYS.map(w => (
                    <button key={w} type="button" aria-pressed={draft.workday === w} onClick={() => set('workday', w)} className="option px-2 text-body font-medium text-center">
                      {w}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <Field id="vacancy-contract" label="Contrato" required error={liveErrors.contract}>
                <input
                  {...a11y('vacancy-contract', liveErrors.contract)}
                  type="text"
                  list="vacancy-contracts"
                  value={draft.contract}
                  onChange={e => set('contract', e.target.value)}
                  placeholder="Ej. Indefinido"
                  className="input-technical"
                />
                <datalist id="vacancy-contracts">
                  {CONTRACTS.map(c => <option key={c} value={c} />)}
                </datalist>
              </Field>
              <Field id="vacancy-salaryMin" label="Salario mínimo (€ brutos/año)" required error={liveErrors.salaryMin}>
                <input
                  {...a11y('vacancy-salaryMin', liveErrors.salaryMin)}
                  type="text"
                  inputMode="numeric"
                  value={draft.salaryMin}
                  onChange={e => set('salaryMin', e.target.value)}
                  placeholder="Ej. 19000"
                  className="input-technical nums"
                />
              </Field>
              <Field id="vacancy-salaryMax" label="Salario máximo (€ brutos/año)" required error={liveErrors.salaryMax}>
                <input
                  {...a11y('vacancy-salaryMax', liveErrors.salaryMax)}
                  type="text"
                  inputMode="numeric"
                  value={draft.salaryMax}
                  onChange={e => set('salaryMax', e.target.value)}
                  placeholder="Ej. 21000"
                  className="input-technical nums"
                />
              </Field>
            </div>
            <label className="mt-5 flex items-start gap-3 text-body text-fg cursor-pointer">
              <input
                type="checkbox"
                checked={draft.openToNewcomers}
                onChange={e => set('openToNewcomers', e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-[var(--color-accent)]"
              />
              <span>
                <span className="font-semibold">Abierta a perfiles que empiezan o cambian de sector</span>
                <span className="block text-fg-3 text-meta mt-0.5">Valoráis la experiencia en otros sectores y no exigís experiencia previa en el puesto.</span>
              </span>
            </label>
          </FormSection>

          {/* 3 · REQUISITOS */}
          <FormSection
            id="requisitos"
            number={3}
            title="Requisitos"
            required
            description={
              <>
                Los <strong className="text-fg">conocimientos</strong> se comparan con el perfil de cada persona y, si le faltan, le recomendamos cursos.
                Las <strong className="text-fg">condiciones</strong> (turnos, carné, desplazamientos) las confirma la persona y no restan.
              </>
            }
          >
            {liveErrors.requirements && (
              <p id="vacancy-requirements" tabIndex={-1} className="text-meta text-danger mb-3">{liveErrors.requirements}</p>
            )}

            <ol className="space-y-3">
              {draft.requirements.map((req, index) => (
                <RequirementEditor
                  key={req.key}
                  index={index}
                  requirement={req}
                  error={liveErrors[`req-${req.key}`]}
                  onChange={patch => updateRequirement(req.key, patch)}
                  onRemove={() => removeRequirement(req.key)}
                />
              ))}
            </ol>

            <div className="flex flex-wrap gap-2 mt-4">
              <button type="button" onClick={() => addRequirement('knowledge')} className="btn btn-secondary">
                <Plus className="w-4 h-4" aria-hidden="true" />
                Añadir conocimiento
              </button>
              <button type="button" onClick={() => addRequirement('condition')} className="btn btn-secondary">
                <Plus className="w-4 h-4" aria-hidden="true" />
                Añadir condición
              </button>
            </div>
          </FormSection>

          {/* 4 · PLAZOS */}
          <FormSection id="plazos" number={4} title="Plazos" description="El compromiso de respuesta se ve en la oferta y se mide en Impacto.">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field id="vacancy-closesAt" label="Fecha de cierre" required error={liveErrors.closesAt}>
                <input
                  {...a11y('vacancy-closesAt', liveErrors.closesAt)}
                  type="date"
                  min={isNew ? today() : undefined}
                  value={draft.closesAt}
                  onChange={e => set('closesAt', e.target.value)}
                  className="input-technical nums"
                />
              </Field>
              <Field
                id="vacancy-responseDays"
                label="Respondemos en (días)"
                required
                error={liveErrors.responseDays}
                hint="Compromiso visible en la oferta."
              >
                <input
                  {...a11y('vacancy-responseDays', liveErrors.responseDays, 'Compromiso visible en la oferta.')}
                  type="number"
                  min={1}
                  max={60}
                  value={draft.responseDays}
                  onChange={e => set('responseDays', e.target.value)}
                  className="input-technical nums"
                />
              </Field>
            </div>
          </FormSection>

          {saveError && (
            <div role="alert" className="alert alert-danger">
              <AlertTriangle aria-hidden="true" />
              <p>{saveError}</p>
            </div>
          )}

          {/* BARRA DE ACCIONES FIJA ABAJO */}
          <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur-sm md:-mx-10 md:px-10 xl:mx-0 xl:px-0">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPreviewOpen(true)} className="btn btn-secondary px-3 sm:px-4.5" aria-label="Vista previa de la oferta">
                <Eye className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Vista previa</span>
              </button>
              {submitted && errorList.length > 0 && (
                <button type="button" onClick={() => focusField(errorList[0][0])} className="btn btn-ghost hidden md:inline-flex text-danger">
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                  <span className="nums">{errorList.length}</span> por revisar
                </button>
              )}
              <span className="flex-1" />
              {onCancel && (
                <button type="button" onClick={onCancel} className="btn btn-ghost">
                  Cancelar
                </button>
              )}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {isNew ? <Send className="w-4 h-4" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
                {saving ? 'Guardando…' : isNew ? 'Publicar' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {previewOpen && <VacancyPreview offer={previewOffer} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}

interface FormSectionProps {
  id: SectionId;
  number: number;
  title: string;
  description?: ReactNode;
  required?: boolean;
  children: ReactNode;
}

/** Sección numerada del formulario (con ancla para el índice). */
function FormSection({ id, number, title, description, required, children }: FormSectionProps) {
  const headingId = `vacancy-section-${id}-title`;
  return (
    <section
      id={`vacancy-section-${id}`}
      data-form-section={id}
      aria-labelledby={headingId}
      className="card p-4 sm:p-6 scroll-mt-20"
    >
      <div className="mb-5 flex items-start gap-3">
        <span className="nums mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-strong text-body font-semibold text-fg-2" aria-hidden="true">
          {number}
        </span>
        <div className="min-w-0">
          <h3 id={headingId} className="font-display font-bold text-lead text-fg">
            <span className="sr-only">{number}. </span>{title}{required && ' *'}
          </h3>
          {description && <p className="mt-0.5 text-body text-fg-2">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Sección visible en pantalla (para resaltarla en el índice). */
function useActiveSection(): SectionId {
  const [active, setActive] = useState<SectionId>('puesto');
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-form-section]'));
    if (nodes.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.getAttribute('data-form-section') as SectionId);
      },
      // Cuenta como "actual" la sección que cruza el tercio superior de la pantalla.
      { rootMargin: '-15% 0px -60% 0px' }
    );
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, []);
  return active;
}

interface RequirementEditorProps {
  index: number;
  requirement: RequirementDraft;
  error?: string;
  onChange: (patch: Partial<RequirementDraft>) => void;
  onRemove: () => void;
}

/**
 * Un requisito: texto, tipo, imprescindible/deseable, "lo enseñamos" y habilidades de catálogo.
 * El número y la papelera van en una fila arriba para que el contenido use todo el ancho en móvil.
 */
function RequirementEditor({ index, requirement: req, error, onChange, onRemove }: RequirementEditorProps) {
  const baseId = `vacancy-req-${req.key}`;
  const labelId = `${baseId}-label`;
  const [pendingSkill, setPendingSkill] = useState<string>('');

  // Sugerencias a partir del texto: equivalencias del plan o habilidades que aparecen en el texto.
  const suggestions = useMemo(() => {
    if (req.kind !== 'knowledge' || !req.label.trim()) return [];
    const text = req.label.toLowerCase();
    const fromPlan = REQUIREMENT_SKILLS[req.label.trim()] ?? [];
    const mentioned = SKILL_VOCABULARY.filter(skill => skill.length > 2 && text.includes(skill.toLowerCase()));
    return [...new Set([...fromPlan, ...mentioned])].filter(skill => !req.skills.includes(skill)).slice(0, 6);
  }, [req.kind, req.label, req.skills]);

  const addSkill = (skill: string) => {
    if (skill && !req.skills.includes(skill)) onChange({ skills: [...req.skills, skill] });
    setPendingSkill('');
  };

  return (
    <li className="rounded border border-line-strong bg-raised/40 p-3 sm:p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="nums badge-technical shrink-0" aria-hidden="true">{index + 1}</span>
        <label htmlFor={labelId} className="label-tech mb-0 flex-1 min-w-0">
          {req.kind === 'knowledge' ? 'Conocimiento' : 'Condición'} <span className="sr-only">{index + 1}</span>
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="btn btn-ghost btn-icon shrink-0 -my-1 -mr-1"
          aria-label={`Eliminar requisito ${index + 1}${req.label ? `: ${req.label}` : ''}`}
          title="Eliminar requisito"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-3 min-w-0">
        <div className="min-w-0">
          <input
            id={labelId}
            type="text"
            value={req.label}
            onChange={e => onChange({ label: e.target.value })}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${labelId}-error` : undefined}
            placeholder={req.kind === 'knowledge' ? 'Ej. Excel a nivel usuario' : 'Ej. Turnos rotativos de mañana y tarde'}
            className="input-technical"
          />
          {error && <p id={`${labelId}-error`} className="text-meta text-danger mt-1.5">{error}</p>}
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label={`Opciones del requisito ${index + 1}`}>
          <button
            type="button"
            aria-pressed={req.kind === 'knowledge'}
            onClick={() => onChange({ kind: 'knowledge' })}
            className="chip"
          >
            Conocimiento
          </button>
          <button
            type="button"
            aria-pressed={req.kind === 'condition'}
            onClick={() => onChange({ kind: 'condition', skills: [] })}
            className="chip"
          >
            Condición
          </button>
          <span className="w-px bg-line mx-1 hidden sm:block" aria-hidden="true" />
          <button type="button" aria-pressed={req.essential} onClick={() => onChange({ essential: true })} className="chip">
            Imprescindible
          </button>
          <button type="button" aria-pressed={!req.essential} onClick={() => onChange({ essential: false })} className="chip">
            Deseable
          </button>
          <span className="w-px bg-line mx-1 hidden sm:block" aria-hidden="true" />
          <button type="button" aria-pressed={req.trainable} onClick={() => onChange({ trainable: !req.trainable })} className="chip">
            {req.trainable ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Plus className="w-3.5 h-3.5 text-fg-3" aria-hidden="true" />}
            Lo enseñamos en la empresa
          </button>
        </div>

        {req.kind === 'knowledge' && (
          <div className="min-w-0">
            <p className="text-meta text-fg-2 mb-2" id={`${baseId}-skills-help`}>
              Habilidades del catálogo de cursos que cubren este conocimiento (sirven para comparar perfiles y recomendar formación).
            </p>
            {req.skills.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 mb-2" aria-label="Habilidades elegidas">
                {req.skills.map(skill => (
                  <li key={skill}>
                    <button
                      type="button"
                      onClick={() => onChange({ skills: req.skills.filter(s => s !== skill) })}
                      className="chip"
                      aria-pressed="true"
                      aria-label={`Quitar ${skill}`}
                    >
                      {skill}
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {suggestions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className="text-meta text-fg-3">Sugerencias:</span>
                {suggestions.map(skill => (
                  <button key={skill} type="button" onClick={() => addSkill(skill)} className="chip">
                    <Plus className="w-3.5 h-3.5 text-fg-3" aria-hidden="true" />
                    {skill}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2 min-w-0">
              <label htmlFor={`${baseId}-skill`} className="sr-only">Añadir habilidad del catálogo al requisito {index + 1}</label>
              <select
                id={`${baseId}-skill`}
                value={pendingSkill}
                onChange={e => setPendingSkill(e.target.value)}
                aria-describedby={`${baseId}-skills-help`}
                className="input-technical min-w-0 flex-1"
              >
                <option value="">Elige una habilidad…</option>
                {SKILL_VOCABULARY.filter(skill => !req.skills.includes(skill)).map(skill => (
                  <option key={skill} value={skill}>{skill}</option>
                ))}
              </select>
              <button type="button" onClick={() => addSkill(pendingSkill)} disabled={!pendingSkill} className="btn btn-secondary shrink-0 px-3 sm:px-4.5">
                <Plus className="w-4 h-4" aria-hidden="true" />
                Añadir
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
