/**
 * @file offerText.ts
 * @description Formatos y textos compartidos por las tarjetas de ofertas y "Mis candidaturas".
 */

import type { CandidateProfile, JobOffer, OfferRequirement } from '../../types';
import type { TrainingCourse } from '../../data/trainingCatalog';
import type { OfferFit } from '../../lib/offerMatch';
import { recommendCourses } from '../../lib/courseRecommendations';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' });

/** "21.000 € – 24.000 € brutos al año". */
export function formatSalary(offer: JobOffer): string {
  const range =
    offer.salaryMin === offer.salaryMax
      ? euros.format(offer.salaryMin)
      : `${euros.format(offer.salaryMin)} – ${euros.format(offer.salaryMax)}`;
  return `${range} brutos al año`;
}

/** "24 de noviembre" a partir de AAAA-MM-DD. */
export function formatDay(isoDate: string): string {
  const date = new Date(isoDate.length === 10 ? `${isoDate}T00:00:00` : isoDate);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

/** Palabras del título que indican cada puesto del simulador de entrevista. */
const ROLE_HINTS: Record<string, string[]> = {
  frontend: ['frontend', 'front-end', 'web'],
  backend: ['backend', 'back-end'],
  fullstack: ['fullstack', 'full stack', 'full-stack'],
  data: ['datos', 'data', 'analista', 'bi'],
  qa: ['qa', 'pruebas', 'tester']
};

/** Puesto del simulador más parecido a la oferta (o `null` si no hay ninguno). */
export function roleKeyForOffer(offer: JobOffer): string | null {
  const title = offer.title.toLowerCase();
  // fullstack antes que frontend/backend para no confundir "fullstack" con "web".
  for (const key of ['fullstack', 'backend', 'frontend', 'data', 'qa']) {
    if (ROLE_HINTS[key].some(hint => new RegExp(`\\b${hint}\\b`).test(title))) return key;
  }
  return null;
}

/** El mejor curso del catálogo para un requisito concreto. */
export function courseForRequirement(courses: TrainingCourse[], requirement: OfferRequirement): TrainingCourse | null {
  if (requirement.skills.length === 0) return null;
  return recommendCourses(courses, [{ requirement: requirement.label, skills: requirement.skills }], 1)[0]?.course ?? null;
}

/** De 1 a `limit` cursos para lo que falta o se está aprendiendo de una oferta. */
export function coursesForOffer(courses: TrainingCourse[], fit: OfferFit, limit = 3): TrainingCourse[] {
  const gaps = fit.checks
    .filter(check => check.state === 'missing' || check.state === 'learning')
    .map(check => ({ requirement: check.requirement.label, skills: check.requirement.skills }))
    .filter(gap => gap.skills.length > 0);
  return recommendCourses(courses, gaps, limit).map(rec => rec.course);
}

/** Razones, en lenguaje claro, de por qué aparece esta oferta. */
export function whyThisOffer(offer: JobOffer, fit: OfferFit, targetRole: string): string[] {
  const reasons: string[] = [];
  if (roleKeyForOffer(offer) === targetRole) reasons.push('Se parece al puesto que nos dijiste que buscas.');
  if (fit.essentialTotal > 0 && fit.essentialHave > 0) {
    reasons.push(`Ya tienes ${fit.essentialHave} de los ${fit.essentialTotal} conocimientos imprescindibles.`);
  }
  if (fit.essentialLearning > 0) reasons.push(`Estás aprendiendo ${fit.essentialLearning} de los que piden.`);
  const taught = fit.checks.filter(c => c.state === 'missing' && c.requirement.trainable).length;
  if (taught > 0) reasons.push(`La empresa te enseña ${taught === 1 ? 'una cosa' : `${taught} cosas`} de las que aún te faltan.`);
  if (offer.openToNewcomers) reasons.push('Está abierta a perfiles que empiezan o cambian de sector.');
  reasons.push('Te enseñamos todas las ofertas abiertas, empezando por las que más se parecen a tu perfil.');
  return reasons;
}

/** Mensaje de presentación ya redactado para cuando la empresa abre el contacto. */
export function introMessage(offer: JobOffer, candidate: CandidateProfile): { subject: string; body: string } {
  const lastJob = candidate.workExperience[0];
  const lines = [
    `Hola, equipo de ${offer.companyName}:`,
    '',
    `Soy ${candidate.name || '[tu nombre]'}. Gracias por abrir el contacto conmigo a través de Fad Juventud para el puesto de ${offer.title}.`,
    ''
  ];
  if (lastJob?.role) {
    lines.push(
      `He trabajado como ${lastJob.role}${lastJob.sector ? ` en ${lastJob.sector}` : ''}${
        lastJob.years ? ` (${lastJob.years} ${lastJob.years === 1 ? 'año' : 'años'})` : ''
      }${lastJob.tasks ? `, donde me encargaba de ${lastJob.tasks}` : ''}.`
    );
  }
  if (candidate.techStack.length > 0) lines.push(`Manejo ${candidate.techStack.slice(0, 6).join(', ')}.`);
  if (candidate.mainProject) lines.push(`Mi proyecto principal: ${candidate.mainProject}.`);
  if (candidate.portfolioUrl) lines.push(`Podéis ver mi trabajo aquí: ${candidate.portfolioUrl}`);
  // Sin datos del perfil no se deja un hueco doble en el mensaje.
  if (lines[lines.length - 1] !== '') lines.push('');
  lines.push(
    '¿Os vendría bien que habláramos esta semana? Me adapto a vuestro horario.',
    '',
    'Un saludo,',
    candidate.name || '[tu nombre]'
  );
  return { subject: `Candidatura: ${offer.title} (Fad Juventud)`, body: lines.join('\n') };
}
