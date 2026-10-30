/**
 * @file apiAuth.ts
 * @description Implementación de `AuthService` contra la API en Python (`backend/`).
 *
 * Se usa solo si existe `VITE_API_URL`. El token JWT se guarda en sessionStorage (se borra al cerrar
 * la pestaña) y lo envían todas las peticiones de `offersService`.
 */

import type { UserSession } from '../types';
import type { AuthService } from './authService';

/** Clave de sessionStorage con el token JWT de la API. */
export const API_TOKEN_KEY = 'api_token';

interface ApiUser {
  email: string;
  name: string;
  role: UserSession['role'];
}

const toSession = ({ email, name, role }: ApiUser): UserSession => ({ email, name, role });

export function apiAuthService(baseUrl: string): AuthService {
  return {
    async signIn(email, password) {
      try {
        const response = await fetch(`${baseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password })
        });
        if (!response.ok) {
          // 401/422: mismo mensaje para no revelar qué cuentas existen.
          return { user: null, error: response.status >= 500 ? 'El servidor no responde. Inténtalo más tarde.' : 'Correo o contraseña incorrectos.' };
        }
        const { accessToken, user } = (await response.json()) as { accessToken: string; user: ApiUser };
        sessionStorage.setItem(API_TOKEN_KEY, accessToken);
        return { user: toSession(user), error: null };
      } catch (error) {
        console.error('[auth] No se ha podido contactar con la API:', error);
        return { user: null, error: 'No se ha podido conectar con el servidor.' };
      }
    },

    async signOut() {
      sessionStorage.removeItem(API_TOKEN_KEY);
    },

    async getSession() {
      const token = sessionStorage.getItem(API_TOKEN_KEY);
      if (!token) return null;
      try {
        const response = await fetch(`${baseUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) {
          sessionStorage.removeItem(API_TOKEN_KEY);
          return null;
        }
        return toSession((await response.json()) as ApiUser);
      } catch (error) {
        console.error('[auth] No se ha podido recuperar la sesión de la API:', error);
        return null;
      }
    }
  };
}
