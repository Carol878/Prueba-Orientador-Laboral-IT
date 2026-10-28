/**
 * @file types.ts
 * @description Tipos compartidos por los fondos animados del login. No importa three.js, de modo que
 * puede usarse desde el bundle principal sin arrastrar la dependencia.
 */

/** Perfil enfocado en el login; `null` cuando ninguno está seleccionado. */
export type BackdropFocus = 'young' | 'company' | null;

export interface BackdropOptions {
  /** Si es `true` se pinta un único fotograma estático, sin bucle de animación. */
  reducedMotion: boolean;
  /** Foco inicial. */
  focus: BackdropFocus;
}

/** Control devuelto por `start` de cada variante. */
export interface BackdropHandle {
  /** Cambia el foco sin recrear la escena (se interpola suavemente). */
  setFocus: (focus: BackdropFocus) => void;
  /** Libera geometrías, materiales, renderer, listeners y el bucle de animación. */
  dispose: () => void;
}

export type BackdropStart = (canvas: HTMLCanvasElement, opts: BackdropOptions) => BackdropHandle;
