/**
 * @file offerMatch.ts
 * @description Compara una oferta con el perfil de la persona: qué tiene, qué está aprendiendo y qué le falta.
 *
 * Al joven nunca se le muestra un porcentaje: se le dice "Cumples X de Y". Las condiciones
 * (turnos, carné…) no cuentan para ese recuento, porque las confirma la persona y no se pueden calcular.
 * "Lo estoy aprendiendo" cuenta como medio punto solo para ordenar las ofertas.
 */

import type { JobOffer, OfferRequirement } from '../types';
import { normalizeSkill } from '../data/trainingCatalog';
import { coversRequirement } from './skillMatch';

export type RequirementState = 'have' | 'learning' | 'missing' | 'condition';

export interface RequirementCheck {
  requirement: OfferRequirement;
  state: RequirementState;
}

export interface OfferFit {
  checks: RequirementCheck[];
  /** Requisitos imprescindibles de conocimiento (los que entran en "Cumples X de Y"). */
  essentialTotal: number;
  essentialHave: number;
  essentialLearning: number;
  /** Habilidades de catálogo de los requisitos que faltan (para buscar cursos). */
  missingSkills: string[];
  /** Puntuación para ordenar el listado de ofertas (0-1). */
  score: number;
}

export interface FitProfile {
  techStack: string[];
  learningSkills: string[];
  englishLevel?: string;
}

const ENGLISH_OK = new Set(['B1', 'B2', 'C1', 'C2']);

function requirementState(req: OfferRequirement, known: Set<string>, learning: Set<string>, profile: FitProfile): RequirementState {
  if (req.kind === 'condition') return 'condition';
  const hasEnglish = req.skills.includes('Inglés') && profile.englishLevel !== undefined && ENGLISH_OK.has(profile.englishLevel);
  if (hasEnglish || coversRequirement(req.label, profile.techStack) || req.skills.some(skill => known.has(skill))) return 'have';
  if (req.skills.some(skill => learning.has(skill))) return 'learning';
  return 'missing';
}

/** Estado de cada requisito de la oferta y recuento "Cumples X de Y". */
export function evaluateOffer(offer: JobOffer, profile: FitProfile): OfferFit {
  const known = new Set(profile.techStack.map(normalizeSkill));
  const learning = new Set(profile.learningSkills);
  const checks = offer.requirements.map(requirement => ({
    requirement,
    state: requirementState(requirement, known, learning, profile)
  }));

  const essential = checks.filter(c => c.requirement.essential && c.requirement.kind === 'knowledge');
  const essentialHave = essential.filter(c => c.state === 'have').length;
  const essentialLearning = essential.filter(c => c.state === 'learning').length;
  const missingSkills = [
    ...new Set(checks.filter(c => c.state === 'missing' || c.state === 'learning').flatMap(c => c.requirement.skills))
  ];
  // Lo que se está aprendiendo y lo que falta pero la empresa se compromete a enseñar valen medio punto.
  const trainableMissing = essential.filter(c => c.state === 'missing' && c.requirement.trainable).length;
  const score = essential.length === 0 ? 1 : (essentialHave + (essentialLearning + trainableMissing) * 0.5) / essential.length;

  return {
    checks,
    essentialTotal: essential.length,
    essentialHave,
    essentialLearning,
    missingSkills,
    score
  };
}

/** Texto para el joven: "Cumples 3 de 5" (+ "y aprendes 1"). */
export function fitLabel(fit: OfferFit): string {
  if (fit.essentialTotal === 0) return 'Sin conocimientos imprescindibles';
  const base = `Cumples ${fit.essentialHave} de ${fit.essentialTotal}`;
  return fit.essentialLearning > 0 ? `${base} · aprendiendo ${fit.essentialLearning}` : base;
}

/** `true` si la oferta sigue abierta y no ha pasado su fecha de cierre. */
export function isOfferActive(offer: JobOffer, today = new Date().toISOString().slice(0, 10)): boolean {
  return offer.status === 'open' && offer.closesAt >= today;
}

/** Ofertas parecidas (mismo sector o requisitos en común), para acompañar una respuesta negativa. */
export function similarOffers(offer: JobOffer, pool: JobOffer[], limit = 3): JobOffer[] {
  const skills = new Set(offer.requirements.flatMap(r => r.skills));
  return pool
    .filter(o => o.id !== offer.id && isOfferActive(o))
    .map(o => ({
      offer: o,
      shared: o.requirements.filter(r => r.skills.some(s => skills.has(s))).length + (o.sector === offer.sector ? 1 : 0)
    }))
    .filter(item => item.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, limit)
    .map(item => item.offer);
}
