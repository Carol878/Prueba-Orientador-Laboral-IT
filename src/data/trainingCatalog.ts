/**
 * @file trainingCatalog.ts
 * @description Tipos de los recursos de formación y perfiles objetivo del recomendador.
 *
 * Los cursos NO están en el código: la única fuente es la tabla `training_resources` de Supabase
 * (ver `supabase/training_resources.sql` y `trainingRepository.ts`).
 */

export type TrainingCategory =
  | 'frontend'
  | 'backend'
  | 'cloud_devops'
  | 'cybersecurity'
  | 'ai_data'
  | 'soft_skills';

/** Mismos valores que la columna "Precio" de la hoja de recursos. */
export type TrainingPriceType = 'subvencionado' | 'abierto' | 'mixto';

export type TrainingModality = 'Online' | 'Presencial' | 'Híbrido';
export type TrainingLanguage = 'Español' | 'Inglés' | 'Multilingüe';

export interface TrainingCourse {
  id: string;
  refCode: string;
  title: string;
  provider: string;
  category: TrainingCategory;
  priceType: TrainingPriceType;
  priceLabel: string;
  modality: TrainingModality;
  language: TrainingLanguage;
  targetRoles: string[];
  /** Habilidades que cubre; mismo vocabulario que `requirementSkills.ts`. */
  skillsCovered: string[];
  officialCertification: boolean;
  /** Quién respalda la certificación: el Estado (homologación oficial) o el fabricante. */
  certificationIssuer?: 'estatal' | 'fabricante';
  certificationName?: string;
  url: string;
  description: string;
}

export const PRICE_LABELS = {
  subvencionado: 'Subvencionado al 100 % (gratis para ti)',
  abierto: 'Gratis y abierto a todo el mundo',
  mixto: 'Una parte gratis y otra de pago'
} as const satisfies Record<TrainingPriceType, string>;

export type TrainingProfileId = 'plan' | 'all' | 'frontend' | 'backend_python' | 'cyber_ai' | 'zero';

export interface TrainingProfile {
  id: TrainingProfileId;
  label: string;
  requiredSkills: string[];
  /** Solo recursos sin coste (subvencionados o de acceso abierto). */
  freeOnly: boolean;
}

/** Objetivos fijos. El perfil "Según mi plan de acción" se construye en tiempo real con lo que le falta al joven. */
export const TRAINING_PROFILES: TrainingProfile[] = [
  { id: 'all', label: 'Ver todos los cursos', requiredSkills: [], freeOnly: false },
  {
    id: 'frontend',
    label: 'Desarrollo web (frontend)',
    requiredSkills: ['React', 'Vue', 'TypeScript', 'Tailwind', 'Git'],
    freeOnly: false
  },
  {
    id: 'backend_python',
    label: 'Programación de servidores con Python',
    requiredSkills: ['Python', 'SQL', 'PostgreSQL', 'APIs REST'],
    freeOnly: false
  },
  {
    id: 'cyber_ai',
    label: 'Ciberseguridad e IA responsable',
    requiredSkills: ['Redes', 'Seguridad', 'Ética IA', 'Gobernanza IA'],
    freeOnly: false
  },
  {
    id: 'zero',
    label: 'Empiezo desde cero (gratis)',
    requiredSkills: ['Fundamentos de programación', 'HTML/CSS', 'Competencias digitales', 'Empleabilidad'],
    freeOnly: true
  }
];

/** Equivalencias entre el stack del diagnóstico técnico y las skills del catálogo. */
const SKILL_ALIASES: Record<string, string> = {
  'Git/GitHub': 'Git',
  'Tailwind CSS': 'Tailwind'
};

export function normalizeSkill(skill: string): string {
  return SKILL_ALIASES[skill] ?? skill;
}
