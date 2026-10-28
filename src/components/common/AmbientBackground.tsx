/**
 * @file AmbientBackground.tsx
 * @description Fondo animado opcional de los paneles. En modo "vivo" carga bajo demanda el degradado
 * WebGL del login (chunk aparte con three.js) y lo pinta en un <canvas> fijo bajo el contenido.
 * En modo "fijo" no pinta nada: se ve el degradado CSS de `.bg-ambient`.
 */

import { useEffect, useRef } from 'react';
import { usePanelBackdrop } from '../../lib/panelBackdrop';

export default function AmbientBackground() {
  const [mode] = usePanelBackdrop();
  const hostRef = useRef<HTMLDivElement>(null);

  // Cada montaje usa un <canvas> nuevo para que el contexto WebGL anterior se libere del todo.
  useEffect(() => {
    if (mode !== 'live') return;
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let canvas: HTMLCanvasElement | null = null;
    let dispose: (() => void) | null = null;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    import('../auth/backdrop/gradient')
      .then(({ start }) => {
        if (cancelled) return;
        canvas = document.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        Object.assign(canvas.style, {
          position: 'fixed',
          inset: '0',
          width: '100%',
          height: '100%',
          zIndex: '-1',
          pointerEvents: 'none',
          display: 'block',
        });
        host.appendChild(canvas);
        dispose = start(canvas, { reducedMotion, focus: null }).dispose;
      })
      .catch(() => {
        // Sin el chunk (offline, error de red) se queda el degradado fijo.
      });

    return () => {
      cancelled = true;
      dispose?.();
      canvas?.remove();
    };
  }, [mode]);

  if (mode !== 'live') return null;
  return <div ref={hostRef} aria-hidden="true" className="contents" />;
}
