/**
 * @file FunnelBar.tsx
 * @description Barra segmentada con el reparto de candidaturas de una vacante por etapa del embudo
 * (sin responder → contacto → entrevista → contratada, más descartadas), con los colores `stage-*`.
 *
 * El color no basta: la barra lleva `aria-label` con todas las cifras y, si se pide, una leyenda visible.
 */

import type { Application } from '../../types';
import { APPLICATION_STATUS_FILL, FUNNEL_ORDER, FUNNEL_SHORT_LABELS, countByStatus } from './companyUtils';

interface FunnelBarProps {
  applications: Application[];
  /** Muestra la leyenda con las cifras debajo de la barra. */
  legend?: boolean;
  className?: string;
}

export default function FunnelBar({ applications, legend = true, className = '' }: FunnelBarProps) {
  const counts = countByStatus(applications);
  const total = applications.length;
  const summary = total === 0
    ? 'Sin candidaturas todavía'
    : FUNNEL_ORDER.map(status => `${FUNNEL_SHORT_LABELS[status]}: ${counts[status]}`).join(', ');

  return (
    <div className={className}>
      <div
        role="img"
        aria-label={`Reparto de ${total} ${total === 1 ? 'candidatura' : 'candidaturas'}. ${summary}.`}
        className="flex h-2 w-full gap-[2px] overflow-hidden rounded-sm bg-line"
      >
        {total > 0 &&
          FUNNEL_ORDER.filter(status => counts[status] > 0).map(status => (
            <span
              key={status}
              className={`${APPLICATION_STATUS_FILL[status]} h-full`}
              style={{ flexGrow: counts[status], flexBasis: 0 }}
            />
          ))}
      </div>

      {legend && total > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-meta text-fg-2" aria-hidden="true">
          {FUNNEL_ORDER.map(status => (
            <li key={status} className={`flex items-center gap-1.5 ${counts[status] === 0 ? 'text-fg-3' : ''}`}>
              <span className={`h-2 w-2 rounded-sm ${counts[status] === 0 ? 'bg-line-strong' : APPLICATION_STATUS_FILL[status]}`} />
              {FUNNEL_SHORT_LABELS[status]}
              <span className="nums text-fg">{counts[status]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
