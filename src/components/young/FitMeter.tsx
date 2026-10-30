/**
 * @file FitMeter.tsx
 * @description Medidor segmentado de encaje: un segmento por requisito (lo tengo / lo estoy aprendiendo /
 * me falta) con el recuento escrito debajo. Nunca muestra porcentajes: solo "X de Y".
 */

export type FitSegmentState = 'have' | 'learning' | 'missing';

interface FitMeterProps {
  /** Estado de cada requisito, en el orden en que se quieren pintar. */
  segments: FitSegmentState[];
  /** Texto visible bajo la barra, p. ej. "Cumples 2 de 3". */
  label: string;
  /** Texto más completo para lectores de pantalla (por defecto, `label`). */
  ariaLabel?: string;
  className?: string;
}

/** Ordena los estados para que la barra se lea de izquierda a derecha: lo que tienes, lo que aprendes y lo que falta. */
export function sortSegments(states: FitSegmentState[]): FitSegmentState[] {
  const order: Record<FitSegmentState, number> = { have: 0, learning: 1, missing: 2 };
  return [...states].sort((a, b) => order[a] - order[b]);
}

export default function FitMeter({ segments, label, ariaLabel, className = '' }: FitMeterProps) {
  return (
    <div className={className}>
      <div className="meter" role="img" aria-label={ariaLabel ?? label}>
        {segments.map((state, index) => (
          <span key={index} className="meter-seg" data-state={state} />
        ))}
      </div>
      <p className="mt-1.5 text-body font-semibold text-fg nums" aria-hidden="true">
        {label}
      </p>
    </div>
  );
}
