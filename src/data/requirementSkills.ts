/**
 * @file requirementSkills.ts
 * @description Traduce cada requisito imprescindible del plan de acción (`ROLE_DATABASE.mustHave`)
 * a las habilidades con las que están etiquetados los cursos (`training_resources.skills`).
 *
 * Es el "puente" entre el plan y la base de datos: si se añade o cambia un requisito en
 * `mockData.ts`, hay que añadirlo aquí; si se crea una habilidad nueva, hay que usar el mismo
 * texto exacto en la columna `skills` de Supabase.
 */

export const REQUIREMENT_SKILLS: Record<string, string[]> = {
  // Frontend
  'JavaScript (ES6+)': ['JavaScript'],
  'React / Vue / Angular': ['React', 'Vue'],
  'HTML5 & CSS3': ['HTML/CSS'],
  'Git': ['Git'],
  'Diseño responsive (adaptado a móvil)': ['Diseño responsive', 'HTML/CSS'],

  // Backend
  'Node.js / Python / Java': ['Node.js', 'Python', 'Java'],
  'SQL / bases de datos relacionales': ['SQL', 'PostgreSQL'],
  'APIs REST': ['APIs REST'],
  'Autenticación de usuarios (JWT)': ['APIs REST', 'Seguridad'],

  // Fullstack
  'JavaScript / TypeScript': ['JavaScript', 'TypeScript'],
  'React u otro framework de frontend': ['React', 'Vue'],
  'Node.js u otro lenguaje de servidor': ['Node.js', 'Python', 'Java'],
  'SQL / NoSQL': ['SQL', 'NoSQL'],

  // Data
  'SQL avanzado': ['SQL'],
  'Python (Pandas, NumPy)': ['Python', 'Ciencia de datos'],
  'PowerBI / Tableau': ['Visualización de datos'],
  'Excel avanzado': ['Excel'],
  'Estadística básica': ['Estadística'],

  // QA
  'Metodología de pruebas': ['Testing'],
  'JavaScript / Python': ['JavaScript', 'Python'],
  'Cypress / Selenium': ['Testing'],
  'Postman / pruebas de APIs': ['Testing', 'APIs REST']
};

/** Habilidades de catálogo asociadas a un requisito del plan (vacío si no hay equivalencia). */
export function skillsForRequirement(requirement: string): string[] {
  const skills = REQUIREMENT_SKILLS[requirement];
  if (!skills && import.meta.env?.DEV) {
    console.warn(`[formación] El requisito "${requirement}" no tiene habilidades asociadas en requirementSkills.ts`);
  }
  return skills ?? [];
}
