/**
 * @file VacanciesList.tsx
 * @description Vacantes de la empresa con su estado, número de candidaturas y acciones
 * (ver candidaturas, editar, pausar, reabrir y cerrar).
 */

import { useState } from 'react';
import { Archive, CalendarClock, Eye, MapPin, Pause, Pencil, Play, Plus, Users, Wallet } from 'lucide-react';

import type { Application, JobOffer, OfferStatus } from '../../types';
import { offersService } from '../../services/offersService';
import { isOfferActive } from '../../lib/offerMatch';
import { PageHeader } from '../common/AppShell';
import { OFFER_STATUS_LABELS, formatDate, formatSalary } from './companyUtils';
import PrivacyNote from './PrivacyNote';

const STATUS_TONE: Record<OfferStatus, string> = {
  open: 'border-ok text-ok bg-ok-soft',
  paused: 'border-gap text-gap bg-gap-soft',
  closed: 'border-line-strong text-fg-3 bg-raised'
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

  const sorted = [...offers].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.createdAt.localeCompare(a.createdAt)
  );

  const setStatus = async (offer: JobOffer, status: OfferStatus) => {
    if (status === 'closed' && !window.confirm(`¿Cerrar la vacante "${offer.title}"? Dejará de mostrarse a las personas candidatas. Podrás reabrirla más adelante.`)) {
      return;
    }
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
        <p role="status" className="mb-4 p-3 border border-ok/40 border-l-2 border-l-ok bg-ok-soft rounded text-sm text-ok">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 p-3 border border-danger/30 border-l-2 border-l-danger bg-danger-soft rounded text-danger text-sm">
          {error}
        </p>
      )}

      {loading && offers.length === 0 ? (
        <div className="card p-8 text-center text-sm text-fg-2">Cargando vacantes…</div>
      ) : sorted.length === 0 ? (
        <div className="card p-8 text-center text-sm text-fg-2">
          <p className="mb-4">Aún no has publicado ninguna vacante.</p>
          <button type="button" onClick={onCreate} className="btn btn-primary">
            <Plus className="w-4 h-4" aria-hidden="true" />
            Publicar la primera
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map(offer => {
            const apps = applicationsByOffer[offer.id] ?? [];
            const unseen = apps.filter(a => a.unseenByCompany).length;
            const pending = apps.filter(a => a.status === 'pending').length;
            const expired = offer.status === 'open' && !isOfferActive(offer);
            const busy = busyId === offer.id;
            return (
              <li key={offer.id} className="card-technical">
                <div className="p-5 flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`badge-technical ${STATUS_TONE[offer.status]}`}>{OFFER_STATUS_LABELS[offer.status]}</span>
                      {expired && <span className="badge-technical border-danger text-danger bg-danger-soft">Plazo vencido</span>}
                      {unseen > 0 && (
                        <span className="badge-technical border-accent text-accent-strong bg-accent-soft">
                          {unseen} {unseen === 1 ? 'nueva' : 'nuevas'}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display font-bold text-lg tracking-[-0.015em] text-fg">{offer.title}</h3>
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-2">
                      <li className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" aria-hidden="true" />{offer.city} · {offer.modality} · {offer.workday}</li>
                      <li className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5" aria-hidden="true" />{formatSalary(offer)}</li>
                      <li className="flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />Cierra el {formatDate(offer.closesAt)} · respondéis en {offer.responseDays} días</li>
                    </ul>
                    <p className="mt-3 text-sm text-fg flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-fg-3" aria-hidden="true" />
                      <strong>{apps.length}</strong> {apps.length === 1 ? 'candidatura' : 'candidaturas'}
                      {pending > 0 && <span className="text-fg-2">· {pending} sin responder</span>}
                    </p>
                  </div>

                  <div className="flex flex-wrap lg:flex-col gap-2 lg:w-52 shrink-0">
                    <button type="button" onClick={() => onOpen(offer)} className="btn btn-primary" aria-label={`Ver candidaturas de ${offer.title}`}>
                      <Eye className="w-4 h-4" aria-hidden="true" />
                      Ver candidaturas
                    </button>
                    <button type="button" onClick={() => onEdit(offer)} className="btn btn-secondary" aria-label={`Editar ${offer.title}`}>
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                      Editar
                    </button>
                    {offer.status === 'open' && (
                      <button type="button" disabled={busy} onClick={() => setStatus(offer, 'paused')} className="btn btn-secondary" aria-label={`Pausar ${offer.title}`}>
                        <Pause className="w-4 h-4" aria-hidden="true" />
                        Pausar
                      </button>
                    )}
                    {offer.status !== 'open' && (
                      <button type="button" disabled={busy} onClick={() => setStatus(offer, 'open')} className="btn btn-secondary" aria-label={`Reabrir ${offer.title}`}>
                        <Play className="w-4 h-4" aria-hidden="true" />
                        Reabrir
                      </button>
                    )}
                    {offer.status !== 'closed' && (
                      <button type="button" disabled={busy} onClick={() => setStatus(offer, 'closed')} className="btn btn-secondary" aria-label={`Cerrar ${offer.title}`}>
                        <Archive className="w-4 h-4" aria-hidden="true" />
                        Cerrar
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PrivacyNote className="mt-6" />
    </div>
  );
}
