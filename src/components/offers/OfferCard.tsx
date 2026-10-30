/**
 * @file OfferCard.tsx
 * @description Tarjeta de una oferta en una sola columna: lo esencial arriba (puesto, empresa, salario,
 * dónde, "Cumples X de Y" y requisitos con su estado) y el resto plegado en "Más detalles".
 *
 * Al joven nunca se le enseña un porcentaje: solo "Cumples X de Y" y el estado de cada requisito.
 */

import { ArrowUpRight, BookOpen, Check, CircleDashed, Info, MapPin, Sprout } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { JobOffer } from '../../types';
import type { TrainingCourse } from '../../data/trainingCatalog';
import { fitLabel } from '../../lib/offerMatch';
import type { OfferFit, RequirementCheck, RequirementState } from '../../lib/offerMatch';
import { courseForRequirement, formatDay, formatSalary, whyThisOffer } from './offerText';

interface OfferCardProps {
  offer: JobOffer;
  fit: OfferFit;
  courses: TrainingCourse[];
  /** Puesto del diagnóstico (clave de `ROLE_DATABASE`), para explicar por qué sale la oferta. */
  targetRole: string;
  /** Marca o desmarca como "Lo estoy aprendiendo" las habilidades de un requisito. */
  onToggleLearning: (skills: string[], learning: boolean) => void;
}

const STATE_UI: Record<RequirementState, { label: string; icon: LucideIcon; tone: string; row: string }> = {
  have: { label: 'Lo tengo', icon: Check, tone: 'text-ok', row: 'border-line' },
  learning: { label: 'Lo estoy aprendiendo', icon: BookOpen, tone: 'text-accent-strong', row: 'border-accent/40 border-l-2 border-l-accent bg-accent-soft' },
  missing: { label: 'Por aprender', icon: CircleDashed, tone: 'text-gap', row: 'border-gap/40 border-l-2 border-l-gap bg-gap-soft' },
  condition: { label: 'A confirmar en la entrevista', icon: Info, tone: 'text-fg-2', row: 'border-line' }
};

