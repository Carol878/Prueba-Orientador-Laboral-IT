/**
 * @file OffersSection.tsx
 * @description Pestaña "Ofertas" del panel de jóvenes, con dos subpestañas:
 * - "Ofertas": pila de tarjetas ordenada por afinidad (sin ocultar ninguna) y filtros sencillos.
 * - "Mis candidaturas": el seguimiento de cada candidatura.
 *
 * Todo pasa por `offersService`; los datos se recargan solos con `OFFERS_CHANGED_EVENT`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Briefcase, Inbox, LoaderCircle, RotateCcw, Terminal, X } from 'lucide-react';

import { PageHeader } from '../common/AppShell';
import { useOffersData } from '../../hooks/useOffers';
import { useTrainingCatalog } from '../../hooks/useTrainingCatalog';
import { offersService } from '../../services/offersService';
import { evaluateOffer } from '../../lib/offerMatch';
import type { FitProfile } from '../../lib/offerMatch';
import type { TrainingCourse } from '../../data/trainingCatalog';
import type { CandidateProfile, JobOffer, OfferDecision, WorkModality, Workday } from '../../types';
import OfferDeck from './OfferDeck';
import type { RankedOffer } from './OfferDeck';
import ConsentDialog from './ConsentDialog';
import MyApplications from './MyApplications';
import { coursesForOffer, roleKeyForOffer } from './offerText';

export type OffersView = 'deck' | 'applications';

interface OffersSectionProps {
  candidate: CandidateProfile;
  /** Puesto del diagnóstico (clave de `ROLE_DATABASE`). */
  targetRole: string;
  view: OffersView;
  onViewChange: (view: OffersView) => void;
  /** Añade (o quita) habilidades a "Lo estoy aprendiendo". */
  onToggleLearning: (skills: string[], learning: boolean) => void;
  /** Abre el simulador de entrevista (con el puesto más parecido, si lo hay). */
  onPracticeInterview: (roleKey: string | null) => void;
}

interface Filters {
  modality: WorkModality | '';
  workday: Workday | '';
  sector: string;
  newcomersOnly: boolean;
}

const NO_FILTERS: Filters = { modality: '', workday: '', sector: '', newcomersOnly: false };
const MODALITIES: WorkModality[] = ['Presencial', 'Híbrido', 'Remoto'];
const WORKDAYS: Workday[] = ['Completa', 'Parcial', 'Por turnos'];

const DECISION_TEXT: Record<OfferDecision, string> = {
  skipped: 'Has pasado de',
  saved: 'Has guardado',
  interested: 'Has enviado tu interés a'
};

const fadSupportKey = (email: string) => `offers_fad_support:${email.toLowerCase()}`;

function readFadSupport(email: string): boolean {
  try {
    return localStorage.getItem(fadSupportKey(email)) === '1';
  } catch {
    return false;
  }
}

function matchesFilters(offer: JobOffer, filters: Filters): boolean {
  return (
    (!filters.modality || offer.modality === filters.modality) &&
    (!filters.workday || offer.workday === filters.workday) &&
    (!filters.sector || offer.sector === filters.sector) &&
    (!filters.newcomersOnly || offer.openToNewcomers)
  );
}

