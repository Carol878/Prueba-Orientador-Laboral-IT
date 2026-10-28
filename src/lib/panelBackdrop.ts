/**
 * @file panelBackdrop.ts
 * @description Preferencia de fondo de los paneles: degradado fijo (CSS) o vivo (WebGL animado).
 * Almacén externo mínimo persistido en localStorage y expuesto con `useSyncExternalStore`.
 */

import { useSyncExternalStore } from 'react';

export type PanelBackdropMode = 'static' | 'live';

const STORAGE_KEY = 'it_orientador_panel_backdrop';
const DEFAULT_MODE: PanelBackdropMode = 'static';

/** Lee la preferencia guardada; cualquier fallo de almacenamiento cae al valor por defecto. */
function readStored(): PanelBackdropMode {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'live' || value === 'static' ? value : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

let mode: PanelBackdropMode = typeof window === 'undefined' ? DEFAULT_MODE : readStored();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): PanelBackdropMode {
  return mode;
}

function getServerSnapshot(): PanelBackdropMode {
  return DEFAULT_MODE;
}

/** Cambia el modo, lo persiste y avisa a los suscriptores. */
export function setPanelBackdrop(next: PanelBackdropMode): void {
  if (next === mode) return;
  mode = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Sin almacenamiento (modo privado, cuota): la preferencia dura solo esta sesión.
  }
  listeners.forEach((l) => l());
}

/** Modo de fondo actual y su setter. */
export function usePanelBackdrop(): [PanelBackdropMode, (m: PanelBackdropMode) => void] {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [current, setPanelBackdrop];
}
