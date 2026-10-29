/**
 * @file trainingRepository.ts
 * @description Lectura de los recursos de formación desde Supabase (tabla `training_resources`).
 *
 * - Convierte las filas (snake_case) al tipo `TrainingCourse` que usa la interfaz.
 * - Guarda el resultado en memoria: el plan de acción y la sección de formación comparten una sola petición.
 * - Si Supabase no está configurado, falla o devuelve 0 filas, usa `FALLBACK_TRAINING_CATALOG`.
 */

import { supabase } from '../lib/supabaseClient';
import { FALLBACK_TRAINING_CATALOG, PRICE_LABELS } from './trainingCatalog';
import type {
  TrainingCategory,
  TrainingCourse,
  TrainingLanguage,
  TrainingModality,
  TrainingPriceType
} from './trainingCatalog';

/** Columnas de la tabla tal como las devuelve Supabase. */
interface TrainingResourceRow {
  id: string;
  ref_code: string | null;
  title: string;
  provider: string;
  description: string;
  url: string;
  price_type: TrainingPriceType;
  language: TrainingLanguage;
  modality: TrainingModality;
  category: TrainingCategory | null;
  skills: string[] | null;
  target_roles: string[] | null;
  official_certification: boolean;
  certification_issuer: 'estatal' | 'fabricante' | null;
  certification_name: string | null;
}

export type CatalogSource = 'supabase' | 'local';

export interface TrainingCatalogResult {
  courses: TrainingCourse[];
  source: CatalogSource;
}

const COLUMNS =
  'id, ref_code, title, provider, description, url, price_type, language, modality, category, skills, target_roles, official_certification, certification_issuer, certification_name';

function toCourse(row: TrainingResourceRow): TrainingCourse {
  return {
    id: row.id,
    refCode: row.ref_code ?? row.id,
    title: row.title,
    provider: row.provider,
    category: row.category ?? 'soft_skills',
    priceType: row.price_type,
    priceLabel: PRICE_LABELS[row.price_type] ?? row.price_type,
    modality: row.modality,
    language: row.language,
    targetRoles: row.target_roles ?? [],
    skillsCovered: row.skills ?? [],
    officialCertification: row.official_certification,
    certificationIssuer: row.certification_issuer ?? undefined,
    certificationName: row.certification_name ?? undefined,
    url: row.url,
    description: row.description
  };
}

const LOCAL_RESULT: TrainingCatalogResult = { courses: FALLBACK_TRAINING_CATALOG, source: 'local' };

async function loadFromSupabase(): Promise<TrainingCatalogResult> {
  if (!supabase) return LOCAL_RESULT;

  const { data, error } = await supabase
    .from('training_resources')
    .select(COLUMNS)
    .eq('it_related', true)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[formación] No se pudo leer Supabase, se usan los datos locales:', error.message);
    return LOCAL_RESULT;
  }
  if (!data || data.length === 0) {
    console.warn('[formación] La tabla training_resources está vacía, se usan los datos locales.');
    return LOCAL_RESULT;
  }
  return { courses: (data as TrainingResourceRow[]).map(toCourse), source: 'supabase' };
}

let cached: Promise<TrainingCatalogResult> | null = null;

/** Devuelve el catálogo (una sola petición por visita). Nunca lanza error. */
export function fetchTrainingCatalog(): Promise<TrainingCatalogResult> {
  cached ??= loadFromSupabase().catch(error => {
    console.error('[formación] Error inesperado leyendo Supabase:', error);
    return LOCAL_RESULT;
  });
  return cached;
}
