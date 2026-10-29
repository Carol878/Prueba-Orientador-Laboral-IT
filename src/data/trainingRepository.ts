/**
 * @file trainingRepository.ts
 * @description Lectura de los recursos de formación desde Supabase (tabla `training_resources`).
 *
 * La base de datos es la ÚNICA fuente de cursos: no hay copia local de respaldo. Si algo falla,
 * se devuelve un error con el motivo concreto para que se vea en pantalla y en la consola,
 * y así saber exactamente dónde está el problema de conexión.
 *
 * El resultado correcto se guarda en memoria (el plan de acción y la sección de formación
 * comparten una sola petición). Los errores NO se guardan, para poder reintentar.
 */

import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { PRICE_LABELS } from './trainingCatalog';
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

/** Dónde ha fallado la carga. */
export type CatalogErrorKind =
  | 'not_configured' // faltan las variables de .env.local al compilar
  | 'request_failed' // Supabase respondió con error (URL, clave, tabla o permisos)
  | 'network' // no hubo respuesta (sin internet, URL inexistente, proyecto pausado…)
  | 'empty'; // la consulta funcionó pero no devolvió cursos

export interface CatalogError {
  kind: CatalogErrorKind;
  /** Mensaje para la persona usuaria. */
  message: string;
  /** Detalle técnico para depurar (se muestra plegado y en la consola). */
  detail: string;
}

export type TrainingCatalogResult =
  | { ok: true; courses: TrainingCourse[] }
  | { ok: false; error: CatalogError };

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

function failure(kind: CatalogErrorKind, message: string, detail: string): TrainingCatalogResult {
  console.error(`[formación] ${message}\n→ ${detail}`);
  return { ok: false, error: { kind, message, detail } };
}

async function loadFromSupabase(): Promise<TrainingCatalogResult> {
  if (!isSupabaseConfigured || !supabase) {
    return failure(
      'not_configured',
      'La web no tiene configurada la conexión con la base de datos.',
      'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local. Tras crearlo, reinicia "npm run dev" o vuelve a hacer "npm run deploy".'
    );
  }

  const { data, error, status } = await supabase
    .from('training_resources')
    .select(COLUMNS)
    .eq('it_related', true)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    // Supabase devuelve status 0 cuando la petición ni siquiera llegó al servidor.
    if (status === 0 || /fetch|network/i.test(error.message)) {
      return failure(
        'network',
        'No se ha podido contactar con la base de datos.',
        `Sin respuesta del servidor (${error.message}). Revisa la conexión a internet, que VITE_SUPABASE_URL sea correcta y que el proyecto de Supabase no esté pausado.`
      );
    }
    return failure(
      'request_failed',
      'La base de datos ha rechazado la consulta de cursos.',
      `HTTP ${status} · ${error.code ?? 'sin código'} · ${error.message}${error.hint ? ` · Pista: ${error.hint}` : ''}`
    );
  }

  if (!data || data.length === 0) {
    return failure(
      'empty',
      'La base de datos no ha devuelto ningún curso.',
      'La consulta funcionó, pero la tabla training_resources no tiene filas visibles con it_related = true y active = true. Comprueba que se ejecutó supabase/training_resources.sql y que existe la política RLS "Lectura pública de recursos activos".'
    );
  }

  const courses = (data as TrainingResourceRow[]).map(toCourse);
  console.info(`[formación] ${courses.length} cursos cargados desde Supabase.`);
  return { ok: true, courses };
}

let cached: Promise<TrainingCatalogResult> | null = null;

/** Devuelve el catálogo desde Supabase. Nunca lanza: los fallos llegan como `{ ok: false }`. */
export function fetchTrainingCatalog(): Promise<TrainingCatalogResult> {
  cached ??= loadFromSupabase()
    .catch((unexpected: unknown) =>
      failure('network', 'No se ha podido contactar con la base de datos.', String(unexpected))
    )
    .then(result => {
      if (!result.ok) cached = null; // permite reintentar
      return result;
    });
  return cached;
}