function RequirementRow({
  check,
  courses,
  onToggleLearning
}: {
  check: RequirementCheck;
  courses: TrainingCourse[];
  onToggleLearning: OfferCardProps['onToggleLearning'];
}) {
  const { requirement, state } = check;
  const ui = STATE_UI[state];
  const course = state === 'missing' ? courseForRequirement(courses, requirement) : null;

  return (
    <li className={`px-3 py-2.5 rounded border text-sm ${ui.row}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <span className="text-fg font-medium">{requirement.label}</span>
        <span className={`flex items-center gap-1.5 text-xs font-semibold ${ui.tone}`}>
          <ui.icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {ui.label}
        </span>
      </div>

      {requirement.trainable && state !== 'have' && (
        <p className="mt-1.5">
          <span className="badge-technical text-ok border-ok/50">
            <Sprout className="w-3.5 h-3.5" aria-hidden="true" />
            La empresa te lo enseña
          </span>
        </p>
      )}

      {state === 'missing' && requirement.skills.length > 0 && (
        <div className="mt-2 pt-2 border-t border-line flex flex-col gap-2">
          {course ? (
            <p className="text-xs text-fg-2">
              Curso:{' '}
              <a
                href={course.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-accent-strong underline underline-offset-2 inline-flex items-center gap-1"
              >
                {course.title}
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="sr-only">(se abre en una pestaña nueva)</span>
              </a>
              {' · '}
              {course.provider} · {course.priceLabel}
            </p>
          ) : (
            <p className="text-xs text-fg-2">Aún no tenemos un curso del catálogo para esto.</p>
          )}
          <button
            type="button"
            onClick={() => onToggleLearning(requirement.skills, true)}
            className="btn btn-secondary self-start min-h-9 px-3"
          >
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            Lo estoy aprendiendo
          </button>
        </div>
      )}

      {state === 'learning' && (
        <button
          type="button"
          onClick={() => onToggleLearning(requirement.skills, false)}
          className="mt-1.5 min-h-9 text-xs text-fg-2 underline underline-offset-2 hover:text-fg"
        >
          Ya no lo estoy aprendiendo
        </button>
      )}
    </li>
  );
}

export default function OfferCard({ offer, fit, courses, targetRole, onToggleLearning }: OfferCardProps) {
  const essentials = fit.checks.filter(c => c.requirement.kind === 'knowledge' && c.requirement.essential);
  const conditions = fit.checks.filter(c => c.requirement.kind === 'condition');
  const desirables = fit.checks.filter(c => c.requirement.kind === 'knowledge' && !c.requirement.essential);
  const titleId = `offer-title-${offer.id}`;

  return (
    <article className="card-technical p-5 md:p-6" aria-labelledby={titleId}>
      {offer.openToNewcomers && (
        <p className="badge-technical mb-3 text-accent-strong border-accent/50">
          <Sprout className="w-3.5 h-3.5" aria-hidden="true" />
          Abierta a perfiles que empiezan o cambian de sector
        </p>
      )}

      <p className="text-sm text-fg-2">
        {offer.companyName} · {offer.sector}
      </p>
      <h3 id={titleId} className="font-display font-bold text-xl md:text-2xl leading-tight tracking-[-0.015em] text-fg mt-1">
        {offer.title}
      </h3>

      <p className="mt-3 font-semibold text-fg">{formatSalary(offer)}</p>
      <p className="mt-1 text-sm text-fg-2 flex items-start gap-1.5">
        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-fg-3" aria-hidden="true" />
        <span>
          {offer.city} · {offer.modality} · Jornada {offer.workday.toLowerCase()}
        </span>
      </p>

      <p className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded border border-line-strong bg-raised text-sm font-semibold text-fg">
        {fitLabel(fit)}
        {fit.essentialTotal > 0 && <span className="font-normal text-fg-2">imprescindibles</span>}
      </p>

      {essentials.length > 0 && (
        <section className="mt-5" aria-label="Conocimientos imprescindibles">
          <h4 className="label-tech">Lo que piden</h4>
          <ul className="space-y-1.5">
            {essentials.map(check => (
              <RequirementRow key={check.requirement.id} check={check} courses={courses} onToggleLearning={onToggleLearning} />
            ))}
          </ul>
        </section>
      )}

      {conditions.length > 0 && (
        <section className="mt-5" aria-label="Condiciones del puesto">
          <h4 className="label-tech">Condiciones del puesto</h4>
          <ul className="space-y-1.5">
            {conditions.map(check => (
              <RequirementRow key={check.requirement.id} check={check} courses={courses} onToggleLearning={onToggleLearning} />
            ))}
          </ul>
        </section>
      )}

      <details className="mt-5 group border-t border-line pt-3">
        <summary className="min-h-11 flex items-center cursor-pointer text-sm font-semibold text-accent-strong">
          Más detalles de la oferta
        </summary>
        <div className="pt-2 space-y-4 text-sm">
          <p className="text-fg-2 leading-relaxed">{offer.description}</p>
          <dl className="space-y-3">
            <div>
              <dt className="label-tech mb-0.5">Contrato</dt>
              <dd className="text-fg">{offer.contract}</dd>
            </div>
            <div>
              <dt className="label-tech mb-0.5">Cómo llegar</dt>
              <dd className="text-fg">{offer.commute || 'La empresa no lo ha indicado.'}</dd>
            </div>
            <div>
              <dt className="label-tech mb-0.5">Plazos</dt>
              <dd className="text-fg">
                Cierra el {formatDay(offer.closesAt)} · Suele responder en {offer.responseDays}{' '}
                {offer.responseDays === 1 ? 'día' : 'días'}
              </dd>
            </div>
          </dl>

          {desirables.length > 0 && (
            <div>
              <h4 className="label-tech">También valoran (no es obligatorio)</h4>
              <ul className="space-y-1.5">
                {desirables.map(check => (
                  <RequirementRow key={check.requirement.id} check={check} courses={courses} onToggleLearning={onToggleLearning} />
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="label-tech">Por qué te sale esta oferta</h4>
            <ul className="space-y-1 text-fg-2 list-disc pl-5">
              {whyThisOffer(offer, fit, targetRole).map(reason => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </article>
  );
}
