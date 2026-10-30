/**
 * @file useOffers.ts
 * @description Hooks de React para leer ofertas, decisiones y candidaturas a través de `offersService`.
 *
 * Se vuelven a cargar solos cuando cambia algo (evento `OFFERS_CHANGED_EVENT` en esta pestaña,
 * o evento `storage` si el cambio llega desde otra pestaña, p. ej. la empresa demo respondiendo).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { OFFERS_CHANGED_EVENT, offersService } from '../services/offersService';
import type { Application, JobOffer, OfferDecision } from '../types';

export interface OffersData {
  status: 'loading' | 'ready' | 'error';
  offers: JobOffer[];
  decisions: Record<string, OfferDecision>;
  applications: Application[];
  /** Ofertas de candidaturas y guardadas que ya no están abiertas (cerradas, pausadas o caducadas), por id. */
  pastOffers: Record<string, JobOffer>;
  /** Fecha en la que aceptó compartir su perfil (o `null`). */
  consentAt: string | null;
  error: string | null;
}

const EMPTY: OffersData = { status: 'loading', offers: [], decisions: {}, applications: [], pastOffers: {}, consentAt: null, error: null };

/** Busca las ofertas que el joven tiene en candidaturas o guardadas y ya no salen entre las abiertas. */
async function loadPastOffers(
  offers: JobOffer[],
  decisions: Record<string, OfferDecision>,
  applications: Application[]
): Promise<Record<string, JobOffer>> {
  const open = new Set(offers.map(o => o.id));
  const ids = [...new Set([...applications.map(a => a.offerId), ...Object.keys(decisions)])].filter(id => !open.has(id));
  const found = await Promise.all(ids.map(id => offersService.getOffer(id)));
  return Object.fromEntries(found.filter((o): o is JobOffer => o !== null).map(o => [o.id, o]));
}

/** Ejecuta `callback` cada vez que cambian las ofertas o candidaturas (esta pestaña u otra). */
function useOffersChanged(callback: () => void): void {
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith('offers_store')) callback();
    };
    window.addEventListener(OFFERS_CHANGED_EVENT, callback);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(OFFERS_CHANGED_EVENT, callback);
      window.removeEventListener('storage', onStorage);
    };
  }, [callback]);
}

/** Todo lo que necesita la sección "Ofertas" del joven. */
export function useOffersData(candidateEmail: string): OffersData & { reload: () => void } {
  const [data, setData] = useState<OffersData>(EMPTY);
  const requestId = useRef(0);

  const reload = useCallback(() => {
    const id = ++requestId.current;
    Promise.all([
      offersService.listOpenOffers(),
      offersService.getDecisions(candidateEmail),
      offersService.listMyApplications(candidateEmail),
      offersService.getConsent(candidateEmail)
    ])
      .then(async ([offers, decisions, applications, consentAt]) => {
        const pastOffers = await loadPastOffers(offers, decisions, applications);
        if (id !== requestId.current) return;
        setData({ status: 'ready', offers, decisions, applications, pastOffers, consentAt, error: null });
      })
      .catch((error: unknown) => {
        if (id !== requestId.current) return;
        console.error('[ofertas] Error al cargar las ofertas:', error);
        setData(prev => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'No se han podido cargar las ofertas.'
        }));
      });
  }, [candidateEmail]);

  useEffect(() => {
    reload();
  }, [reload]);
  useOffersChanged(reload);

  return { ...data, reload };
}

/** Candidaturas con cambios que la persona aún no ha visto (para el contador del menú y el aviso de Inicio). */
export function useUnseenApplications(candidateEmail: string | null): number {
  const [count, setCount] = useState(0);
  const requestId = useRef(0);

  const reload = useCallback(() => {
    const id = ++requestId.current;
    if (!candidateEmail) {
      setCount(0);
      return;
    }
    offersService
      .listMyApplications(candidateEmail)
      .then(apps => {
        if (id === requestId.current) setCount(apps.filter(a => a.unseenByCandidate).length);
      })
      .catch(error => console.error('[ofertas] Error al contar novedades:', error));
  }, [candidateEmail]);

  useEffect(() => {
    reload();
  }, [reload]);
  useOffersChanged(reload);

  return count;
}
