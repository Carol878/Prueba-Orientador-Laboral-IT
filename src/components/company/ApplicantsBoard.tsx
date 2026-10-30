/**
 * @file ApplicantsBoard.tsx
 * @description Candidaturas de una vacante: tabla en escritorio y lista en móvil.
 *
 * El perfil es anónimo hasta que la empresa abre el contacto: primero la experiencia laboral, luego
 * lo que tiene, lo que está aprendiendo y lo que le falta, y después portfolio, inglés, etc.
 * Por defecto se ordena por fecha de interés; ordenar por encaje es opcional y orientativo.
 * Descartar exige elegir un motivo de `DECLINE_REASONS`, que la persona recibe con ofertas parecidas.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowLeft,
  Briefcase,
  CalendarClock,
  Download,
  ExternalLink,
  HandHeart,
  Mail,
  MessageSquareText,
  UserCheck,
  UserRoundCheck,
  X
} from 'lucide-react';

import type { Application, ApplicationStatus, JobOffer } from '../../types';
import { DECLINE_REASONS } from '../../data/jobOffers';
import { offersService } from '../../services/offersService';
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_TONE,
  EXPERIENCE_MONTHS_LABELS,
  OFFER_STATUS_LABELS,
  anonymousRef,
  companyFitLabel,
  formatDate,
  isContactOpen,
  isOverdue,
  summarizeFit
} from './companyUtils';
import type { CandidateFitSummary } from './companyUtils';
import { applicationsToCsv, csvFilename, downloadCsv } from './csv';
import PrivacyNote from './PrivacyNote';

type SortMode = 'date' | 'fit';
type StatusFilter = 'all' | ApplicationStatus;

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

export default function ApplicantsBoard({ offer, applications, onBack }: ApplicantsBoardProps) {
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [declining, setDeclining] = useState<Application | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string>('');
  const [announcement, setAnnouncement] = useState<string>('');
  // Candidaturas que eran nuevas al abrir la vacante: se siguen marcando como "Nueva" durante la visita.
  const [newIds, setNewIds] = useState<Set<string>>(() => new Set());

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

  const counts = useMemo(() => {
    const byStatus = {} as Record<ApplicationStatus, number>;
    (Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatus[]).forEach(s => { byStatus[s] = 0; });
    applications.forEach(a => { byStatus[a.status] += 1; });
    return byStatus;
  }, [applications]);

  const changeStatus = async (app: Application, status: ApplicationStatus, declineReason?: string) => {
    setBusyId(app.id);
    setActionError('');
    try {
      await offersService.updateApplication(app.id, { status, declineReason });
      setAnnouncement(`Candidatura ${anonymousRef(app)}: ${APPLICATION_STATUS_LABELS[status].toLowerCase()}.`);
    } catch (error) {
      console.error('[empresas] No se ha podido actualizar la candidatura:', error);
      setActionError('No se ha podido guardar el cambio. Inténtalo de nuevo.');
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    downloadCsv(csvFilename(offer), applicationsToCsv(offer, rows.map(r => r.app)));
    setAnnouncement(`Exportadas ${rows.length} candidaturas a CSV.`);
  };

  return (
    <div>
      <button type="button" onClick={onBack} className="btn btn-secondary mb-6">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Volver a mis vacantes
      </button>

      <div className="mb-6 pb-5 border-b border-line flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow mb-2">Candidaturas · {OFFER_STATUS_LABELS[offer.status]}</p>
          <h2 className="font-display font-bold text-2xl md:text-[28px] leading-tight tracking-[-0.015em] text-fg">{offer.title}</h2>
          <p className="text-sm text-fg-2 mt-2">
            {applications.length} {applications.length === 1 ? 'persona interesada' : 'personas interesadas'} ·
            {' '}te comprometiste a responder en {offer.responseDays} {offer.responseDays === 1 ? 'día' : 'días'}
          </p>
        </div>
        <button type="button" onClick={exportCsv} disabled={rows.length === 0} className="btn btn-secondary shrink-0">
          <Download className="w-4 h-4" aria-hidden="true" />
          Exportar CSV ({rows.length})
        </button>
      </div>

      <p className="mb-4 px-3 py-2 border border-accent/40 border-l-2 border-l-accent bg-accent-soft rounded text-sm text-fg">
        <strong>La decisión siempre la toma una persona. El encaje es orientativo.</strong>
        {' '}Los perfiles son anónimos hasta que abres el contacto.
      </p>

      {/* CONTROLES: ORDEN Y FILTRO */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-4">
        <fieldset>
          <legend className="label-tech">Ordenar por</legend>
          <div className="flex gap-2">
            <button type="button" className="chip" aria-pressed={sortMode === 'date'} onClick={() => setSortMode('date')}>
              Fecha de interés
            </button>
            <button type="button" className="chip" aria-pressed={sortMode === 'fit'} onClick={() => setSortMode('fit')}>
              Encaje (orientativo)
            </button>
          </div>
        </fieldset>
        <div className="sm:ml-auto">
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

      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      {actionError && (
        <p role="alert" className="mb-4 p-3 border border-danger/30 border-l-2 border-l-danger bg-danger-soft rounded text-danger text-sm">
          {actionError}
        </p>
      )}

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-sm text-fg-2">
          {applications.length === 0
            ? 'Todavía no hay personas interesadas en esta vacante. Cuando alguien pulse "Me interesa", aparecerá aquí.'
            : 'No hay candidaturas con este estado.'}
        </div>
      ) : (
        <>
          {/* ESCRITORIO: TABLA */}
          <div className="hidden lg:block card overflow-x-auto">
            <table className="w-full text-sm text-left">
              <caption className="sr-only">
                Candidaturas a {offer.title}, ordenadas por {sortMode === 'date' ? 'fecha de interés' : 'encaje orientativo'}
              </caption>
              <thead className="border-b border-line-strong text-fg-2">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold w-[16%]">Candidatura</th>
                  <th scope="col" className="px-4 py-3 font-semibold w-[22%]">Experiencia laboral</th>
                  <th scope="col" className="px-4 py-3 font-semibold w-[28%]">Requisitos</th>
                  <th scope="col" className="px-4 py-3 font-semibold w-[16%]">Más información</th>
                  <th scope="col" className="px-4 py-3 font-semibold w-[18%]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line align-top">
                {rows.map(row => (
                  <tr key={row.app.id}>
                    <td className="px-4 py-4"><Identity row={row} offer={offer} showFit={sortMode === 'fit'} /></td>
                    <td className="px-4 py-4"><Experience app={row.app} /></td>
                    <td className="px-4 py-4"><FitDetails summary={row.summary} /></td>
                    <td className="px-4 py-4"><Extras app={row.app} /></td>
                    <td className="px-4 py-4">
                      <Actions app={row.app} busy={busyId === row.app.id} onChange={changeStatus} onDecline={() => setDeclining(row.app)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MÓVIL Y TABLET: LISTA */}
          <ul className="lg:hidden space-y-3" aria-label={`Candidaturas a ${offer.title}`}>
            {rows.map(row => (
              <li key={row.app.id} className="card p-4 space-y-4">
                <Identity row={row} offer={offer} showFit={sortMode === 'fit'} />
                <Section title="Experiencia laboral"><Experience app={row.app} /></Section>
                <Section title="Requisitos"><FitDetails summary={row.summary} /></Section>
                <Section title="Más información"><Extras app={row.app} /></Section>
                <Actions app={row.app} busy={busyId === row.app.id} onChange={changeStatus} onDecline={() => setDeclining(row.app)} />
              </li>
            ))}
          </ul>
        </>
      )}

      <PrivacyNote className="mt-6" />

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
    <div>
      <p className="text-xs font-semibold text-fg-3 mb-1.5">{title}</p>
      {children}
    </div>
  );
}

