/**
 * @file ProviderMonogram.tsx
 * @description Ancla visual de la entidad que imparte un curso: sus iniciales en un cuadrado de 32 px
 * con un tono derivado del nombre (siempre el mismo para la misma entidad). Sin logos ni favicons externos.
 */

/** Tonos neutros o informativos del sistema. Sin ámbar (es "te falta") ni coral (es error). */
const TONES = ['--color-accent', '--color-cert', '--color-brand', '--color-stage-interview', '--color-fg-2'];

const STOPWORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'para', 'en', 'd', 'l']);

/** "Servicio Público de Empleo Estatal (SEPE)" → "SE"; "Khan Academy" → "KA"; "freeCodeCamp" → "FC". */
export function providerInitials(name: string): string {
  const acronym = name.match(/\(([A-ZÁÉÍÓÚÑ]{2,})\)/)?.[1];
  if (acronym) return acronym.slice(0, 2);
  const words = name
    .replace(/\(.*?\)/g, ' ')
    .split(/[\s'’.-]+/)
    .filter(word => word && !STOPWORDS.has(word.toLowerCase()));
  if (words.length === 0) return '·';
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const word = words[0];
  // Una sola palabra: la primera letra y la siguiente mayúscula (freeCodeCamp, edX) o la segunda letra.
  const nextCapital = word.slice(1).match(/[A-ZÁÉÍÓÚÑ]/)?.[0];
  return nextCapital ? (word[0] + nextCapital).toUpperCase() : word[0].toUpperCase() + word.slice(1, 2).toLowerCase();
}

function toneFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

export default function ProviderMonogram({ name }: { name: string }) {
  const tone = `var(${toneFor(name)})`;
  return (
    <span
      aria-hidden="true"
      className="w-8 h-8 shrink-0 grid place-items-center rounded border font-display font-bold text-caption"
      style={{
        color: tone,
        backgroundColor: `color-mix(in srgb, ${tone} 12%, transparent)`,
        borderColor: `color-mix(in srgb, ${tone} 40%, transparent)`
      }}
    >
      {providerInitials(name)}
    </span>
  );
}
