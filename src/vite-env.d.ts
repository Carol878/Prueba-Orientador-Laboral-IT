/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del proyecto de Supabase (Project Settings → API → Project URL). */
  readonly VITE_SUPABASE_URL?: string;
  /** Clave pública "anon" o "publishable" (nunca la service_role / secret). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