/** Referencia, fecha, estado y, con el contacto abierto, nombre y email. */
function Identity({ row, offer, showFit }: { row: Row; offer: JobOffer; showFit: boolean }) {
  const { app, summary, isNew } = row;
  const open = isContactOpen(app);
  const overdue = isOverdue(app, offer);
  return (
    <div className="space-y-1.5 min-w-0">
      <p className="font-semibold text-fg flex flex-wrap items-center gap-2">
        {open ? app.candidate.name : `Candidatura ${anonymousRef(app)}`}
        {isNew && <span className="badge-technical border-accent text-accent-strong bg-accent-soft">Nueva</span>}
      </p>
      {open && (
        <a
          href={`mailto:${app.candidate.email}?subject=${encodeURIComponent(`${offer.title} · ${offer.companyName}`)}`}
          className="text-xs text-accent-strong underline underline-offset-2 break-all inline-flex items-center gap-1"
        >
          <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {app.candidate.email}
        </a>
      )}
      <p className="text-xs text-fg-3 flex items-center gap-1">
        <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
        Interés: {formatDate(app.createdAt)}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <span className={`badge-technical ${APPLICATION_STATUS_TONE[app.status]}`}>{APPLICATION_STATUS_LABELS[app.status]}</span>
        {overdue && <span className="badge-technical border-danger text-danger bg-danger-soft">Fuera de plazo</span>}
      </div>
      {showFit && <p className="text-xs text-fg-2">{companyFitLabel(summary.fit)}</p>}
      {app.status === 'declined' && app.declineReason && (
        <p className="text-xs text-fg-3">Motivo: {app.declineReason}</p>
      )}
    </div>
  );
}

