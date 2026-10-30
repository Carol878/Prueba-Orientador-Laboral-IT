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

/** Clases de color de cada estado de candidatura (mismo lenguaje visual que el resto de la app). */
export const APPLICATION_STATUS_TONE: Record<ApplicationStatus, string> = {
  pending: 'border-gap text-gap bg-gap-soft',
  contact_open: 'border-accent text-accent-strong bg-accent-soft',
  interview: 'border-accent text-accent-strong bg-accent-soft',
  hired: 'border-ok text-ok bg-ok-soft',
  declined: 'border-line-strong text-fg-3 bg-raised'
};

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
