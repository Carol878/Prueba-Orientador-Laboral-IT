/**
 * @file OffersNotice.tsx
 * @description Aviso de Inicio cuando hay respuestas de empresas que la persona aún no ha visto.
 */

import { ArrowRight, Bell } from 'lucide-react';

interface OffersNoticeProps {
  count: number;
  onOpen: () => void;
}

export default function OffersNotice({ count, onOpen }: OffersNoticeProps) {
  if (count <= 0) return null;
  return (
    <section
      role="status"
      className="mb-8 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-cert-soft border border-cert/30 border-l-2 border-l-cert rounded"
    >
      <p className="flex items-start gap-2 text-body text-fg">
        <Bell className="w-4 h-4 mt-0.5 text-cert shrink-0" aria-hidden="true" />
        <span>
          <strong>{count === 1 ? 'Tienes 1 novedad' : `Tienes ${count} novedades`}</strong> en tus candidaturas. Entra para ver qué te han
          respondido.
        </span>
      </p>
      <button type="button" onClick={onOpen} className="btn btn-primary shrink-0">
        Ver mis candidaturas
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </section>
  );
}