function Experience({ app }: { app: Application }) {
  const c = app.candidate;
  const jobs = c.workExperience ?? [];
  return (
    <div className="space-y-2">
      {jobs.length === 0 ? (
        <p className="text-fg-3 text-xs">Sin experiencia laboral indicada.</p>
      ) : (
        <ul className="space-y-2">
          {jobs.map((job, index) => (
            <li key={index} className="text-sm">
              <p className="text-fg font-medium flex items-start gap-1.5">
                <Briefcase className="w-3.5 h-3.5 mt-1 shrink-0 text-fg-3" aria-hidden="true" />
                <span>
                  {job.role || 'Puesto sin indicar'}
                  {job.sector && <span className="text-fg-2 font-normal"> · {job.sector}</span>}
                  <span className="text-fg-2 font-normal"> · {job.years > 0 ? `${job.years} ${job.years === 1 ? 'año' : 'años'}` : 'menos de 1 año'}</span>
                </span>
              </p>
              {job.tasks && <p className="text-xs text-fg-2 mt-0.5 pl-5">{job.tasks}</p>}
            </li>
          ))}
        </ul>
      )}
      {c.experienceMonths && (
        <p className="text-xs text-fg-3">{EXPERIENCE_MONTHS_LABELS[c.experienceMonths] ?? c.experienceMonths}</p>
      )}
    </div>
  );
}

function RequirementGroup({ label, items, tone }: { label: string; items: string[]; tone: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className={`text-xs font-semibold ${tone}`}>{label}</p>
      <p className="text-xs text-fg">{items.join(', ')}</p>
    </div>
  );
}

/** Lo que tiene / está aprendiendo / le falta, según `evaluateOffer`. */
function FitDetails({ summary }: { summary: CandidateFitSummary }) {
  const empty = [summary.have, summary.learning, summary.missingTrainable, summary.missing, summary.conditions].every(l => l.length === 0);
  if (empty) return <p className="text-xs text-fg-3">La vacante no tiene requisitos.</p>;
  return (
    <div className="space-y-1.5">
      <RequirementGroup label="Lo tiene" items={summary.have} tone="text-ok" />
      <RequirementGroup label="Lo está aprendiendo" items={summary.learning} tone="text-accent-strong" />
      <RequirementGroup label="Por aprender · lo enseñáis vosotros" items={summary.missingTrainable} tone="text-fg-2" />
      <RequirementGroup label="Por aprender" items={summary.missing} tone="text-gap" />
      <RequirementGroup label="Condiciones (las confirma la persona)" items={summary.conditions} tone="text-fg-3" />
    </div>
  );
}

