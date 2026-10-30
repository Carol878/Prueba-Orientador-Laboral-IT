/**
 * @file ApplicantsBoard.tsx
 * @description Candidaturas de una vacante: tabla en escritorio ancho (≥ 1280 px) y lista en el resto.
 *
 * El perfil es anónimo hasta que la empresa abre el contacto: primero el encaje (medidor siempre visible),
 * luego la experiencia laboral, lo que tiene, lo que está aprendiendo y lo que le falta.
 * Por defecto se ordena por fecha de interés; ordenar por encaje es opcional y orientativo.
 * Descartar exige elegir un motivo de `DECLINE_REASONS`, que la persona recibe con ofertas parecidas.
 *
 * Tras cada cambio de estado aparece un aviso con "Deshacer" durante 5 segundos. Deshacer vuelve al
 * estado anterior con `offersService.updateApplication`, algo que solo admite el servicio local: la API
 * (`backend/app/services/application_service.py`, `_validate_transition`) solo deja avanzar o descartar,
 * así que con la API el aviso se muestra sin "Deshacer".
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  CalendarClock,
  Check,
  Copy,
  Download,
  ExternalLink,
  HandHeart,
  Info,
  Mail,
  MessageSquareText,
  UserCheck,
  UserRoundCheck,
  X
} from 'lucide-react';

import type { Application, ApplicationStatus, JobOffer } from '../../types';
import type { RequirementCheck } from '../../lib/offerMatch';
import { DECLINE_REASONS } from '../../data/jobOffers';
import { localOffersService, offersService } from '../../services/offersService';
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_TONE,
  EXPERIENCE_MONTHS_LABELS,
  OFFER_STATUS_LABELS,
  anonymousRef,
  countByStatus,
  formatDate,
  isContactOpen,
  isOverdue,
  summarizeFit
} from './companyUtils';
import type { CandidateFitSummary } from './companyUtils';
import { applicationsToCsv, csvFilename, downloadCsv } from './csv';
import FunnelBar from './FunnelBar';
import PrivacyNote from './PrivacyNote';
import Toast from './Toast';
import type { ToastMessage } from './Toast';

type SortMode = 'date' | 'fit';
type StatusFilter = 'all' | ApplicationStatus;

/** La API no admite volver a un estado anterior: "Deshacer" solo existe con el servicio local. */
const CAN_UNDO = offersService === localOffersService;

interface Row {
  app: Application;
  summary: CandidateFitSummary;
  /** Nueva en esta visita (la empresa aún no la había visto al abrir la vacante). */
  isNew: boolean;
}

interface ApplicantsBoardProps {
  offer: JobOffer;
  applications: Application[];
  onBack: () => void;
}

/** Texto del aviso tras cada cambio de estado. */
function toastText(app: Application, status: ApplicationStatus): string {
  // Con el contacto ya abierto se nombra a la persona; si no, se usa la referencia anónima.
  const ref = isContactOpen(app) ? app.candidate.name : `Candidatura ${anonymousRef(app)}`;
  switch (status) {
    case 'contact_open': return `Contacto abierto con ${app.candidate.name}. Ya ves su email.`;
    case 'interview': return `${ref}: pasa a entrevista.`;
    case 'hired': return `${ref}: marcada como contratada.`;
    case 'declined': return `${ref} descartada. La persona recibirá el motivo.`;
    default: return `${ref}: ${APPLICATION_STATUS_LABELS[status].toLowerCase()}.`;
  }
}

