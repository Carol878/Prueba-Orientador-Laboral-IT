/**
 * @file LoginBackdrop.tsx
 * @description Fondo animado del login. Carga three.js bajo demanda (chunk aparte) y monta la variante
 * elegida: "red de talento" que forma el logotipo de Fad o degradado fluido con shader WebGL.
 * Sin WebGL se queda en el color liso del lienzo.
 */

import { useEffect, useRef } from 'react';
import type { BackdropHandle, BackdropStart } from './backdrop/types';

export type BackdropVariant = 'network' | 'gradient';

export interface LoginBackdropProps {
  /** Fondo elegido: red de talento (three.js) o degradado (shader WebGL). */
  variant: BackdropVariant;
  /** Perfil que el usuario está eligiendo; el fondo puede reaccionar a él. */
  focus: 'young' | 'company' | null;
}

/** Color base del lienzo (paleta Grafito); se ve mientras carga o si falta WebGL. */
const CANVAS_COLOR = '#0c0e13';

/** Importa de forma diferida el módulo de la variante (cada uno arrastra three.js). */
function loadVariant(variant: BackdropVariant): Promise<BackdropStart> {
  return variant === 'network'
    ? import('./backdrop/network').then((m) => m.start)
    : import('./backdrop/gradient').then((m) => m.start);
}

export default function LoginBackdrop({ variant, focus }: LoginBackdropProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<BackdropHandle | null>(null);
  const focusRef = useRef(focus);

  // Monta la escena solo al cambiar de variante; cada montaje usa un <canvas> nuevo
  // para que el contexto WebGL anterior se pueda liberar del todo.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let canvas: HTMLCanvasElement | null = null;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    loadVariant(variant)
      .then((start) => {
        if (cancelled) return;
        canvas = document.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        Object.assign(canvas.style, {
          position: 'fixed',
          inset: '0',
          width: '100%',
          height: '100%',
          zIndex: '-10',
          pointerEvents: 'none',
          display: 'block',
        });
        host.appendChild(canvas);
        handleRef.current = start(canvas, { reducedMotion, focus: focusRef.current });
      })
      .catch(() => {
        // Sin el chunk de three.js (offline, error de red) se queda el color liso.
      });

    return () => {
      cancelled = true;
      handleRef.current?.dispose();
      handleRef.current = null;
      canvas?.remove();
    };
  }, [variant]);

  // El foco solo actualiza la escena existente.
  useEffect(() => {
    focusRef.current = focus;
    handleRef.current?.setFocus(focus);
  }, [focus]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={{ backgroundColor: CANVAS_COLOR }}
    />
  );
}
