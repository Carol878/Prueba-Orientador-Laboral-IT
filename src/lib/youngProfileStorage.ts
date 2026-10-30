/**
 * @file youngProfileStorage.ts
 * @description Guarda en este navegador el perfil del diagnóstico de cada joven (por email),
 * para que no se pierda al recargar la página y se pueda enviar a las empresas con "Me interesa".
 */

import type { WorkExperience } from '../types';

export interface StoredYoungProfile {
  profileType: 'junior' | 'reskill' | null;
  targetRole: string;
  /** Tecnologías y habilidades generales (Excel, atención al cliente…) que ya domina. */
  techStack: string[];
  /** Habilidades del catálogo que está aprendiendo ahora. */
  learningSkills: string[];
  englishLevel: string;
  experienceMonths: string;
  mainBlocker: string;
  workExperience: WorkExperience[];
  portfolioUrl: string;
  mainProject: string;
  /** Ha evaluado al menos una respuesta en el simulador de entrevista. */
  practicedInterview: boolean;
}

export const DEFAULT_YOUNG_PROFILE: StoredYoungProfile = {
  profileType: null,
  targetRole: 'frontend',
  techStack: [],
  learningSkills: [],
  englishLevel: 'B1',
  experienceMonths: '0-6',
  mainBlocker: 'cv',
  workExperience: [],
  portfolioUrl: '',
  mainProject: '',
  practicedInterview: false
};

const storageKey = (email: string): string => `young_profile_v1:${email.trim().toLowerCase()}`;

/** Perfil guardado de esta persona (o el perfil por defecto si no hay nada guardado). */
export function loadYoungProfile(email: string): StoredYoungProfile {
  try {
    const raw = localStorage.getItem(storageKey(email));
    return raw ? { ...DEFAULT_YOUNG_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_YOUNG_PROFILE };
  } catch (error) {
    console.error('[perfil] No se ha podido leer el perfil guardado:', error);
    return { ...DEFAULT_YOUNG_PROFILE };
  }
}

export function saveYoungProfile(email: string, profile: StoredYoungProfile): void {
  try {
    localStorage.setItem(storageKey(email), JSON.stringify(profile));
  } catch (error) {
    console.error('[perfil] No se ha podido guardar el perfil:', error);
  }
}
