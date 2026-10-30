/**
 * @file ConsentDialog.tsx
 * @description Consentimiento antes del primer "Me interesa": qué se comparte con la empresa,
 * cuánto tiempo se guarda y cómo retirarlo. Usa `<dialog>` nativo (foco atrapado y Escape para cerrar).
 */

import { useEffect, useId, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

import type { JobOffer } from '../../types';

interface ConsentDialogProps {
  /** Oferta a la que se quiere mostrar interés (`null` = diálogo cerrado). */
  offer: JobOffer | null;
  busy: boolean;
  onAccept: (wantsFadSupport: boolean) => void;
  onCancel: () => void;
}

export default function ConsentDialog({ offer, busy, onAccept, onCancel }: ConsentDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [wantsFadSupport, setWantsFadSupport] = useState(false);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (offer && !dialog.open) dialog.showModal();
    if (!offer && dialog.open) dialog.close();
  }, [offer]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={event => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(36rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto p-0 bg-surface text-fg border border-line-strong border-t-2 border-t-accent rounded-dialog backdrop:bg-black/70"
    >
      {offer && (
        <form
          method="dialog"
          className="p-5 md:p-6"
          onSubmit={event => {
            event.preventDefault();
            onAccept(wantsFadSupport);
          }}
        >
          <h2 id={titleId} className="font-display font-bold text-xl leading-tight text-fg flex items-start gap-2">
            <ShieldCheck className="w-5 h-5 mt-0.5 text-accent shrink-0" aria-hidden="true" />
            Antes de enviar tu interés
          </h2>
          <p id={descId} className="text-sm text-fg-2 mt-2 leading-relaxed">
            Vas a decir a <strong className="text-fg">{offer.companyName}</strong> que te interesa el puesto de{' '}
            <strong className="text-fg">{offer.title}</strong>. Esto es lo que pasa con tus datos:
          </p>

          <ul className="mt-4 space-y-2 text-sm text-fg leading-relaxed list-disc pl-5">
            <li>
              La empresa verá tu perfil <strong>sin tu nombre, tu foto ni tu email</strong>: tu experiencia, lo que sabes, lo que estás
              aprendiendo, tu nivel de inglés y tu portfolio o proyecto si lo has puesto.
            </li>
            <li>Tu nombre y tu email solo se comparten si la empresa decide abrir el contacto contigo.</li>
            <li>Una persona de la empresa revisa siempre tu perfil: nadie te descarta de forma automática.</li>
            <li>Guardamos tu candidatura durante <strong>12 meses</strong> y después se borra.</li>
            <li>
              Puedes retirar una candidatura desde «Mis candidaturas» mientras la empresa no haya respondido, o pedir a Fad que borre tus
              datos cuando quieras.
            </li>
          </ul>

          <label className="mt-5 flex items-start gap-3 p-3 bg-raised border border-line-strong rounded text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={wantsFadSupport}
              onChange={event => setWantsFadSupport(event.target.checked)}
              className="mt-0.5 w-5 h-5 accent-[var(--color-accent)] shrink-0"
            />
            <span>
              <span className="font-semibold text-fg">Quiero que una orientadora de Fad me acompañe</span>
              <span className="block text-fg-2 mt-0.5">Es opcional. Te ayudará a preparar la entrevista y a resolver dudas.</span>
            </span>
          </label>

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={busy} className="btn btn-primary" autoFocus>
              Acepto y envío mi interés
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