/** Aviso tras "Me interesa": cursos para ir preparándose y enlace al simulador. */
function PrepareNotice({
  offer,
  courses,
  onPractice,
  onClose
}: {
  offer: JobOffer;
  courses: TrainingCourse[];
  onPractice: () => void;
  onClose: () => void;
}) {
  return (
    <section className="card-technical p-5 mb-5 animate-enter" aria-labelledby="prepare-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="prepare-title" className="font-display font-semibold text-lg text-fg">
            Prepárate mientras responden
          </h3>
          <p className="text-sm text-fg-2 mt-1">
            Hemos enviado tu interés a {offer.companyName} ({offer.title}). Suele responder en {offer.responseDays}{' '}
            {offer.responseDays === 1 ? 'día' : 'días'}. Mientras tanto:
          </p>
        </div>
        <button type="button" onClick={onClose} className="min-w-11 min-h-11 grid place-items-center text-fg-2 hover:text-fg" aria-label="Cerrar aviso">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {courses.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {courses.map(course => (
            <li key={course.id} className="px-3 py-2 border border-line rounded-[2px] text-sm">
              <a
                href={course.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-accent-strong underline underline-offset-2 inline-flex items-center gap-1"
              >
                {course.title}
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="sr-only">(se abre en una pestaña nueva)</span>
              </a>
              <span className="block text-xs text-fg-2 mt-0.5">
                {course.provider} · {course.priceLabel}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-fg-2">Ya tienes lo que piden. Lo mejor que puedes hacer ahora es practicar la entrevista.</p>
      )}

      <button type="button" onClick={onPractice} className="btn btn-secondary mt-4">
        <Terminal className="w-4 h-4" aria-hidden="true" />
        Practicar la entrevista
      </button>
    </section>
  );
}

export default function OffersSection({
  candidate,
  targetRole,
  view,
  onViewChange,
  onToggleLearning,
  onPracticeInterview
}: OffersSectionProps) {
  const data = useOffersData(candidate.email);
  const catalog = useTrainingCatalog();

  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [history, setHistory] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [actionError, setActionError] = useState('');
  const [pendingInterest, setPendingInterest] = useState<JobOffer | null>(null);
  const [prepareFor, setPrepareFor] = useState<JobOffer | null>(null);
  /** Oferta que se quiere ver la primera (al deshacer o desde "Ofertas parecidas"). */
  const [focusOfferId, setFocusOfferId] = useState<string | null>(null);

  // Al cambiar de persona se olvida el historial de esta sesión.
  useEffect(() => {
    setHistory([]);
    setPrepareFor(null);
  }, [candidate.email]);

  const fitProfile: FitProfile = useMemo(
    () => ({ techStack: candidate.techStack, learningSkills: candidate.learningSkills, englishLevel: candidate.englishLevel }),
    [candidate.techStack, candidate.learningSkills, candidate.englishLevel]
  );

  /** Todas las ofertas abiertas, de más a menos afines (a igualdad, la que cierra antes). */
  const ranked: RankedOffer[] = useMemo(
    () =>
      data.offers
        .map(offer => ({ offer, fit: evaluateOffer(offer, fitProfile) }))
        .sort((a, b) => b.fit.score - a.fit.score || a.offer.closesAt.localeCompare(b.offer.closesAt)),
    [data.offers, fitProfile]
  );

  const sectors = useMemo(() => [...new Set(data.offers.map(o => o.sector))].sort((a, b) => a.localeCompare(b, 'es')), [data.offers]);

  const queue = useMemo(() => {
    const pending = ranked.filter(item => !data.decisions[item.offer.id]);
    const focused = pending.find(item => item.offer.id === focusOfferId);
    const filtered = pending.filter(item => item.offer.id !== focusOfferId && matchesFilters(item.offer, filters));
    return focused ? [focused, ...filtered] : filtered;
  }, [ranked, data.decisions, filters, focusOfferId]);

  const undecidedTotal = useMemo(() => ranked.filter(item => !data.decisions[item.offer.id]).length, [ranked, data.decisions]);
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const newsCount = data.applications.filter(a => a.unseenByCandidate).length;

  const runDecision = useCallback(
    async (offer: JobOffer, decision: OfferDecision, wantsFadSupport: boolean) => {
      setBusy(true);
      setActionError('');
      try {
        await offersService.decide(candidate, offer.id, decision, wantsFadSupport);
        setHistory(prev => [...prev, offer.id]);
        setFocusOfferId(prev => (prev === offer.id ? null : prev));
        setAnnouncement(`${DECISION_TEXT[decision]} «${offer.title}». Puedes deshacerlo.`);
        setPrepareFor(decision === 'interested' ? offer : null);
      } catch (error) {
        console.error('[ofertas] No se ha podido guardar la decisión:', error);
        setActionError('No hemos podido guardar tu decisión. Inténtalo de nuevo en un momento.');
      } finally {
        setBusy(false);
      }
    },
    [candidate]
  );

  const handleDecide = useCallback(
    (offer: JobOffer, decision: OfferDecision) => {
      if (busy) return;
      // La primera vez que muestra interés tiene que aceptar compartir su perfil.
      if (decision === 'interested' && !data.consentAt) {
        setPendingInterest(offer);
        return;
      }
      void runDecision(offer, decision, decision === 'interested' && readFadSupport(candidate.email));
    },
    [busy, data.consentAt, runDecision, candidate.email]
  );

  const handleConsent = async (wantsFadSupport: boolean) => {
    const offer = pendingInterest;
    if (!offer) return;
    setBusy(true);
    try {
      await offersService.giveConsent(candidate.email);
      try {
        localStorage.setItem(fadSupportKey(candidate.email), wantsFadSupport ? '1' : '0');
      } catch {
        // Sin almacenamiento local: solo se pierde la preferencia para la próxima vez.
      }
    } catch (error) {
      console.error('[ofertas] No se ha podido guardar el consentimiento:', error);
      setActionError('No hemos podido guardar tu consentimiento. Inténtalo de nuevo.');
      setBusy(false);
      return;
    }
    setBusy(false);
    setPendingInterest(null);
    await runDecision(offer, 'interested', wantsFadSupport);
  };

  /** Deshace la decisión sobre una oferta (la última de la pila si no se indica). */
  const handleUndo = useCallback(
    async (offerId?: string) => {
      const target = offerId ?? history[history.length - 1];
      if (!target || busy) return;
      setBusy(true);
      setActionError('');
      try {
        await offersService.undoDecision(candidate.email, target);
        setHistory(prev => prev.filter(id => id !== target));
        setPrepareFor(prev => (prev?.id === target ? null : prev));
        setFocusOfferId(target);
        const title = data.offers.find(o => o.id === target)?.title;
        setAnnouncement(title ? `Has deshecho tu decisión sobre «${title}».` : 'Has deshecho tu decisión.');
      } catch (error) {
        console.error('[ofertas] No se ha podido deshacer:', error);
        setActionError('No hemos podido deshacerlo. Inténtalo de nuevo.');
      } finally {
        setBusy(false);
      }
    },
    [history, busy, candidate.email, data.offers]
  );

  const showOffer = (offerId: string) => {
    setFocusOfferId(offerId);
    onViewChange('deck');
  };

  const practiceFor = (offer: JobOffer) => onPracticeInterview(roleKeyForOffer(offer));

  const prepareFit = prepareFor ? ranked.find(item => item.offer.id === prepareFor.id)?.fit : undefined;

  return (
    <div className="flex-1 px-4 pt-8 md:px-10 md:pt-10 pb-0 max-w-3xl mx-auto w-full animate-enter">
      <PageHeader
        eyebrow="Ofertas de empleo"
        title="Ofertas para ti"
        description="Una oferta cada vez, empezando por las que más se parecen a tu perfil. Ninguna empresa ve tu nombre hasta que abre el contacto contigo."
      />

      {/* Subpestañas */}
      <div role="tablist" aria-label="Ofertas y candidaturas" className="flex gap-1 mb-6 border-b border-line">
        {[
          { id: 'deck' as const, label: 'Ofertas', icon: Briefcase },
          { id: 'applications' as const, label: newsCount > 0 ? `Mis candidaturas (${newsCount} nuevas)` : 'Mis candidaturas', icon: Inbox }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`offers-tab-${tab.id}`}
            aria-selected={view === tab.id}
            aria-controls={`offers-panel-${tab.id}`}
            onClick={() => onViewChange(tab.id)}
            className={`min-h-11 px-3 -mb-px flex items-center gap-2 border-b-2 text-sm font-semibold ${
              view === tab.id ? 'border-accent text-accent-strong' : 'border-transparent text-fg-2 hover:text-fg'
            }`}
          >
            <tab.icon className="w-4 h-4" aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {actionError && (
        <p role="alert" className="mb-4 p-3 bg-danger-soft border-l-2 border-danger text-sm text-fg">
          {actionError}
        </p>
      )}

      {data.status === 'loading' && data.offers.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-fg-2 py-8" role="status">
          <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" />
          Cargando ofertas…
        </p>
      ) : data.status === 'error' ? (
        <div role="alert" className="card p-5 text-sm text-fg">
          <p>No hemos podido cargar las ofertas. {data.error}</p>
          <button type="button" onClick={data.reload} className="btn btn-secondary mt-3">
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      ) : view === 'applications' ? (
        <div role="tabpanel" id="offers-panel-applications" aria-labelledby="offers-tab-applications" className="pb-10">
          <MyApplications
            applications={data.applications}
            decisions={data.decisions}
            openOffers={data.offers}
            candidate={candidate}
            fitProfile={fitProfile}
            busy={busy}
            onShowOffer={showOffer}
            onInterested={offer => handleDecide(offer, 'interested')}
            onUndo={offerId => void handleUndo(offerId)}
            onPracticeInterview={practiceFor}
          />
        </div>
      ) : (
        <div role="tabpanel" id="offers-panel-deck" aria-labelledby="offers-tab-deck">
          {/* Filtros sencillos */}
          <details className="card mb-5 group" open={filtersActive || undefined}>
            <summary className="min-h-11 px-4 flex items-center justify-between gap-3 cursor-pointer text-sm font-semibold text-fg">
              <span>Filtrar ofertas{filtersActive ? ' (filtros activos)' : ''}</span>
              <span className="text-xs font-normal text-fg-2">Modalidad, jornada, sector</span>
            </summary>
            <div className="px-4 pb-4 grid sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="filter-modality" className="label-tech">Modalidad</label>
                <select
                  id="filter-modality"
                  value={filters.modality}
                  onChange={e => setFilters(f => ({ ...f, modality: e.target.value as Filters['modality'] }))}
                  className="input-technical"
                >
                  <option value="">Todas</option>
                  {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="filter-workday" className="label-tech">Jornada</label>
                <select
                  id="filter-workday"
                  value={filters.workday}
                  onChange={e => setFilters(f => ({ ...f, workday: e.target.value as Filters['workday'] }))}
                  className="input-technical"
                >
                  <option value="">Todas</option>
                  {WORKDAYS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="filter-sector" className="label-tech">Sector</label>
                <select
                  id="filter-sector"
                  value={filters.sector}
                  onChange={e => setFilters(f => ({ ...f, sector: e.target.value }))}
                  className="input-technical"
                >
                  <option value="">Todos</option>
                  {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <label className="sm:col-span-3 flex items-center gap-3 min-h-11 text-sm text-fg cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.newcomersOnly}
                  onChange={e => setFilters(f => ({ ...f, newcomersOnly: e.target.checked }))}
                  className="w-5 h-5 accent-[var(--color-accent)]"
                />
                Solo ofertas abiertas a perfiles que empiezan o cambian de sector
              </label>
              {filtersActive && (
                <button type="button" onClick={() => setFilters(NO_FILTERS)} className="btn btn-secondary sm:col-span-3 justify-self-start">
                  Quitar filtros
                </button>
              )}
            </div>
          </details>

          {prepareFor && (
            <PrepareNotice
              offer={prepareFor}
              courses={prepareFit ? coursesForOffer(catalog.courses, prepareFit) : []}
              onPractice={() => practiceFor(prepareFor)}
              onClose={() => setPrepareFor(null)}
            />
          )}

          {queue.length > 0 ? (
            <div className="pb-6">
              <OfferDeck
                current={queue[0]}
                remaining={queue.length}
                courses={catalog.courses}
                targetRole={targetRole}
                canUndo={history.length > 0}
                disabled={busy || pendingInterest !== null}
                onDecide={handleDecide}
                onUndo={() => void handleUndo()}
                onToggleLearning={onToggleLearning}
              />
            </div>
          ) : (
            <div className="card p-6 mb-10 text-sm text-fg-2">
              {filtersActive && undecidedTotal > 0 ? (
                <>
                  <p className="text-fg font-semibold">No hay ofertas con estos filtros.</p>
                  <p className="mt-1">Quedan {undecidedTotal} ofertas por ver si quitas los filtros.</p>
                  <button type="button" onClick={() => setFilters(NO_FILTERS)} className="btn btn-secondary mt-3">
                    Quitar filtros
                  </button>
                </>
              ) : (
                <>
                  <p className="text-fg font-semibold">Has visto todas las ofertas abiertas.</p>
                  <p className="mt-1">Te avisaremos aquí cuando haya ofertas nuevas o respuestas de las empresas.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => onViewChange('applications')} className="btn btn-secondary">
                      Ver mis candidaturas
                    </button>
                    {history.length > 0 && (
                      <button type="button" onClick={() => void handleUndo()} className="btn btn-secondary">
                        Deshacer la última
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <ConsentDialog offer={pendingInterest} busy={busy} onAccept={wantsFad => void handleConsent(wantsFad)} onCancel={() => setPendingInterest(null)} />
    </div>
  );
}
