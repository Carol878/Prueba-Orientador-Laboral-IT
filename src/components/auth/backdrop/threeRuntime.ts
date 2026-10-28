/**
 * @file threeRuntime.ts
 * @description Utilidades comunes a las variantes three.js: creación segura del renderer, redimensionado
 * y bucle de animación que se pausa cuando la pestaña está oculta.
 */

import { WebGLRenderer } from 'three';

/** Crea el renderer o devuelve `null` si WebGL no está disponible. */
export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer | null {
  try {
    const renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    return renderer;
  } catch {
    return null;
  }
}

interface LoopOptions {
  canvas: HTMLCanvasElement;
  renderer: WebGLRenderer;
  reducedMotion: boolean;
  /** Ajusta cámara/uniforms al nuevo tamaño en píxeles CSS. */
  onResize: (width: number, height: number) => void;
  /** Avanza la escena; `t` en segundos (solo cuenta mientras está visible), `dt` acotado. */
  onFrame: (t: number, dt: number) => void;
}

export interface Loop {
  /** Pinta un fotograma suelto (útil en modo de movimiento reducido). */
  renderOnce: () => void;
  stop: () => void;
}

/**
 * Arranca el bucle: rAF mientras el documento está visible, sin bucle si `reducedMotion`.
 * Gestiona ResizeObserver y `visibilitychange`.
 */
export function startLoop({ canvas, renderer, reducedMotion, onResize, onFrame }: LoopOptions): Loop {
  let raf = 0;
  let last = 0;
  let time = 0;
  let stopped = false;

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    onResize(w, h);
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    time += dt;
    onFrame(time, dt);
  };

  const play = () => {
    if (stopped || reducedMotion || raf || document.hidden) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  };

  const pause = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const renderOnce = () => {
    if (!stopped) onFrame(time, 0);
  };

  const onVisibility = () => (document.hidden ? pause() : play());

  const observer = new ResizeObserver(() => {
    resize();
    if (reducedMotion) renderOnce();
  });
  observer.observe(canvas);
  document.addEventListener('visibilitychange', onVisibility);

  resize();
  if (reducedMotion) renderOnce();
  else play();

  return {
    renderOnce,
    stop: () => {
      stopped = true;
      pause();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}

/** Disco suave para que los puntos no se vean cuadrados. */
export function createDiscTexture(): HTMLCanvasElement {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return c;
}
