/**
 * @file offersService.ts
 * @description Ofertas, decisiones del joven y candidaturas: un único contrato con dos implementaciones.
 *
 * - Local (por defecto): todo se guarda en localStorage de este navegador. Como lo comparten las cuentas
 *   demo, se puede probar el circuito completo: el joven muestra interés, se entra como empresa y se responde.
 * - API (si existe `VITE_API_URL`): las mismas operaciones contra el backend en Python (`backend/`).
 *   Las rutas de `httpOffersService` son las que implementa FastAPI.
 *
 * La interfaz solo usa `offersService`, así que cambiar de una a otra no toca ningún componente.
 */

import { API_TOKEN_KEY } from '../auth/apiAuth';
import { DEMO_JOB_OFFERS } from '../data/jobOffers';
import { isOfferActive } from '../lib/offerMatch';
import type { Application, ApplicationStatus, CandidateProfile, JobOffer, OfferDecision, OfferStatus } from '../types';

export interface ApplicationUpdate {
  status?: ApplicationStatus;
  declineReason?: string;
}

export interface OffersService {
  /** Ofertas abiertas y sin caducar (ejemplo + publicadas por empresas). */
  listOpenOffers(): Promise<JobOffer[]>;
  /** Todas las ofertas de una empresa, también pausadas o cerradas. */
  listCompanyOffers(companyEmail: string): Promise<JobOffer[]>;
  /** Crea (sin `id`) o actualiza una oferta. */
  saveOffer(offer: Omit<JobOffer, 'id' | 'createdAt'> & { id?: string }): Promise<JobOffer>;
  setOfferStatus(offerId: string, status: OfferStatus): Promise<void>;

  /** Decisión del joven sobre cada oferta (id de oferta → decisión). */
  getDecisions(candidateEmail: string): Promise<Record<string, OfferDecision>>;
  /** "Me interesa" crea la candidatura con una copia del perfil; "Ahora no" y "Guardar" solo se recuerdan. */
  decide(candidate: CandidateProfile, offerId: string, decision: OfferDecision, wantsFadSupport?: boolean): Promise<void>;
  /** Deshace la decisión (y retira la candidatura si la empresa aún no la ha contestado). */
  undoDecision(candidateEmail: string, offerId: string): Promise<void>;

  listMyApplications(candidateEmail: string): Promise<Application[]>;
  listApplicants(offerId: string): Promise<Application[]>;
  /** La empresa cambia el estado. Descartar exige motivo. */
  updateApplication(applicationId: string, update: ApplicationUpdate): Promise<Application>;
  markSeen(applicationId: string, by: 'candidate' | 'company'): Promise<void>;

  /** Fecha en la que la persona aceptó compartir su perfil anónimo (o `null`). */
  getConsent(candidateEmail: string): Promise<string | null>;
  giveConsent(candidateEmail: string): Promise<void>;
}

// ============================================================================
// IMPLEMENTACIÓN LOCAL (localStorage)
// ============================================================================

const STORAGE_KEY = 'offers_store_v1';

/** Evento que se lanza en `window` cada vez que cambian las ofertas o candidaturas locales. */
export const OFFERS_CHANGED_EVENT = 'offers:changed';

interface LocalStore {
  /** Ofertas publicadas desde el panel de empresas y cambios de estado de las de ejemplo. */
  offers: JobOffer[];
  decisions: Record<string, Record<string, OfferDecision>>;
  applications: Application[];
  consents: Record<string, string>;
}

const emptyStore = (): LocalStore => ({ offers: [], decisions: {}, applications: [], consents: {} });

function readStore(): LocalStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...emptyStore(), ...JSON.parse(raw) } : emptyStore();
  } catch (error) {
    console.error('[ofertas] No se ha podido leer el almacenamiento local:', error);
    return emptyStore();
  }
}

function writeStore(store: LocalStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    // Avisa a otras pestañas y componentes de que hay cambios (p. ej. el contador de avisos).
    window.dispatchEvent(new Event(OFFERS_CHANGED_EVENT));
  } catch (error) {
    console.error('[ofertas] No se ha podido guardar en el almacenamiento local:', error);
  }
}

/** Ofertas de ejemplo con los cambios guardados encima, más las publicadas por empresas. */
function allOffers(store: LocalStore): JobOffer[] {
  const saved = new Map(store.offers.map(o => [o.id, o]));
  const demos = DEMO_JOB_OFFERS.map(o => saved.get(o.id) ?? o);
  const published = store.offers.filter(o => !DEMO_JOB_OFFERS.some(d => d.id === o.id));
  return [...published, ...demos];
}

const nowIso = (): string => new Date().toISOString();
const newId = (prefix: string): string =>
  `${prefix}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now().toString(36)}`;

function updateWhere<T>(list: T[], match: (item: T) => boolean, patch: (item: T) => T): T[] {
  return list.map(item => (match(item) ? patch(item) : item));
}

