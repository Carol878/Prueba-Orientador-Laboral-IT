/**
 * @file OfferDeck.tsx
 * @description Pila de ofertas: se ve una cada vez y se decide con la barra de botones fija
 * ("Ahora no" · "Guardar" · "Me interesa"), con el teclado (← ↓ → y Z para deshacer) o,
 * si se quiere, arrastrando la tarjeta a un lado. Sin efectos 3D y respetando `prefers-reduced-motion`.
 */

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Bookmark, Send, Undo2, X } from 'lucide-react';

import type { JobOffer, OfferDecision } from '../../types';
import type { TrainingCourse } from '../../data/trainingCatalog';
import type { OfferFit } from '../../lib/offerMatch';
import OfferCard from './OfferCard';

export interface RankedOffer {
  offer: JobOffer;
  fit: OfferFit;
}

interface OfferDeckProps {
  current: RankedOffer;
  /** Ofertas que quedan por ver (incluida la actual). */
  remaining: number;
  courses: TrainingCourse[];
  targetRole: string;
  canUndo: boolean;
  /** Bloquea botones y teclado (p. ej. con el diálogo de consentimiento abierto o guardando). */
  disabled: boolean;
  onDecide: (offer: JobOffer, decision: OfferDecision) => void;
  onUndo: () => void;
  onToggleLearning: (skills: string[], learning: boolean) => void;
}

/** Distancia (px) a partir de la cual soltar la tarjeta cuenta como decisión. */
const DRAG_THRESHOLD = 120;

/** `true` si el evento de teclado viene de un campo donde se escribe. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export default function OfferDeck({
  current,
  remaining,
  courses,
  targetRole,
  canUndo,
  disabled,
  onDecide,
  onUndo,
  onToggleLearning
}: OfferDeckProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startX: number; startY: number; id: number; active: boolean } | null>(null);

  // Atajos de teclado. Se ignoran mientras se escribe, con teclas modificadoras o si hay un diálogo abierto.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (disabled || event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;
      if (document.querySelector('dialog[open]')) return;
      const actions: Record<string, () => void> = {
        ArrowLeft: () => onDecide(current.offer, 'skipped'),
        ArrowDown: () => onDecide(current.offer, 'saved'),
        ArrowRight: () => onDecide(current.offer, 'interested'),
        z: () => canUndo && onUndo(),
        Z: () => canUndo && onUndo()
      };
      const action = actions[event.key];
      if (!action) return;
      event.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, disabled, canUndo, onDecide, onUndo]);

  // Arrastre horizontal opcional. No empieza sobre enlaces, botones ni el desplegable de detalles.
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    if ((event.target as HTMLElement).closest('a, button, summary, input, textarea, select, details[open] > div')) return;
    drag.current = { startX: event.clientX, startY: event.clientY, id: event.pointerId, active: false };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (!state.active) {
      // Solo se convierte en arrastre si el gesto es claramente horizontal (si no, es scroll o selección).
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
      state.active = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setDragX(dx);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    drag.current = null;
    if (!state?.active) return;
    const dx = event.clientX - state.startX;
    setDragging(false);
    setDragX(0);
    if (dx > DRAG_THRESHOLD) onDecide(current.offer, 'interested');
    else if (dx < -DRAG_THRESHOLD) onDecide(current.offer, 'skipped');
  };

  const cancelDrag = () => {
    drag.current = null;
    setDragging(false);
    setDragX(0);
  };

  const hint = dragX > DRAG_THRESHOLD / 2 ? 'Me interesa' : dragX < -DRAG_THRESHOLD / 2 ? 'Ahora no' : null;

  return (
    <div>
      <p className="text-sm text-fg-2 mb-3" aria-live="polite">
        {remaining === 1 ? 'Queda 1 oferta por ver.' : `Quedan ${remaining} ofertas por ver.`}
      </p>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={cancelDrag}
        className="relative touch-pan-y"
        style={{
          transform: dragX ? `translateX(${dragX}px)` : undefined,
          transition: dragging || reducedMotion ? 'none' : 'transform 200ms cubic-bezier(0.23, 1, 0.32, 1)',
          userSelect: dragging ? 'none' : undefined
        }}
      >
        {hint && (
          <span
            className={`absolute top-3 z-10 badge-technical ${
              dragX > 0 ? 'right-3 text-ok border-ok' : 'left-3 text-fg border-line-strong'
            }`}
            aria-hidden="true"
          >
            {hint}
          </span>
        )}
        <div key={current.offer.id} className="animate-enter">
          <OfferCard
            offer={current.offer}
            fit={current.fit}
            courses={courses}
            targetRole={targetRole}
            onToggleLearning={onToggleLearning}
          />
        </div>
      </div>

      <p className="text-xs text-fg-2 mt-3 hidden md:block">
        Atajos de teclado: ← Ahora no · ↓ Guardar · → Me interesa · Z Deshacer. También puedes arrastrar la tarjeta a un lado.
      </p>

      {/* Barra de decisión fija abajo: siempre visible, también con el zoom al 200 %. */}
      <div
        className="sticky bottom-0 z-10 mt-4 -mx-4 px-4 py-3 md:mx-0 md:px-3 bg-surface border-t border-line-strong md:border md:rounded"
        role="group"
        aria-label={`Decidir sobre la oferta ${current.offer.title}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => onDecide(current.offer, 'skipped')} disabled={disabled} className="btn btn-secondary flex-1">
            <X className="w-4 h-4" aria-hidden="true" />
            Ahora no
          </button>
          <button type="button" onClick={() => onDecide(current.offer, 'saved')} disabled={disabled} className="btn btn-secondary flex-1">
            <Bookmark className="w-4 h-4" aria-hidden="true" />
            Guardar
          </button>
          <button type="button" onClick={() => onDecide(current.offer, 'interested')} disabled={disabled} className="btn btn-primary flex-1">
            <Send className="w-4 h-4" aria-hidden="true" />
            Me interesa
          </button>
          <button
            type="button"
            onClick={onUndo}
            disabled={disabled || !canUndo}
            className="btn btn-secondary px-3"
            aria-label="Deshacer la última decisión"
            title="Deshacer (Z)"
          >
            <Undo2 className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Deshacer</span>
          </button>
        </div>
      </div>
    </div>
  );
}
