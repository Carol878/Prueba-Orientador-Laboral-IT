/**
 * @file authService.ts
 * @description Contrato común de autenticación y selección de la implementación activa.
 *
 * La app solo habla con `authService`, nunca con una implementación concreta.
 * Para migrar a Supabase basta con crear `supabaseAuth.ts` que cumpla `AuthService`
 * (signInWithPassword / signOut / getSession) y cambiar la exportación de abajo.
 */

import type { UserSession } from '../types';
import { demoAuthService } from './demoAuth';
import { apiAuthService } from './apiAuth';

export type AuthResult =
  | { user: UserSession; error: null }
  | { user: null; error: string };

export interface AuthService {
  /** Valida credenciales y, si son correctas, persiste la sesión. */
  signIn(email: string, password: string): Promise<AuthResult>;
  /** Elimina la sesión activa. */
  signOut(): Promise<void>;
  /** Devuelve la sesión guardada si sigue siendo válida. */
  getSession(): Promise<UserSession | null>;
}

const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');

// Implementación activa: la API en Python si está configurada; si no, las cuentas demo.
export const authService: AuthService = apiUrl ? apiAuthService(apiUrl) : demoAuthService;
