/**
 * @file EmptyIllustration.tsx
 * @description Ilustraciones de línea para los estados vacíos: trazo de 1,5 px en `currentColor`,
 * geometría sencilla y sin relleno. Son decorativas (aria-hidden): el texto de al lado explica el estado.
 */

import type { ReactNode } from 'react';

type Variant = 'applications' | 'filters' | 'chat';

const PATHS: Record<Variant, ReactNode> = {
  // Bandeja vacía con un sobre que todavía no ha salido.
  applications: (
    <>
      <path d="M14 46 L24 22 H72 L82 46" />
      <path d="M14 46 V64 H82 V46 H62 L58 54 H38 L34 46 Z" />
      <rect x="34" y="6" width="28" height="20" rx="2" />
      <path d="M34 8 L48 18 L62 8" />
    </>
  ),
  // Embudo de filtros con una lupa que no encuentra nada.
  filters: (
    <>
      <path d="M10 12 H58 L40 34 V56 L28 62 V34 Z" />
      <circle cx="68" cy="44" r="11" />
      <path d="M76 52 L86 62" />
      <path d="M64 44 H72" />
    </>
  ),
  // Dos bocadillos de conversación, uno a cada lado.
  chat: (
    <>
      <path d="M10 10 H54 V38 H28 L18 48 V38 H10 Z" />
      <path d="M20 21 H44" />
      <path d="M20 28 H36" />
      <path d="M42 30 H86 V56 H78 V66 L68 56 H42 Z" />
      <path d="M52 41 H76" />
      <path d="M52 47 H66" />
    </>
  )
};

export default function EmptyIllustration({ variant, className = '' }: { variant: Variant; className?: string }) {
  return (
    <svg
      viewBox="0 0 96 72"
      width="96"
      height="72"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`text-fg-3 shrink-0 ${className}`}
    >
      {PATHS[variant]}
    </svg>
  );
}