export default function ApplicantsBoard({ offer, applications, onBack }: ApplicantsBoardProps) {
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [declining, setDeclining] = useState<Application | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string>('');
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastSeq = useRef<number>(0);
  // Candidaturas que eran nuevas al abrir la vacante: se siguen marcando como "Nueva" durante la visita.
  const [newIds, setNewIds] = useState<Set<string>>(() => new Set());

  const showToast = useCallback((message: string, onUndo?: () => void) => {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, message, onUndo });
  }, []);
  const closeToast = useCallback(() => setToast(null), []);

  // Marca como vistas las candidaturas nuevas (y recuerda cuáles eran para esta visita).
  useEffect(() => {
    const unseen = applications.filter(a => a.unseenByCompany);
    if (unseen.length === 0) return;
    setNewIds(prev => new Set([...prev, ...unseen.map(a => a.id)]));
    unseen.forEach(a => {
      offersService.markSeen(a.id, 'company').catch(error => console.error('[empresas] No se ha podido marcar como vista:', error));
    });
  }, [applications]);

  const rows: Row[] = useMemo(() => {
    const list = applications
      .filter(app => statusFilter === 'all' || app.status === statusFilter)
      .map(app => ({ app, summary: summarizeFit(offer, app.candidate), isNew: newIds.has(app.id) || app.unseenByCompany }));
    return list.sort((a, b) =>
      sortMode === 'fit'
        ? b.summary.fit.score - a.summary.fit.score || a.app.createdAt.localeCompare(b.app.createdAt)
        : a.app.createdAt.localeCompare(b.app.createdAt)
    );
  }, [applications, offer, sortMode, statusFilter, newIds]);

  const counts = useMemo(() => countByStatus(applications), [applications]);
  const overdueCount = useMemo(() => applications.filter(a => isOverdue(a, offer)).length, [applications, offer]);

  /** Vuelve al estado que tenía la candidatura antes del último cambio. */
  const undo = async (app: Application) => {
    closeToast();
    setBusyId(app.id);
    try {
      await offersService.updateApplication(app.id, { status: app.status, declineReason: app.declineReason });
      showToast(`Cambio deshecho: vuelve a "${APPLICATION_STATUS_LABELS[app.status]}".`);
    } catch (error) {
      console.error('[empresas] No se ha podido deshacer el cambio:', error);
      setActionError('No se ha podido deshacer el cambio. Revisa el estado de la candidatura.');
    } finally {
      setBusyId(null);
    }
  };

  const changeStatus = async (app: Application, status: ApplicationStatus, declineReason?: string) => {
    setBusyId(app.id);
    setActionError('');
    try {
      await offersService.updateApplication(app.id, { status, declineReason });
      // `app` es la foto de antes del cambio: es lo que restaura "Deshacer".
      showToast(toastText(app, status), CAN_UNDO ? () => { undo(app); } : undefined);
    } catch (error) {
      console.error('[empresas] No se ha podido actualizar la candidatura:', error);
      setActionError('No se ha podido guardar el cambio. Inténtalo de nuevo.');
    } finally {
      setBusyId(null);
    }
  };

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      showToast(`Email copiado: ${email}`);
    } catch (error) {
      console.error('[empresas] No se ha podido copiar el email:', error);
      showToast('No se ha podido copiar. Selecciona el email y cópialo a mano.');
    }
  };

  const exportCsv = () => {
    downloadCsv(csvFilename(offer), applicationsToCsv(offer, rows.map(r => r.app)));
    showToast(`Exportadas ${rows.length} candidaturas a CSV.`);
  };

  const rowProps = (row: Row) => ({
    row,
    offer,
    busy: busyId === row.app.id,
    onChange: changeStatus,
    onDecline: () => setDeclining(row.app),
    onCopy: copyEmail
  });

  return (
    <div>
      <button type="button" onClick={onBack} className="btn btn-ghost -ml-3 mb-4">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Volver a mis vacantes
      </button>

      <div className="mb-6 pb-5 border-b border-line flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow mb-2">Candidaturas · {OFFER_STATUS_LABELS[offer.status]}</p>
          <h2 className="font-display font-bold text-title md:text-heading tracking-[-0.015em] text-fg">{offer.title}</h2>
          <p className="text-body text-fg-2 mt-2">
            <span className="nums">{applications.length}</span> {applications.length === 1 ? 'persona interesada' : 'personas interesadas'} ·
            {' '}te comprometiste a responder en <span className="nums">{offer.responseDays}</span> {offer.responseDays === 1 ? 'día' : 'días'}
            {overdueCount > 0 && (
              <span className="font-semibold text-danger"> · <span className="nums">{overdueCount}</span> fuera de plazo</span>
            )}
          </p>
        </div>
        <button type="button" onClick={exportCsv} disabled={rows.length === 0} className="btn btn-secondary shrink-0">
          <Download className="w-4 h-4" aria-hidden="true" />
          <span>Exportar CSV (<span className="nums">{rows.length}</span>)</span>
        </button>
      </div>

      {applications.length > 0 && <FunnelBar applications={applications} className="mb-5" />}

      <div className="alert alert-info mb-5">
        <Info aria-hidden="true" />
        <p>
          <strong>La decisión siempre la toma una persona. El encaje es orientativo.</strong>
          {' '}Los perfiles son anónimos hasta que abres el contacto.
        </p>
      </div>

      {/* CONTROLES: ORDEN Y FILTRO */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-4">
        <fieldset>
          <legend className="label-tech">Ordenar por</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="chip" aria-pressed={sortMode === 'date'} onClick={() => setSortMode('date')}>
              Fecha de interés
            </button>
            <button type="button" className="chip" aria-pressed={sortMode === 'fit'} onClick={() => setSortMode('fit')}>
              Encaje (orientativo)
            </button>
          </div>
        </fieldset>
        <div className="sm:ml-auto sm:w-64">
          <label htmlFor="applicants-filter" className="label-tech">Mostrar</label>
          <select
            id="applicants-filter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="input-technical"
          >
            <option value="all">Todas ({applications.length})</option>
            {(Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatus[]).map(s => (
              <option key={s} value={s}>{APPLICATION_STATUS_LABELS[s]} ({counts[s]})</option>
            ))}
          </select>
        </div>
      </div>

      {actionError && (
        <div role="alert" className="alert alert-danger mb-4">
          <AlertTriangle aria-hidden="true" />
          <p>{actionError}</p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-body text-fg-2">
          {applications.length === 0
            ? 'Todavía no hay personas interesadas en esta vacante. Cuando alguien pulse "Me interesa", aparecerá aquí.'
            : 'No hay candidaturas con este estado.'}
        </div>
      ) : (
        <>
          {/* ESCRITORIO ANCHO: TABLA */}
          <div className="hidden xl:block card overflow-x-auto">
            <table className="w-full table-fixed text-body text-left">
              <caption className="sr-only">
                Candidaturas a {offer.title}, ordenadas por {sortMode === 'date' ? 'fecha de interés' : 'encaje orientativo'}
              </caption>
              <colgroup>
                <col className="w-[15rem]" />
                <col />
                <col />
                <col className="w-[16.75rem]" />
              </colgroup>
              <thead className="border-b border-line-strong text-meta text-fg-2">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Candidatura</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Experiencia</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Encaje y requisitos</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line align-top">
                {rows.map(row => {
                  const props = rowProps(row);
                  return (
                    <tr key={row.app.id}>
                      <td className="px-4 py-4"><Identity {...props} /></td>
                      <td className="px-4 py-4">
                        <Experience app={row.app} />
                        <Extras app={row.app} className="mt-3 pt-3 border-t border-line" />
                      </td>
                      <td className="px-4 py-4">
                        <FitMeter summary={row.summary} />
                        <FitDetails summary={row.summary} className="mt-3" />
                      </td>
                      <td className="px-4 py-4"><Actions {...props} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MÓVIL, TABLET Y PORTÁTIL ESTRECHO: LISTA */}
          <ul className="xl:hidden space-y-3" aria-label={`Candidaturas a ${offer.title}`}>
            {rows.map(row => {
              const props = rowProps(row);
              return (
                <li key={row.app.id} className="card p-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
                    <Identity {...props} />
                    <FitMeter summary={row.summary} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Section title="Experiencia laboral"><Experience app={row.app} /></Section>
                    <Section title="Requisitos"><FitDetails summary={row.summary} /></Section>
                  </div>
                  <Section title="Más información"><Extras app={row.app} /></Section>
                  <div className="pt-3 border-t border-line"><Actions {...props} /></div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <PrivacyNote className="mt-6" />

      <Toast toast={toast} onClose={closeToast} />

      {declining && (
        <DeclineDialog
          app={declining}
          onCancel={() => setDeclining(null)}
          onConfirm={async reason => {
            const app = declining;
            setDeclining(null);
            await changeStatus(app, 'declined', reason);
          }}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-meta font-semibold text-fg-3 mb-1.5">{title}</p>
      {children}
    </div>
  );
}

interface RowProps {
  row: Row;
  offer: JobOffer;
  busy: boolean;
  onChange: (app: Application, status: ApplicationStatus) => void;
  onDecline: () => void;
  onCopy: (email: string) => void;
}

/** Referencia, fecha, estado y, con el contacto abierto, nombre y email (con botón de copiar). */
function Identity({ row, offer, onCopy }: RowProps) {
  const { app, isNew } = row;
  const open = isContactOpen(app);
  const overdue = isOverdue(app, offer);
  return (
    <div className="space-y-1.5 min-w-0">
      <p className="font-semibold text-fg flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="break-words min-w-0">{open ? app.candidate.name : `Candidatura ${anonymousRef(app)}`}</span>
        {isNew && (
          <span className="inline-flex items-center gap-1 text-meta font-semibold text-fg-2">
            <span className="h-1.5 w-1.5 rounded-full bg-fg" aria-hidden="true" />
            Nueva
          </span>
        )}
      </p>
      {open && (
        <div className="flex flex-wrap items-center gap-x-1">
          <a
            href={`mailto:${app.candidate.email}?subject=${encodeURIComponent(`${offer.title} · ${offer.companyName}`)}`}
            className="min-w-0 max-w-full py-1 text-meta text-stage-contact underline underline-offset-2 break-words"
          >
            <Mail className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
            {app.candidate.email}
          </a>
          <button
            type="button"
            onClick={() => onCopy(app.candidate.email)}
            className="btn btn-ghost btn-icon -my-2 shrink-0"
            aria-label={`Copiar el email de ${app.candidate.name}`}
            title="Copiar email"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
      <p className="text-meta text-fg-3 flex items-center gap-1">
        <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
        Interés: <span className="nums">{formatDate(app.createdAt)}</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        <span className={`badge-technical ${APPLICATION_STATUS_TONE[app.status]}`}>{APPLICATION_STATUS_LABELS[app.status]}</span>
        {overdue && <span className="badge-technical border-danger/50 text-danger bg-danger-soft">Fuera de plazo</span>}
      </div>
      {app.status === 'declined' && app.declineReason && (
        <p className="text-meta text-fg-3">Motivo: {app.declineReason}</p>
      )}
    </div>
  );
}

/** Medidor de encaje: un segmento por conocimiento imprescindible (lo tiene / aprendiendo / le falta). */
function FitMeter({ summary }: { summary: CandidateFitSummary }) {
  const { fit } = summary;
  const essentials = fit.checks.filter((c: RequirementCheck) => c.requirement.essential && c.requirement.kind === 'knowledge');
  if (essentials.length === 0) {
    return <p className="text-meta text-fg-3">Sin conocimientos imprescindibles</p>;
  }
  const missing = essentials.filter(c => c.state === 'missing').length;
  const description = `Cumple ${fit.essentialHave} de ${fit.essentialTotal} imprescindibles`
    + (fit.essentialLearning > 0 ? `, aprendiendo ${fit.essentialLearning}` : '')
    + (missing > 0 ? `, le faltan ${missing}` : '');
  return (
    <div className="min-w-0">
      <div className="meter" role="img" aria-label={description}>
        {essentials.map(check => (
          <span
            key={check.requirement.id}
            className="meter-seg"
            data-state={check.state === 'have' || check.state === 'learning' ? check.state : 'missing'}
            title={check.requirement.label}
          />
        ))}
      </div>
      <p className="mt-1.5 text-meta text-fg-2" aria-hidden="true">
        Cumple <span className="nums font-semibold text-fg">{fit.essentialHave}</span> de <span className="nums">{fit.essentialTotal}</span>
        {fit.essentialLearning > 0 && <span className="text-fg-3"> · aprendiendo <span className="nums">{fit.essentialLearning}</span></span>}
      </p>
    </div>
  );
}

function Experience({ app }: { app: Application }) {
  const c = app.candidate;
  const jobs = c.workExperience ?? [];
  return (
    <div className="space-y-2 min-w-0">
      {jobs.length === 0 ? (
        <p className="text-fg-3 text-meta">Sin experiencia laboral indicada.</p>
      ) : (
        <ul className="space-y-2">
          {jobs.map((job, index) => (
            <li key={index} className="text-body">
              <p className="text-fg font-medium flex items-start gap-1.5">
                <Briefcase className="w-3.5 h-3.5 mt-1 shrink-0 text-fg-3" aria-hidden="true" />
                <span className="min-w-0">
                  {job.role || 'Puesto sin indicar'}
                  {job.sector && <span className="text-fg-2 font-normal"> · {job.sector}</span>}
                  <span className="text-fg-2 font-normal"> · {job.years > 0 ? `${job.years} ${job.years === 1 ? 'año' : 'años'}` : 'menos de 1 año'}</span>
                </span>
              </p>
              {job.tasks && <p className="text-meta text-fg-2 mt-0.5 pl-5">{job.tasks}</p>}
            </li>
          ))}
        </ul>
      )}
      {c.experienceMonths && (
        <p className="text-meta text-fg-3">{EXPERIENCE_MONTHS_LABELS[c.experienceMonths] ?? c.experienceMonths}</p>
      )}
    </div>
  );
}

type DotState = 'have' | 'learning' | 'missing' | 'neutral';

function RequirementGroup({ label, items, state }: { label: string; items: string[]; state: DotState }) {
  if (items.length === 0) return null;
  return (
    <li className="flex items-start gap-2">
      <span className="dot mt-[0.4rem]" data-state={state === 'neutral' ? undefined : state} aria-hidden="true" />
      <p className="min-w-0 text-meta text-fg">
        <span className="font-semibold text-fg-2">{label}:</span> {items.join(', ')}
      </p>
    </li>
  );
}

/** Lo que tiene / está aprendiendo / le falta, según `evaluateOffer`. */
function FitDetails({ summary, className = '' }: { summary: CandidateFitSummary; className?: string }) {
  const empty = [summary.have, summary.learning, summary.missingTrainable, summary.missing, summary.conditions].every(l => l.length === 0);
  if (empty) return <p className={`text-meta text-fg-3 ${className}`}>La vacante no tiene requisitos.</p>;
  return (
    <ul className={`space-y-1 min-w-0 ${className}`}>
      <RequirementGroup label="Lo tiene" items={summary.have} state="have" />
      <RequirementGroup label="Aprendiendo" items={summary.learning} state="learning" />
      <RequirementGroup label="Por aprender" items={summary.missing} state="missing" />
      <RequirementGroup label="Lo enseñáis vosotros" items={summary.missingTrainable} state="neutral" />
      <RequirementGroup label="Condiciones (a confirmar)" items={summary.conditions} state="neutral" />
    </ul>
  );
}

function Extras({ app, className = '' }: { app: Application; className?: string }) {
  const c = app.candidate;
  const portfolio = c.portfolioUrl?.trim();
  const safeUrl = portfolio && /^https?:\/\//i.test(portfolio) ? portfolio : portfolio ? `https://${portfolio}` : '';
  return (
    <div className={`space-y-1 text-meta text-fg-2 ${className}`}>
      {c.mainProject && <p><span className="text-fg-3">Proyecto:</span> {c.mainProject}</p>}
      {/* Datos cortos en una sola línea para no alargar la fila. */}
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        {safeUrl ? (
          <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="text-accent-strong underline underline-offset-2 inline-flex items-center gap-1">
            Portfolio
            <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span className="sr-only">(se abre en otra pestaña)</span>
          </a>
        ) : (
          <span className="text-fg-3">Sin portfolio</span>
        )}
        <span aria-hidden="true" className="text-fg-3">·</span>
        <span>Inglés {c.englishLevel || 'sin indicar'}</span>
        <span aria-hidden="true" className="text-fg-3">·</span>
        <span className="inline-flex items-center gap-1">
          <MessageSquareText className="w-3.5 h-3.5 shrink-0 text-fg-3" aria-hidden="true" />
          {c.practicedInterview ? 'Entrevista practicada' : 'Sin practicar entrevista'}
        </span>
      </p>
      {app.wantsFadSupport && (
        <p className="flex items-center gap-1 text-ok">
          <HandHeart className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          Pide acompañamiento de Fad
        </p>
      )}
    </div>
  );
}

/** Siguiente paso del proceso según el estado actual, en horizontal y con ancho estable entre filas. */
function Actions({ row, busy, onChange, onDecline }: RowProps) {
  const { app } = row;
  const ref = anonymousRef(app);
  if (app.status === 'hired' || app.status === 'declined') {
    return (
      <p className="flex items-center gap-1.5 text-meta text-fg-3">
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        Proceso cerrado
      </p>
    );
  }
  const next: { status: ApplicationStatus; label: string; icon: typeof Mail } =
    app.status === 'pending'
      ? { status: 'contact_open', label: 'Abrir contacto', icon: Mail }
      : app.status === 'contact_open'
        ? { status: 'interview', label: 'Pasar a entrevista', icon: UserCheck }
        : { status: 'hired', label: 'Marcar contratada', icon: UserRoundCheck };
  const Icon = next.icon;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => onChange(app, next.status)}
        className="btn btn-primary flex-1 xl:flex-none xl:w-[11.5rem] px-3"
        aria-label={`${next.label} · candidatura ${ref}`}
      >
        <Icon className="w-4 h-4" aria-hidden="true" />
        {next.label}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onDecline}
        className="btn btn-secondary btn-icon shrink-0"
        aria-label={`Descartar · candidatura ${ref}`}
        title="Descartar"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

interface DeclineDialogProps {
  app: Application;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

/** Diálogo modal nativo (`<dialog>`): atrapa el foco, se cierra con Escape y lo devuelve al cerrar. */
function DeclineDialog({ app, onCancel, onConfirm }: DeclineDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      opener?.focus();
    };
  }, []);

  const confirm = () => {
    if (!reason) {
      setError('Elige un motivo: la persona lo recibirá junto con otras ofertas parecidas.');
      return;
    }
    onConfirm(reason);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="decline-title"
      aria-describedby="decline-description"
      onCancel={e => { e.preventDefault(); onCancel(); }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] p-0 bg-surface text-fg border border-line-strong rounded-dialog"
    >
      <form
        method="dialog"
        onSubmit={e => { e.preventDefault(); confirm(); }}
        className="p-6"
      >
        <h3 id="decline-title" className="font-display font-bold text-title text-fg mb-2">
          Descartar la candidatura {anonymousRef(app)}
        </h3>
        <p id="decline-description" className="text-body text-fg-2 mb-4">
          La persona recibirá el motivo que elijas, lo que le faltaba y tres ofertas parecidas. Nunca se descarta a nadie de forma automática.
        </p>
        <fieldset aria-describedby={error ? 'decline-error' : undefined}>
          <legend className="label-tech">Motivo *</legend>
          <div className="space-y-2">
            {DECLINE_REASONS.map(option => (
              <label
                key={option}
                className={`option flex items-start gap-3 cursor-pointer text-body ${reason === option ? 'border-accent text-accent-strong bg-accent-soft' : ''}`}
              >
                <input
                  type="radio"
                  name="decline-reason"
                  value={option}
                  checked={reason === option}
                  onChange={() => { setReason(option); setError(''); }}
                  className="mt-0.5 accent-[var(--color-accent)]"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p id="decline-error" role="alert" className="text-meta text-danger mt-3">{error}</p>}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6">
          <button type="button" onClick={onCancel} className="btn btn-secondary">Cancelar</button>
          <button type="submit" className="btn btn-danger">Descartar con este motivo</button>
        </div>
      </form>
    </dialog>
  );
}
