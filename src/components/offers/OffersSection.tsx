/**
 * @file OffersSection.tsx
 * @description Pestaña "Ofertas" del panel de jóvenes, con dos subpestañas:
 * - "Ofertas": pila de tarjetas ordenada por afinidad (sin ocultar ninguna) y filtros sencillos.
 * - "Mis candidaturas": el seguimiento de cada candidatura.
 *
 * Todo pasa por `offersService`; los datos se recargan solos con `OFFERS_CHANGED_EVENT`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, ArrowUpRight, Briefcase, Inbox, LoaderCircle, RotateCcw, Terminal, Undo2, X } from 'lucide-react';

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
import EmptyIllustration from '../young/EmptyIllustration';

export type OffersView = 'deck' | 'applications';

interface OffersSectionProps {
  /** Antetítulo de la cabecera ("Paso 3 de 4 · Ofertas"). */
  eyebrow: string;
  /** Recorrido del joven, que se pinta bajo la cabecera. */
  stepper?: ReactNode;
  /** Candidaturas enviadas (para el contador de la subpestaña). */
  applicationsCount: number;
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

/** Segundos que se ve el aviso "Deshacer" tras cada decisión. */
const UNDO_TOAST_MS = 5000;

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
    <section className="card p-5 mb-5 animate-enter" aria-labelledby="prepare-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="prepare-title" className="font-display font-semibold text-lg text-fg">
            Prepárate mientras responden
          </h3>
          <p className="text-body text-fg-2 mt-1">
            Hemos enviado tu interés a {offer.companyName} ({offer.title}). Suele responder en {offer.responseDays}{' '}
            {offer.responseDays === 1 ? 'día' : 'días'}. Mientras tanto:
          </p>
        </div>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-icon shrink-0" aria-label="Cerrar aviso">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {courses.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {courses.map(course => (
            <li key={course.id} className="px-3 py-2 border border-line rounded text-body">
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
              <span className="block text-meta text-fg-2 mt-0.5">
                {course.provider} · {course.priceLabel}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-body text-fg-2">Ya tienes lo que piden. Lo mejor que puedes hacer ahora es practicar la entrevista.</p>
      )}

      <button type="button" onClick={onPractice} className="btn btn-secondary mt-4">
        <Terminal className="w-4 h-4" aria-hidden="true" />
        Practicar la entrevista
      </button>
    </section>
  );
}

/** Aviso temporal tras cada decisión con el botón "Deshacer" (el lector de pantalla ya lo oye aparte). */
function UndoToast({ text, busy, onUndo, onClose }: { text: string; busy: boolean; onUndo: () => void; onClose: () => void }) {
  const [hold, setHold] = useState(false);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  // Se cierra solo a los 5 s, salvo mientras tiene el foco o el ratón encima.
  useEffect(() => {
    if (hold) return;
    const id = window.setTimeout(() => closeRef.current(), UNDO_TOAST_MS);
    return () => window.clearTimeout(id);
  }, [hold, text]);

  // Al <body>: la animación de entrada de la vista crea un contenedor que "atraparía" el position: fixed.
  return createPortal(
    <div
      className={
        'fixed z-30 inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] mx-auto max-w-md ' +
        'md:inset-x-auto md:right-6 md:bottom-6 md:w-[26rem] ' +
        'flex items-center gap-3 pl-4 pr-1.5 py-1.5 bg-raised border border-line-strong rounded shadow-[0_12px_32px_rgba(0,0,0,0.45)] animate-enter'
      }
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
    >
      <p className="flex-1 min-w-0 text-body text-fg line-clamp-2">{text}</p>
      <button type="button" onClick={onUndo} disabled={busy} className="btn btn-ghost shrink-0 px-3 text-accent-strong">
        <Undo2 className="w-4 h-4" aria-hidden="true" />
        Deshacer
      </button>
    </div>,
    document.body
  );
}

