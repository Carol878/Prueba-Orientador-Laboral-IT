/**
 * @file Toast.tsx
 * @description Aviso temporal abajo de la pantalla tras una acción, con "Deshacer" opcional.
 *
 * Se queda unos 5 segundos (se pausa mientras el ratón o el foco están encima, para dar tiempo
 * a leerlo o a llegar al botón con el teclado) y se anuncia a los lectores de pantalla.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, RotateCcw, X } from 'lucide-react';

export interface ToastMessage {
  /** Identificador único: un id nuevo reinicia la cuenta atrás. */
  id: number;
  message: string;
  /** Si existe, se muestra el botón "Deshacer". */
  onUndo?: () => void;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
  /** Milisegundos visibles. */
  duration?: number;
}

export default function Toast({ toast, onClose, duration = 5000 }: ToastProps) {
  const [paused, setPaused] = useState<boolean>(false);
  const remaining = useRef<number>(duration);
  const startedAt = useRef<number>(0);

  // Cada aviso nuevo empieza la cuenta atrás desde el principio.
  useEffect(() => {
    remaining.current = duration;
    setPaused(false);
  }, [toast?.id, duration]);

  useEffect(() => {
    if (!toast || paused) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(onClose, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(1200, remaining.current - (Date.now() - startedAt.current));
    };
  }, [toast, paused, onClose]);

  // Se pinta en <body>: la vista lleva una animación de entrada con `transform` que haría que
  // `position: fixed` se calculase respecto a ella y no respecto a la ventana.
  return createPortal(
    // La región viva existe siempre para que el lector de pantalla anuncie el texto al cambiar.
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      {toast && (
        <div
          key={toast.id}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded border border-line-strong border-l-2 border-l-ok bg-raised py-2 pl-4 pr-2 shadow-[0_12px_32px_rgba(0,0,0,0.45)] animate-enter"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-body text-fg">{toast.message}</p>
          {toast.onUndo && (
            <button
              type="button"
              onClick={() => { toast.onUndo?.(); }}
              className="btn btn-ghost shrink-0 px-3 text-accent-strong"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Deshacer
            </button>
          )}
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon shrink-0" aria-label="Cerrar aviso" title="Cerrar aviso">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}
