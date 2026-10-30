/**
 * @file companyUtils.ts
 * @description Textos y cálculos compartidos por el panel de empresas (vacantes, candidaturas e impacto).
 */

import type { Application, ApplicationStatus, CandidateProfile, JobOffer, OfferStatus } from '../../types';
import { evaluateOffer } from '../../lib/offerMatch';
import type { OfferFit, RequirementCheck } from '../../lib/offerMatch';

/** Estado de la vacante tal y como lo ve la empresa. */
export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  open: 'Abierta',
  paused: 'Pausada',
  closed: 'Cerrada'
};

/** Estado de la candidatura en el proceso de selección. */
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Sin responder',
  contact_open: 'Contacto abierto',
  interview: 'Entrevista',
  hired: 'Contratada',
  declined: 'Descartada'
};

/**
 * Clases de color de cada estado de candidatura: la escala del embudo (`stage-*`), no los colores de aviso.
 * El descarte va apagado: es un resultado del proceso, no un error.
 */
export const APPLICATION_STATUS_TONE: Record<ApplicationStatus, string> = {
  pending: 'border-stage-pending/45 text-stage-pending bg-stage-pending/10',
  contact_open: 'border-stage-contact/45 text-stage-contact bg-stage-contact/10',
  interview: 'border-stage-interview/45 text-stage-interview bg-stage-interview/10',
  hired: 'border-stage-hired/45 text-stage-hired bg-stage-hired/10',
  declined: 'border-stage-declined/45 text-stage-declined bg-stage-declined/10'
};

/** Fondo sólido de cada etapa (segmentos del embudo y puntos de la leyenda). */
export const APPLICATION_STATUS_FILL: Record<ApplicationStatus, string> = {
  pending: 'bg-stage-pending',
  contact_open: 'bg-stage-contact',
  interview: 'bg-stage-interview',
  hired: 'bg-stage-hired',
  declined: 'bg-stage-declined'
};

/** Orden del embudo de izquierda a derecha (el descarte, al final). */
export const FUNNEL_ORDER: ApplicationStatus[] = ['pending', 'contact_open', 'interview', 'hired', 'declined'];

/** Etiqueta corta de cada etapa para leyendas y gráficas. */
export const FUNNEL_SHORT_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Sin responder',
  contact_open: 'Contacto',
  interview: 'Entrevista',
  hired: 'Contratada',
  declined: 'Descartada'
};

/** Número de candidaturas en cada estado. */
export function countByStatus(apps: Application[]): Record<ApplicationStatus, number> {
  const counts: Record<ApplicationStatus, number> = { pending: 0, contact_open: 0, interview: 0, hired: 0, declined: 0 };
  apps.forEach(a => { counts[a.status] += 1; });
  return counts;
}

export const EXPERIENCE_MONTHS_LABELS: Record<string, string> = {
  '0-6': '0–6 meses en el sector',
  '6-12': '6–12 meses en el sector',
  '12+': 'Más de 1 año en el sector'
};

/** El contacto está abierto (y por tanto se pueden ver nombre y email). */
export function isContactOpen(app: Application): boolean {
  return app.status === 'contact_open' || app.status === 'interview' || app.status === 'hired';
}

/** Referencia anónima y estable de la candidatura ("Candidatura A3F2"). */
export function anonymousRef(app: Application): string {
  const clean = app.id.replace(/[^a-z0-9]/gi, '');
  return clean.slice(-4).toUpperCase();
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatSalary(offer: Pick<JobOffer, 'salaryMin' | 'salaryMax'>): string {
  const fmt = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 0 });
  return offer.salaryMin === offer.salaryMax
    ? `${fmt(offer.salaryMin)} € brutos/año`
    : `${fmt(offer.salaryMin)} – ${fmt(offer.salaryMax)} € brutos/año`;
}

/** Versión corta para listados: "19.000–21.000 €/año". */
export function formatSalaryShort(offer: Pick<JobOffer, 'salaryMin' | 'salaryMax'>): string {
  const fmt = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 0 });
  return offer.salaryMin === offer.salaryMax
    ? `${fmt(offer.salaryMin)} €/año`
    : `${fmt(offer.salaryMin)}–${fmt(offer.salaryMax)} €/año`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.max(0, (new Date(toIso).getTime() - new Date(fromIso).getTime()) / DAY_MS);
}

/** Candidatura sin responder que ya ha superado los días de respuesta comprometidos. */
export function isOverdue(app: Application, offer: JobOffer, now = new Date()): boolean {
  return app.status === 'pending' && daysBetween(app.createdAt, now.toISOString()) > offer.responseDays;
}

/** Lo que tiene, lo que está aprendiendo y lo que le falta, agrupado por requisito. */
export interface CandidateFitSummary {
  fit: OfferFit;
  have: string[];
  learning: string[];
  missing: string[];
  /** Requisitos que faltan pero la empresa se compromete a enseñar. */
  missingTrainable: string[];
  conditions: string[];
}

export function summarizeFit(offer: JobOffer, candidate: CandidateProfile): CandidateFitSummary {
  const fit = evaluateOffer(offer, candidate);
  // Los requisitos deseables se marcan para no confundirlos con los imprescindibles.
  const text = (c: RequirementCheck) => (c.requirement.essential ? c.requirement.label : `${c.requirement.label} (deseable)`);
  const pick = (match: (c: RequirementCheck) => boolean) => fit.checks.filter(match).map(text);
  return {
    fit,
    have: pick(c => c.state === 'have'),
    learning: pick(c => c.state === 'learning'),
    missing: pick(c => c.state === 'missing' && !c.requirement.trainable),
    missingTrainable: pick(c => c.state === 'missing' && c.requirement.trainable),
    conditions: pick(c => c.state === 'condition')
  };
}

/** Texto para la empresa: "Cumple 3 de 5 imprescindibles". */
export function companyFitLabel(fit: OfferFit): string {
  if (fit.essentialTotal === 0) return 'Sin conocimientos imprescindibles';
  const base = `Cumple ${fit.essentialHave} de ${fit.essentialTotal} imprescindibles`;
  return fit.essentialLearning > 0 ? `${base} · aprendiendo ${fit.essentialLearning}` : base;
}

/** Resumen de una línea de la experiencia laboral (puesto · sector · años). */
export function experienceLine(candidate: CandidateProfile): string[] {
  return (candidate.workExperience ?? []).map(exp => {
    const years = exp.years > 0 ? `${exp.years} ${exp.years === 1 ? 'año' : 'años'}` : 'menos de 1 año';
    return [exp.role, exp.sector, years].filter(Boolean).join(' · ') + (exp.tasks ? ` — ${exp.tasks}` : '');
  });
}
