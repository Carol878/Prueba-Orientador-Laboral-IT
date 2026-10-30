/**
 * @file VuMeter.tsx
 * @description Indicador segmentado de afinidad o cobertura (10 segmentos), en lugar de una barra de carga.
 */

interface VuMeterProps {
  /** Porcentaje de 0 a 100. */
  value: number;
  /** Texto que acompaña al porcentaje, p. ej. "de afinidad". */
  label: string;
  tone?: 'accent' | 'ok' | 'gap';
}

const SEGMENTS = 10;

const TONE_CLASSES: Record<NonNullable<VuMeterProps['tone']>, { on: string; text: string }> = {
  accent: { on: 'bg-accent', text: 'text-accent-strong' },
  ok: { on: 'bg-ok', text: 'text-ok' },
  gap: { on: 'bg-gap', text: 'text-gap' }
};

export default function VuMeter({ value, label, tone = 'accent' }: VuMeterProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const lit = Math.round((pct / 100) * SEGMENTS);
  const colors = TONE_CLASSES[tone];

  return (
    <div className="flex items-center gap-3" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
      <div className="flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span key={i} className={`h-3 w-2 rounded-sm ${i < lit ? colors.on : 'bg-line-strong'}`} />
        ))}
      </div>
      <span className={`font-sans text-[0.85rem] font-semibold tabular-nums ${colors.text}`}>
        {pct}% {label}
      </span>
    </div>
  );
}
