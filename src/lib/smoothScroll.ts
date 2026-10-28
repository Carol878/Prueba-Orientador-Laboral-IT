/**
 * @file smoothScroll.ts
 * @description Scroll suave e inercial de toda la ventana con Lenis.
 *
 * Una sola instancia para toda la app. Si el usuario prefiere movimiento reducido
 * no se activa y el navegador mantiene su scroll nativo.
 * Los contenedores con scroll propio (p. ej. el chat) llevan `data-lenis-prevent`.
 */

import { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

let lenis: Lenis | null = null;

export function useSmoothScroll(): void {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    lenis = new Lenis({
      autoRaf: true,
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
    });

    return () => {
      lenis?.destroy();
      lenis = null;
    };
  }, []);
}

/** Vuelve al inicio de la página sin animación (cambio de pestaña o de vista). */
export function scrollToTop(): void {
  if (lenis) {
    lenis.scrollTo(0, { immediate: true });
  } else {
    window.scrollTo(0, 0);
  }
}
