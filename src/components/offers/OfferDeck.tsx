/**
 * @file OfferDeck.tsx
 * @description Pila de ofertas: se ve una cada vez y se decide con la barra de botones fija
 * ("Ahora no" · "Guardar" · "Me interesa"), con el teclado (← ↓ → y Z para deshacer) o,
 * si se quiere, arrastrando la tarjeta a un lado. Sin efectos 3D y respetando `prefers-reduced-motion`.
 *
 * La barra ocupa una sola fila de unos 56 px: en móvil cada botón lleva el icono sobre una etiqueta
 * corta. Con poca altura (móvil en horizontal o zoom al 200 %) deja de ser fija para no tapar la oferta.
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

/** Botones de decisión: icono sobre la etiqueta en móvil; en fila desde 640 px. */
const BAR_BUTTON = 'flex-1 min-w-0 flex-col gap-0.5 px-1 text-meta sm:flex-row sm:gap-2 sm:px-4 sm:text-control';

const DECISIONS: Array<{ decision: OfferDecision; label: string; icon: typeof X; key: string }> = [
  { decision: 'skipped', label: 'Ahora no', icon: X, key: 'ArrowLeft' },
  { decision: 'saved', label: 'Guardar', icon: Bookmark, key: 'ArrowDown' },
  { decision: 'interested', label: 'Me interesa', icon: Send, key: 'ArrowRight' }
];

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
      <p className="text-body text-fg-2 mb-3 nums" aria-live="polite">
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

      <p className="text-meta text-fg-2 mt-3 hidden md:block">
        Atajos de teclado: ← Ahora no · ↓ Guardar · → Me interesa · Z Deshacer. También puedes arrastrar la tarjeta a un lado.
      </p>

      {/* Barra de decisión fija abajo: una fila de 56 px. Sin fijar si la pantalla es muy baja. */}
      <div
        className={
          'sticky bottom-0 z-10 mt-4 -mx-4 px-4 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] ' +
          'md:mx-0 md:px-1.5 md:pb-1.5 bg-surface border-t border-line-strong md:border md:rounded ' +
          '[@media(max-height:480px)]:static'
        }
        role="group"
        aria-label={`Decidir sobre la oferta ${current.offer.title}`}
      >
        <div className="flex items-stretch gap-1.5">
          {DECISIONS.map(item => (
            <button
              key={item.decision}
              type="button"
              onClick={() => onDecide(current.offer, item.decision)}
              disabled={disabled}
              aria-keyshortcuts={item.key}
              className={`btn ${item.decision === 'interested' ? 'btn-primary' : 'btn-secondary'} ${BAR_BUTTON}`}
            >
              <item.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onUndo}
            disabled={disabled || !canUndo}
            className="btn btn-ghost btn-icon shrink-0"
            aria-label="Deshacer la última decisión"
            aria-keyshortcuts="Z"
            title="Deshacer (Z)"
          >
            <Undo2 className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
