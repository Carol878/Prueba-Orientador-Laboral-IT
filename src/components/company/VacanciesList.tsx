/**
 * @file VacanciesList.tsx
 * @description Vacantes de la empresa en tarjetas compactas: estado, datos clave, embudo de candidaturas
 * y acciones (ver candidaturas como principal; editar, pausar, reabrir y cerrar como iconos).
 */

import { useState } from 'react';
import { AlertTriangle, Archive, CheckCircle2, Pause, Pencil, Play, Plus, Users } from 'lucide-react';

import type { Application, JobOffer, OfferStatus } from '../../types';
import { offersService } from '../../services/offersService';
import { isOfferActive } from '../../lib/offerMatch';
import { PageHeader } from '../common/AppShell';
import {
  APPLICATION_STATUS_FILL,
  FUNNEL_ORDER,
  FUNNEL_SHORT_LABELS,
  OFFER_STATUS_LABELS,
  formatDate,
  formatSalaryShort,
  isOverdue
} from './companyUtils';
import ConfirmDialog from './ConfirmDialog';
import FunnelBar from './FunnelBar';
import PrivacyNote from './PrivacyNote';

/** Color del punto de estado de la vacante: abierta (verde), pausada (requiere atención) y cerrada (apagado). */
const STATUS_DOT: Record<OfferStatus, string> = {
  open: 'bg-ok',
  paused: 'bg-gap',
  closed: 'bg-fg-3'
};

/** Orden del listado: abiertas, pausadas y cerradas; dentro de cada grupo, las más recientes primero. */
const STATUS_ORDER: Record<OfferStatus, number> = { open: 0, paused: 1, closed: 2 };

interface VacanciesListProps {
  offers: JobOffer[];
  applicationsByOffer: Record<string, Application[]>;
  loading: boolean;
  /** Mensaje de confirmación tras publicar o editar. */
  notice?: string;
  onOpen: (offer: JobOffer) => void;
  onEdit: (offer: JobOffer) => void;
  onCreate: () => void;
}