function Extras({ app }: { app: Application }) {
  const c = app.candidate;
  const portfolio = c.portfolioUrl?.trim();
  const safeUrl = portfolio && /^https?:\/\//i.test(portfolio) ? portfolio : portfolio ? `https://${portfolio}` : '';
  return (
    <ul className="space-y-1.5 text-xs text-fg-2">
      {safeUrl ? (
        <li>
          <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="text-accent-strong underline underline-offset-2 inline-flex items-center gap-1 break-all">
            Portfolio
            <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span className="sr-only">(se abre en otra pestaña)</span>
          </a>
        </li>
      ) : (
        <li className="text-fg-3">Sin portfolio</li>
      )}
      {c.mainProject && <li><span className="text-fg-3">Proyecto:</span> {c.mainProject}</li>}
      <li><span className="text-fg-3">Inglés:</span> {c.englishLevel || 'Sin indicar'}</li>
      <li className="flex items-center gap-1">
        <MessageSquareText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        {c.practicedInterview ? 'Ha practicado la entrevista' : 'Aún no ha practicado la entrevista'}
      </li>
      {app.wantsFadSupport && (
        <li className="flex items-center gap-1 text-ok">
          <HandHeart className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          Pide acompañamiento de Fad
        </li>
      )}
    </ul>
  );
}

interface ActionsProps {
  app: Application;
  busy: boolean;
  onChange: (app: Application, status: ApplicationStatus) => void;
  onDecline: () => void;
}

/** Siguiente paso del proceso según el estado actual. */
function Actions({ app, busy, onChange, onDecline }: ActionsProps) {
  const ref = anonymousRef(app);
  if (app.status === 'hired' || app.status === 'declined') {
    return <p className="text-xs text-fg-3">Proceso cerrado.</p>;
  }
  const next: { status: ApplicationStatus; label: string; icon: typeof Mail } =
    app.status === 'pending'
      ? { status: 'contact_open', label: 'Abrir contacto', icon: Mail }
      : app.status === 'contact_open'
        ? { status: 'interview', label: 'Pasar a entrevista', icon: UserCheck }
        : { status: 'hired', label: 'Marcar contratada', icon: UserRoundCheck };
  const Icon = next.icon;
  return (
    <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => onChange(app, next.status)}
        className="btn btn-primary"
        aria-label={`${next.label} · candidatura ${ref}`}
      >
        <Icon className="w-4 h-4" aria-hidden="true" />
        {next.label}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onDecline}
        className="btn btn-secondary"
        aria-label={`Descartar · candidatura ${ref}`}
      >
        <X className="w-4 h-4" aria-hidden="true" />
        Descartar
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
      className="m-auto w-[min(32rem,calc(100vw-2rem))] p-0 bg-surface text-fg border border-line-strong border-t-2 border-t-accent rounded-dialog backdrop:bg-black/60"
    >
      <form
        method="dialog"
        onSubmit={e => { e.preventDefault(); confirm(); }}
        className="p-6"
      >
        <h3 id="decline-title" className="font-display font-bold text-lg text-fg mb-2">
          Descartar la candidatura {anonymousRef(app)}
        </h3>
        <p id="decline-description" className="text-sm text-fg-2 mb-4">
          La persona recibirá el motivo que elijas, lo que le faltaba y tres ofertas parecidas. Nunca se descarta a nadie de forma automática.
        </p>
        <fieldset aria-describedby={error ? 'decline-error' : undefined}>
          <legend className="label-tech">Motivo *</legend>
          <div className="space-y-2">
            {DECLINE_REASONS.map(option => (
              <label key={option} className={`option flex items-start gap-3 cursor-pointer text-sm ${reason === option ? 'border-accent text-accent-strong bg-accent-soft' : ''}`}>
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
        {error && <p id="decline-error" role="alert" className="text-xs text-danger mt-3">{error}</p>}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6">
          <button type="button" onClick={onCancel} className="btn btn-secondary">Cancelar</button>
          <button type="submit" className="btn btn-primary">Descartar con este motivo</button>
        </div>
      </form>
    </dialog>
  );
}