export const localOffersService: OffersService = {
  async listOpenOffers() {
    return allOffers(readStore()).filter(o => isOfferActive(o));
  },

  async listCompanyOffers(companyEmail) {
    return allOffers(readStore()).filter(o => o.companyEmail === companyEmail);
  },

  async saveOffer(input) {
    const store = readStore();
    const existing = input.id ? allOffers(store).find(o => o.id === input.id) : undefined;
    const offer: JobOffer = { ...input, id: input.id ?? newId('offer'), createdAt: existing?.createdAt ?? nowIso() };
    store.offers = [offer, ...store.offers.filter(o => o.id !== offer.id)];
    writeStore(store);
    return offer;
  },

  async setOfferStatus(offerId, status) {
    const store = readStore();
    const offer = allOffers(store).find(o => o.id === offerId);
    if (!offer) throw new Error(`La oferta ${offerId} no existe.`);
    store.offers = [{ ...offer, status }, ...store.offers.filter(o => o.id !== offerId)];
    writeStore(store);
  },

  async getDecisions(candidateEmail) {
    return readStore().decisions[candidateEmail] ?? {};
  },

  async decide(candidate, offerId, decision, wantsFadSupport = false) {
    const store = readStore();
    store.decisions[candidate.email] = { ...store.decisions[candidate.email], [offerId]: decision };
    const already = store.applications.some(a => a.offerId === offerId && a.candidateEmail === candidate.email);
    if (decision === 'interested' && !already) {
      const now = nowIso();
      store.applications.unshift({
        id: newId('app'),
        offerId,
        candidateEmail: candidate.email,
        candidate,
        status: 'pending',
        wantsFadSupport,
        createdAt: now,
        updatedAt: now,
        unseenByCandidate: false,
        unseenByCompany: true
      });
    }
    writeStore(store);
  },

  async undoDecision(candidateEmail, offerId) {
    const store = readStore();
    const { [offerId]: _removed, ...rest } = store.decisions[candidateEmail] ?? {};
    store.decisions[candidateEmail] = rest;
    store.applications = store.applications.filter(
      a => !(a.offerId === offerId && a.candidateEmail === candidateEmail && a.status === 'pending')
    );
    writeStore(store);
  },

  async listMyApplications(candidateEmail) {
    return readStore().applications.filter(a => a.candidateEmail === candidateEmail);
  },

  async listApplicants(offerId) {
    return readStore().applications.filter(a => a.offerId === offerId);
  },

  async updateApplication(applicationId, update) {
    if (update.status === 'declined' && !update.declineReason) {
      throw new Error('Para descartar una candidatura hay que indicar el motivo.');
    }
    const store = readStore();
    store.applications = updateWhere(
      store.applications,
      a => a.id === applicationId,
      a => ({ ...a, ...update, updatedAt: nowIso(), unseenByCandidate: true })
    );
    const updated = store.applications.find(a => a.id === applicationId);
    if (!updated) throw new Error(`La candidatura ${applicationId} no existe.`);
    writeStore(store);
    return updated;
  },

  async markSeen(applicationId, by) {
    const store = readStore();
    const field = by === 'candidate' ? 'unseenByCandidate' : 'unseenByCompany';
    store.applications = updateWhere(store.applications, a => a.id === applicationId, a => ({ ...a, [field]: false }));
    writeStore(store);
  },

  async getConsent(candidateEmail) {
    return readStore().consents[candidateEmail] ?? null;
  },

  async giveConsent(candidateEmail) {
    const store = readStore();
    store.consents[candidateEmail] = nowIso();
    writeStore(store);
  }
};

// ============================================================================
// IMPLEMENTACIÓN API (FastAPI, carpeta backend/)
// ============================================================================

async function api<T>(baseUrl: string, path: string, init: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem(API_TOKEN_KEY);
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Error ${response.status} en ${path}`);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

const enc = encodeURIComponent;

export function httpOffersService(baseUrl: string): OffersService {
  const call = <T>(path: string, init?: RequestInit) => api<T>(baseUrl, path, init);
  const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

  return {
    listOpenOffers: () => call('/offers'),
    listCompanyOffers: email => call(`/companies/${enc(email)}/offers`),
    saveOffer: offer => (offer.id ? call(`/offers/${enc(offer.id)}`, json('PUT', offer)) : call('/offers', json('POST', offer))),
    setOfferStatus: (id, status) => call(`/offers/${enc(id)}/status`, json('PATCH', { status })),
    getDecisions: email => call(`/candidates/${enc(email)}/decisions`),
    decide: (candidate, offerId, decision, wantsFadSupport = false) =>
      call(`/candidates/${enc(candidate.email)}/decisions/${enc(offerId)}`, json('PUT', { decision, candidate, wantsFadSupport })),
    undoDecision: (email, offerId) => call(`/candidates/${enc(email)}/decisions/${enc(offerId)}`, { method: 'DELETE' }),
    listMyApplications: email => call(`/candidates/${enc(email)}/applications`),
    listApplicants: offerId => call(`/offers/${enc(offerId)}/applications`),
    updateApplication: (id, update) => call(`/applications/${enc(id)}`, json('PATCH', update)),
    markSeen: (id, by) => call(`/applications/${enc(id)}/seen`, json('POST', { by })),
    getConsent: async email => (await call<{ consentedAt: string | null }>(`/candidates/${enc(email)}/consent`)).consentedAt,
    giveConsent: email => call(`/candidates/${enc(email)}/consent`, { method: 'PUT' })
  };
}

const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');

/** Servicio que usa la app: API si está configurada, si no, este navegador. */
export const offersService: OffersService = apiUrl ? httpOffersService(apiUrl) : localOffersService;