export default function VacanciesList({ offers, applicationsByOffer, loading, notice, onOpen, onEdit, onCreate }: VacanciesListProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [announcement, setAnnouncement] = useState<string>('');
  /** Vacante pendiente de confirmar el cierre. */
  const [closing, setClosing] = useState<JobOffer | null>(null);

  const sorted = [...offers].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.createdAt.localeCompare(a.createdAt)
  );
  const anyApplications = sorted.some(o => (applicationsByOffer[o.id] ?? []).length > 0);

  const setStatus = async (offer: JobOffer, status: OfferStatus) => {
    setBusyId(offer.id);
    setError('');
    try {
      await offersService.setOfferStatus(offer.id, status);
      setAnnouncement(`Vacante "${offer.title}": ${OFFER_STATUS_LABELS[status].toLowerCase()}.`);
    } catch (err) {
      console.error('[empresas] No se ha podido cambiar el estado de la vacante:', err);
      setError('No se ha podido cambiar el estado de la vacante. Inténtalo de nuevo.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Mis vacantes y candidaturas"
        title="Tus vacantes"
        description="Revisa las candidaturas de cada vacante, responde dentro del plazo que te comprometiste y pausa o cierra las que ya no necesites."
        aside={
          <button type="button" onClick={onCreate} className="btn btn-primary">
            <Plus className="w-4 h-4" aria-hidden="true" />
            Publicar vacante
          </button>
        }
      />

      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      {notice && (
        <div role="status" className="alert alert-ok mb-4">
          <CheckCircle2 aria-hidden="true" />
          <p>{notice}</p>
        </div>
      )}
      {error && (
        <div role="alert" className="alert alert-danger mb-4">
          <AlertTriangle aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {loading && offers.length === 0 ? (
        <div className="card p-8 text-center text-body text-fg-2">Cargando vacantes…</div>
      ) : sorted.length === 0 ? (
        <div className="card p-8 text-center text-body text-fg-2">
          <p className="mb-4">Aún no has publicado ninguna vacante.</p>
          <button type="button" onClick={onCreate} className="btn btn-primary">
            <Plus className="w-4 h-4" aria-hidden="true" />
            Publicar la primera
          </button>
        </div>
      ) : (
        <>
          {/* Leyenda común del embudo: cada tarjeta lleva además su propio aria-label con las cifras. */}
          {anyApplications && (
            <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-meta text-fg-2" aria-label="Colores del embudo de candidaturas">
              {FUNNEL_ORDER.map(status => (
                <li key={status} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-sm ${APPLICATION_STATUS_FILL[status]}`} aria-hidden="true" />
                  {FUNNEL_SHORT_LABELS[status]}
                </li>
              ))}
            </ul>
          )}

          <ul className="space-y-2">
            {sorted.map(offer => (
              <VacancyRow
                key={offer.id}
                offer={offer}
                applications={applicationsByOffer[offer.id] ?? []}
                busy={busyId === offer.id}
                onOpen={() => onOpen(offer)}
                onEdit={() => onEdit(offer)}
                onPause={() => setStatus(offer, 'paused')}
                onReopen={() => setStatus(offer, 'open')}
                onClose={() => setClosing(offer)}
              />
            ))}
          </ul>
        </>
      )}

      <PrivacyNote className="mt-6" />

      {closing && (
        <ConfirmDialog
          title={`¿Cerrar "${closing.title}"?`}
          confirmLabel="Cerrar la vacante"
          tone="danger"
          onCancel={() => setClosing(null)}
          onConfirm={() => {
            const offer = closing;
            setClosing(null);
            setStatus(offer, 'closed');
          }}
        >
          <p>
            Dejará de mostrarse a las personas candidatas y las candidaturas sin responder recibirán un aviso.
            Podrás reabrirla más adelante.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

interface VacancyRowProps {
  offer: JobOffer;
  applications: Application[];
  busy: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onPause: () => void;
  onReopen: () => void;
  onClose: () => void;
}

/** Tarjeta compacta de una vacante (unos 110 px en escritorio). */
function VacancyRow({ offer, applications, busy, onOpen, onEdit, onPause, onReopen, onClose }: VacancyRowProps) {
  const unseen = applications.filter(a => a.unseenByCompany).length;
  const pending = applications.filter(a => a.status === 'pending').length;
  const overdue = applications.filter(a => isOverdue(a, offer)).length;
  const expired = offer.status === 'open' && !isOfferActive(offer);
  const total = applications.length;

  return (
    <li className="card grid grid-cols-1 gap-x-6 gap-y-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,17rem)_auto] lg:items-center">
      {/* QUÉ ES: ESTADO, TÍTULO Y DATOS CLAVE */}
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta">
          <span className="flex items-center gap-1.5 text-fg-2">
            <span className={`dot ${STATUS_DOT[offer.status]}`} aria-hidden="true" />
            {OFFER_STATUS_LABELS[offer.status]}
          </span>
          {expired && <span className="font-semibold text-danger">Plazo de publicación vencido</span>}
          {unseen > 0 && (
            <span className="font-semibold text-fg">
              {unseen} {unseen === 1 ? 'nueva' : 'nuevas'}
            </span>
          )}
        </p>
        <h3 className="mt-1 line-clamp-2 font-display text-lead font-bold tracking-[-0.01em] text-fg" title={offer.title}>
          {offer.title}
        </h3>
        <p className="mt-0.5 text-meta text-fg-2">
          {offer.city} · {offer.modality} · <span className="nums whitespace-nowrap">{formatSalaryShort(offer)}</span>
          <span className="whitespace-nowrap text-fg-3"> · cierra el <span className="nums">{formatDate(offer.closesAt)}</span></span>
        </p>
      </div>

      {/* CÓMO VA: EMBUDO Y PLAZOS */}
      <div className="min-w-0">
        <p className="mb-1.5 flex flex-wrap items-baseline gap-x-2 text-meta text-fg-2">
          <span>
            <span className="nums font-semibold text-fg">{total}</span> {total === 1 ? 'candidatura' : 'candidaturas'}
          </span>
          {pending > 0 && <span>· <span className="nums">{pending}</span> sin responder</span>}
        </p>
        <FunnelBar applications={applications} legend={false} />
        {overdue > 0 ? (
          <p
            className="mt-1.5 flex items-center gap-1.5 text-meta font-semibold text-danger"
            title={`Más de ${offer.responseDays} días sin responder`}
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              <span className="nums">{overdue}</span> fuera de plazo
              <span className="sr-only"> (más de {offer.responseDays} días sin responder)</span>
            </span>
          </p>
        ) : (
          <p className="mt-1.5 text-meta text-fg-3">Respondéis en {offer.responseDays} {offer.responseDays === 1 ? 'día' : 'días'}</p>
        )}
      </div>

      {/* ACCIONES: UNA PRINCIPAL Y EL RESTO COMO ICONOS */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpen}
          className="btn btn-primary flex-1 whitespace-nowrap px-3 lg:flex-none lg:w-[13.5rem]"
          aria-label={`Ver candidaturas de ${offer.title} (${total})`}
        >
          <Users className="h-4 w-4" aria-hidden="true" />
          <span><span className="hidden sm:inline">Ver candidaturas</span><span className="sm:hidden">Candidaturas</span> <span className="nums">({total})</span></span>
        </button>
        <IconAction label={`Editar ${offer.title}`} title="Editar" onClick={onEdit} icon={Pencil} />
        {offer.status === 'open' ? (
          <IconAction label={`Pausar ${offer.title}`} title="Pausar (deja de mostrarse)" onClick={onPause} icon={Pause} disabled={busy} />
        ) : (
          <IconAction label={`Reabrir ${offer.title}`} title="Reabrir" onClick={onReopen} icon={Play} disabled={busy} />
        )}
        {offer.status !== 'closed' ? (
          <IconAction label={`Cerrar ${offer.title}`} title="Cerrar la vacante" onClick={onClose} icon={Archive} disabled={busy} />
        ) : (
          // Hueco del mismo ancho para que el botón principal no se mueva entre filas.
          <span className="w-11 shrink-0" aria-hidden="true" />
        )}
      </div>
    </li>
  );
}

interface IconActionProps {
  label: string;
  title: string;
  icon: typeof Pencil;
  onClick: () => void;
  disabled?: boolean;
}

function IconAction({ label, title, icon: Icon, onClick, disabled }: IconActionProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={title} className="btn btn-ghost btn-icon shrink-0">
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
