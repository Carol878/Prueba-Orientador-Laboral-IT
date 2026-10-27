/**
 * @file demoAccounts.ts
 * @description Cuentas preconfiguradas para la demo (sin backend).
 *
 * AVISO: la app se publica como web estática en GitHub Pages, así que este archivo
 * llega al navegador de cualquier visitante. Guardar hashes evita que las contraseñas
 * se lean a simple vista, pero NO es seguridad real. No usar contraseñas ni datos reales.
 *
 * passwordHash = SHA-256(`${email}:${password}`) en hexadecimal.
 * Para generar uno nuevo:
 *   node -e "console.log(require('crypto').createHash('sha256').update('email:password').digest('hex'))"
 */

import type { UserRole } from '../types';

export interface DemoAccount {
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'ana.martinez@demo.fad',
    name: 'Ana Martínez',
    role: 'young',
    passwordHash: '04a5003698155683f020b27963bac225840e20aba9e4b8edbfd5031f47c7e141'
  },
  {
    email: 'carlos.ruiz@demo.fad',
    name: 'Carlos Ruiz',
    role: 'young',
    passwordHash: 'c1cadcbb5c097376cad1883590437a1d49f4751917f30279040a2747c16eb815'
  },
  {
    email: 'rrhh@techsolutions.demo',
    name: 'Tech Solutions S.L.',
    role: 'company',
    passwordHash: 'c913e81830fbf952d95d14423b7dcaed873f08f3fefe2856d651f3662cb8becd'
  },
  {
    email: 'talento@innovadata.demo',
    name: 'InnovaData',
    role: 'company',
    passwordHash: 'c6e476a013044793dedcd535735a49f3e04e9279e461dc5faa2f636055bab547'
  }
];
