/**
 * @file journey.ts
 * @description Estado del recorrido del joven (Diagnóstico → Plan → Ofertas → Entrevista) y pequeños
 * datos guardados en este navegador que lo alimentan: si ya ha visto su plan y su itinerario de cursos.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { OFFERS_CHANGED_EVENT, offersService } from '../../services/offersService';

export type JourneyStepId = 'diagnostic' | 'roadmap' | 'offers' | 'interview';

export interface JourneyStep {
  /** Coincide con el id de la pestaña del panel. */
  id: JourneyStepId;
  label: string;
  done: boolean;
}

export interface JourneyInput {
  techStackCount: number;
  workExperienceCount: number;
  planVisited: boolean;
  itineraryCount: number;
  applicationsCount: number;
  practicedInterview: boolean;
}

/** Los cuatro pasos con su ✓ según lo que ya ha hecho la persona. */
export function journeySteps(input: JourneyInput): JourneyStep[] {
  return [
    { id: 'diagnostic', label: 'Diagnóstico', done: input.techStackCount > 0 || input.workExperienceCount > 0 },
    { id: 'roadmap', label: 'Plan', done: input.planVisited || input.itineraryCount > 0 },
    { id: 'offers', label: 'Ofertas', done: input.applicationsCount > 0 },
    { id: 'interview', label: 'Entrevista', done: input.practicedInterview }
  ];
}

/** Número de paso (1-4) de una pestaña del recorrido, para el antetítulo "Paso X de 4". */
export function journeyStepNumber(id: JourneyStepId): number {
  return ['diagnostic', 'roadmap', 'offers', 'interview'].indexOf(id) + 1;
}

// ---------------------------------------------------------------------------
// Itinerario de cursos (lo escribe "Formación recomendada")
// ---------------------------------------------------------------------------

export const itineraryKey = (email: string): string => `it_orientador_itinerary:${email}`;

/** Lee el itinerario guardado; si el almacenamiento falla o está corrupto, empieza vacío. */
export function loadItinerary(email: string): string[] {
  try {
    const saved = localStorage.getItem(itineraryKey(email));
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// "Ya ha visto su plan"
// ---------------------------------------------------------------------------

const planVisitedKey = (email: string): string => `young_plan_visited:${email.trim().toLowerCase()}`;

export function loadPlanVisited(email: string): boolean {
  try {
    return localStorage.getItem(planVisitedKey(email)) === '1';
  } catch {
    return false;
  }
}

export function savePlanVisited(email: string): void {
  try {
    localStorage.setItem(planVisitedKey(email), '1');
  } catch {
    // Sin almacenamiento: el paso solo cuenta como hecho durante esta visita.
  }
}

// ---------------------------------------------------------------------------
// Candidaturas enviadas (para el stepper y el tablero de Inicio)
// ---------------------------------------------------------------------------

/** Número de candidaturas de la persona; se actualiza solo cuando cambian las ofertas. */
export function useApplicationsCount(candidateEmail: string | null): number {
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
        if (id === requestId.current) setCount(apps.length);
      })
      .catch(error => console.error('[recorrido] Error al contar candidaturas:', error));
  }, [candidateEmail]);

  useEffect(() => {
    reload();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith('offers_store')) reload();
    };
    window.addEventListener(OFFERS_CHANGED_EVENT, reload);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(OFFERS_CHANGED_EVENT, reload);
      window.removeEventListener('storage', onStorage);
    };
  }, [reload]);

  return count;
}
