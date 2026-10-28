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

export const DEMO_PASSWORD = '123456';

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'ana.martinez@demo.fad',
    name: 'Ana Martínez',
    role: 'young',
    passwordHash: 'ebaa9d1f1a3e397d799d1e278fd7724c2b7edbe39b8c78cccf166ede690c95aa' // SHA-256(ana.martinez@demo.fad:123456)
  },
  {
    email: 'carlos.ruiz@demo.fad',
    name: 'Carlos Ruiz',
    role: 'young',
    passwordHash: 'df8775f01284417140486a4bc85a7d7fdcc48aba31f058bdaa7d8d681c38dc54' // SHA-256(carlos.ruiz@demo.fad:123456)
  },
  {
    email: 'rrhh@techsolutions.demo',
    name: 'Tech Solutions S.L.',
    role: 'company',
    passwordHash: 'd73f6077593f8449edd32e0c6a17fd3f287ff93ae36277366cad720aa9266c6d' // SHA-256(rrhh@techsolutions.demo:123456)
  },
  {
    email: 'talento@innovadata.demo',
    name: 'InnovaData',
    role: 'company',
    passwordHash: '388663bade42ae1d9c679736195e9827eec41963d2dad7fcf6bda455783dae4b' // SHA-256(talento@innovadata.demo:123456)
  }
];
