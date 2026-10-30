/**
 * @file ConfirmDialog.tsx
 * @description Confirmación con `<dialog>` nativo en lugar de `window.confirm` (mismo estilo que el resto
 * de diálogos). Se monta solo cuando hace falta: atrapa el foco, se cierra con Escape y lo devuelve al cerrar.
 */

import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  /** `danger` para acciones destructivas o que dejan de mostrar algo a las personas candidatas. */
  tone?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, children, confirmLabel, tone = 'primary', onConfirm, onCancel }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      opener?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={e => { e.preventDefault(); onCancel(); }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] p-0 bg-surface text-fg border border-line-strong rounded-dialog"
    >
      <div className="p-6">
        <h3 id={titleId} className="font-display font-bold text-title text-fg mb-2">{title}</h3>
        <div id={descriptionId} className="text-body text-fg-2">{children}</div>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6">
          <button type="button" onClick={onCancel} className="btn btn-secondary" autoFocus>Cancelar</button>
          <button type="button" onClick={onConfirm} className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
