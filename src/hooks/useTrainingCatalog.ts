/**
 * @file useTrainingCatalog.ts
 * @description Hook de React para leer el catálogo de formación (Supabase o respaldo local).
 */

import { useEffect, useState } from 'react';

import { fetchTrainingCatalog } from '../data/trainingRepository';
import type { CatalogSource } from '../data/trainingRepository';
import type { TrainingCourse } from '../data/trainingCatalog';

export interface TrainingCatalogState {
  courses: TrainingCourse[];
  source: CatalogSource | null;
  isLoading: boolean;
}

export function useTrainingCatalog(): TrainingCatalogState {
  const [state, setState] = useState<TrainingCatalogState>({ courses: [], source: null, isLoading: true });

  useEffect(() => {
    let isActive = true;
    fetchTrainingCatalog().then(({ courses, source }) => {
      if (isActive) setState({ courses, source, isLoading: false });
    });
    return () => {
      isActive = false;
    };
  }, []);

  return state;
}
