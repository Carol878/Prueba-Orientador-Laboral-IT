/**
 * @file answerScore.ts
 * @description Puntuación orientativa de una respuesta del simulador de entrevista.
 *
 * No es una corrección real: mide cuántas ideas clave de la pregunta aparecen en la respuesta
 * (por palabras significativas) y si la respuesta tiene una extensión razonable.
 */

const STOPWORDS = new Set([
  'para', 'como', 'pero', 'porque', 'cuando', 'donde', 'entre', 'sobre', 'tiene', 'tienen', 'este', 'esta',
  'estos', 'estas', 'esos', 'esas', 'cada', 'otro', 'otra', 'otros', 'otras', 'muy', 'más', 'menos', 'sus',
  'una', 'unos', 'unas', 'del', 'los', 'las', 'que', 'con', 'sin', 'por', 'permite', 'hace', 'hacer'
]);

/** Minúsculas, sin tildes y sin signos: deja solo palabras comparables. */
function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(word => word.length >= 3 && !STOPWORDS.has(word));
}

/** Raíz aproximada (primeras 5 letras) para tolerar plurales y variaciones. */
const stem = (word: string): string => word.slice(0, 5);

export interface AnswerScore {
  /** 0–100. */
  score: number;
  /** Ideas clave que la respuesta menciona. */
  covered: string[];
  /** Ideas clave que faltan. */
  missing: string[];
}

export function scoreAnswer(answer: string, keyPoints: string[]): AnswerScore {
  const answerWords = normalize(answer);
  const answerStems = new Set(answerWords.map(stem));

  const covered: string[] = [];
  const missing: string[] = [];
  for (const point of keyPoints) {
    const keywords = [...new Set(normalize(point).map(stem))];
    const hits = keywords.filter(k => answerStems.has(k)).length;
    // Una idea cuenta como mencionada si aparece al menos un tercio de sus palabras clave (mínimo 1).
    if (keywords.length > 0 && hits >= Math.max(1, Math.ceil(keywords.length / 3))) {
      covered.push(point);
    } else {
      missing.push(point);
    }
  }

  const coverage = keyPoints.length > 0 ? covered.length / keyPoints.length : 0;
  const length = Math.min(1, answerWords.length / 40);
  const score = Math.round(15 + coverage * 65 + length * 20);

  return { score: Math.min(100, score), covered, missing };
}