export default function OffersSection({
  eyebrow,
  stepper,
  applicationsCount,
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
  /** Aviso visible "Has guardado «…»" con "Deshacer" durante unos segundos. */
  const [toast, setToast] = useState<{ offerId: string; text: string } | null>(null);

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
        setToast({ offerId: offer.id, text: `${DECISION_TEXT[decision]} «${offer.title}».` });
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
        setToast(prev => (prev?.offerId === target ? null : prev));
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
    <div className="page flex-1 pb-0! animate-enter">
      {/* Con poca altura (móvil en horizontal o zoom al 200 %) se esconden la descripción y el recorrido
          para que la oferta asome en la primera pantalla. */}
      <div className="[@media(max-height:480px)]:[&_h2+p]:hidden">
        <PageHeader
          eyebrow={eyebrow}
          title="Ofertas para ti"
          description="Una oferta cada vez, empezando por las que más se parecen a tu perfil. Ninguna empresa ve tu nombre hasta que abre el contacto contigo."
        />
      </div>
      <div className="[@media(max-height:480px)]:hidden">{stepper}</div>

      {/* La pila y Mis candidaturas, en una columna cómoda de leer dentro del ancho común. */}
      <div className="max-w-3xl">

      {/* Subpestañas */}
      <div role="tablist" aria-label="Ofertas y candidaturas" className="flex gap-1 mb-6 border-b border-line">
        {[
          { id: 'deck' as const, label: 'Ofertas', news: 0, icon: Briefcase },
          {
            id: 'applications' as const,
            label: `Mis candidaturas (${applicationsCount})`,
            news: newsCount,
            icon: Inbox
          }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`offers-tab-${tab.id}`}
            aria-selected={view === tab.id}
            aria-controls={`offers-panel-${tab.id}`}
            onClick={() => onViewChange(tab.id)}
            className={`min-h-11 px-3 -mb-px flex items-center gap-2 border-b-2 text-control font-semibold nums ${
              view === tab.id ? 'border-accent text-accent-strong' : 'border-transparent text-fg-2 hover:text-fg'
            }`}
          >
            <tab.icon className="w-4 h-4" aria-hidden="true" />
            {tab.label}
            {tab.news > 0 && (
              <span className="badge-technical text-cert border-cert/60 py-0">
                {tab.news} {tab.news === 1 ? 'novedad' : 'novedades'}
              </span>
            )}
          </button>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {actionError && (
        <div role="alert" className="alert alert-danger mb-4">
          <AlertCircle aria-hidden="true" />
          <p>{actionError}</p>
        </div>
      )}

      {data.status === 'loading' && data.offers.length === 0 ? (
        <p className="flex items-center gap-2 text-body text-fg-2 py-8" role="status">
          <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" />
          Cargando ofertas…
        </p>
      ) : data.status === 'error' ? (
        <div role="alert" className="card p-5 text-body text-fg">
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
            pastOffers={data.pastOffers}
            candidate={candidate}
            fitProfile={fitProfile}
            busy={busy}
            onShowOffer={showOffer}
            onInterested={offer => handleDecide(offer, 'interested')}
            onUndo={offerId => void handleUndo(offerId)}
            onPracticeInterview={practiceFor}
            onBrowseOffers={() => onViewChange('deck')}
          />
        </div>
      ) : (
        <div role="tabpanel" id="offers-panel-deck" aria-labelledby="offers-tab-deck">
          {/* Filtros sencillos */}
          <details className="card mb-5 group" open={filtersActive || undefined}>
            <summary className="min-h-11 px-4 flex items-center justify-between gap-3 cursor-pointer text-control font-semibold text-fg">
              <span>Filtrar ofertas{filtersActive ? ' (filtros activos)' : ''}</span>
              <span className="text-meta font-normal text-fg-2">Modalidad, jornada, sector</span>
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
              <label className="sm:col-span-3 flex items-center gap-3 min-h-11 text-body text-fg cursor-pointer">
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
            <div className="card p-6 mb-10 text-body text-fg-2 flex flex-col sm:flex-row sm:items-center gap-5">
              <EmptyIllustration variant="filters" />
              <div>
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
            </div>
          )}
        </div>
      )}

      </div>

      {toast && (
        <UndoToast
          text={toast.text}
          busy={busy}
          onUndo={() => void handleUndo(toast.offerId)}
          onClose={() => setToast(null)}
        />
      )}

      <ConsentDialog offer={pendingInterest} busy={busy} onAccept={wantsFad => void handleConsent(wantsFad)} onCancel={() => setPendingInterest(null)} />
    </div>
  );
}
