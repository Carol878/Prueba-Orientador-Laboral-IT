/**
 * @file demoAuth.ts
 * @description Implementación de `AuthService` contra las cuentas de `demoAccounts.ts`.
 * La sesión se persiste en LocalStorage.
 */

import type { UserSession } from '../types';
import type { AuthService } from './authService';
import { DEMO_ACCOUNTS } from './demoAccounts';

const SESSION_KEY = 'it_orientador_current_user';

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** SHA-256 en hexadecimal usando la Web Crypto API del navegador. */
const sha256Hex = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

const findAccount = (email: string) =>
  DEMO_ACCOUNTS.find(account => account.email === normalizeEmail(email));

export const demoAuthService: AuthService = {
  async signIn(email, password) {
    const account = findAccount(email);
    const hash = await sha256Hex(`${normalizeEmail(email)}:${password}`);

    // Mismo mensaje para email inexistente y contraseña errónea: no revela qué cuentas existen.
    if (!account || account.passwordHash !== hash) {
      return { user: null, error: 'Correo o contraseña incorrectos.' };
    }

    const user: UserSession = { email: account.email, role: account.role, name: account.name };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error guardando la sesión en el almacenamiento local:', error);
    }
    return { user, error: null };
  },

  async signOut() {
    localStorage.removeItem(SESSION_KEY);
  },

  async getSession() {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (!saved) return null;

      // Se reconstruye desde la cuenta demo para descartar sesiones antiguas o editadas a mano.
      const account = findAccount((JSON.parse(saved) as Partial<UserSession>).email ?? '');
      if (!account) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return { email: account.email, role: account.role, name: account.name };
    } catch (error) {
      console.error('Error leyendo la sesión del almacenamiento local:', error);
      return null;
    }
  }
};
