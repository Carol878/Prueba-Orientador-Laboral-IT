/**
 * @file supabaseClient.ts
 * @description Cliente único de Supabase para toda la app.
 *
 * Las credenciales se leen de `.env.local` (no se sube a GitHub). Vite las incrusta en el código
 * al hacer `npm run build`, así que la clave acaba siendo pública: por eso solo debe usarse la clave
 * "anon"/"publishable" y la seguridad la garantizan las políticas RLS de la base de datos.
 *
 * Si faltan las variables, `supabase` vale `null` y la sección de formación muestra el error.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      // Por ahora solo se leen datos públicos: no hace falta guardar sesión de Supabase.
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

// Solo avisa si se ha pedido leer los cursos de Supabase (por defecto se usa el catálogo local).
if (!isSupabaseConfigured && import.meta.env.DEV && import.meta.env.VITE_TRAINING_SOURCE === 'supabase') {
  console.error('[supabase] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local: no se podrán cargar los cursos.');
}
