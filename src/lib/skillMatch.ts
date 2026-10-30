/**
 * @file skillMatch.ts
 * @description Decide si una tecnología marcada en el diagnóstico cubre un requisito del puesto.
 *
 * Se compara por palabras completas, no por subcadenas: así "Java" no cuenta como "JavaScript",
 * "Git/GitHub" sí cubre "Git" y "HTML/CSS" cubre "HTML5 & CSS3".
 */

/** Patrones de cada tecnología del diagnóstico sobre el texto del requisito. */
const SKILL_PATTERNS: Record<string, RegExp[]> = {
  'JavaScript': [/\bjavascript\b/],
  'TypeScript': [/\btypescript\b/],
  'React': [/\breact\b/],
  'Node.js': [/\bnode(\.js)?\b/],
  'Python': [/\bpython\b/],
  'Java': [/\bjava\b(?!script)/],
  'HTML/CSS': [/\bhtml/, /\bcss/],
  'SQL': [/\bsql\b/],
  'Git/GitHub': [/\bgit(hub)?\b/],
  'Docker': [/\bdocker\b/],
  'Tailwind CSS': [/\btailwind\b/],
  'Express': [/\bexpress\b/],
  'Spring Boot': [/\bspring\b/],
  'Figma': [/\bfigma\b/],
  'Power BI': [/\bpower ?bi\b/]
};

/** Patrón por defecto para tecnologías sin entrada propia: palabra completa, sin distinguir mayúsculas. */
function fallbackPattern(skill: string): RegExp {
  const escaped = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`);
}

/** `true` si alguna de las tecnologías marcadas cubre el requisito. */
export function coversRequirement(requirement: string, skills: string[]): boolean {
  const text = requirement.toLowerCase();
  return skills.some(skill =>
    (SKILL_PATTERNS[skill] ?? [fallbackPattern(skill)]).some(pattern => pattern.test(text))
  );
}
