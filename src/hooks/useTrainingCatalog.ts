/**
 * @file useTrainingCatalog.ts
 * @description Hook de React para leer el catálogo de formación desde Supabase.
 */

import { useCallback, useEffect, useState } from 'react';

import { fetchTrainingCatalog } from '../data/trainingRepository';
import type { CatalogError } from '../data/trainingRepository';
import type { TrainingCourse } from '../data/trainingCatalog';

export type TrainingCatalogState =
  | { status: 'loading'; courses: TrainingCourse[]; error: null }
  | { status: 'ready'; courses: TrainingCourse[]; error: null }
  | { status: 'error'; courses: TrainingCourse[]; error: CatalogError };

export function useTrainingCatalog(): TrainingCatalogState & { retry: () => void } {
  const [state, setState] = useState<TrainingCatalogState>({ status: 'loading', courses: [], error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isActive = true;
    fetchTrainingCatalog().then(result => {
      if (!isActive) return;
      setState(
        result.ok
          ? { status: 'ready', courses: result.courses, error: null }
          : { status: 'error', courses: [], error: result.error }
      );
    });
    return () => {
      isActive = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading', courses: [], error: null });
    setAttempt(n => n + 1);
  }, []);

  return { ...state, retry };
}
