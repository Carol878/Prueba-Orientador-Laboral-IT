/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origen de los cursos: "local" (por defecto) o "supabase". */
  readonly VITE_TRAINING_SOURCE?: 'local' | 'supabase';
  /** URL de la API en Python (FastAPI). Si no se indica, las ofertas y conexiones se guardan en este navegador. */
  readonly VITE_API_URL?: string;
  /** URL del proyecto de Supabase (Project Settings → API → Project URL). */
  readonly VITE_SUPABASE_URL?: string;
  /** Clave pública "anon" o "publishable" (nunca la service_role / secret). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
