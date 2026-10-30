/**
 * @file OfferCard.tsx
 * @description Tarjeta de una oferta en una sola columna: lo esencial arriba (puesto, empresa, salario
 * frente al sueldo junior habitual, dónde, medidor de encaje y requisitos con su estado) y el resto
 * plegado en "Más detalles".
 *
 * Al joven nunca se le enseña un porcentaje: solo "Cumples X de Y", un segmento por requisito
 * imprescindible y un punto de color en cada fila (el color nunca va solo: siempre hay texto).
 */

import { ArrowUpRight, BookOpen, MapPin, Sprout } from 'lucide-react';

import type { JobOffer } from '../../types';
import type { TrainingCourse } from '../../data/trainingCatalog';
import { fitLabel } from '../../lib/offerMatch';
import type { OfferFit, RequirementCheck, RequirementState } from '../../lib/offerMatch';
import { ROLE_DATABASE } from '../../mockData';
import FitMeter, { sortSegments } from '../young/FitMeter';
import type { FitSegmentState } from '../young/FitMeter';
import { courseForRequirement, formatDay, formatSalary, roleKeyForOffer, whyThisOffer } from './offerText';

interface OfferCardProps {
  offer: JobOffer;
  fit: OfferFit;
  courses: TrainingCourse[];
  /** Puesto del diagnóstico (clave de `ROLE_DATABASE`), para explicar por qué sale la oferta. */
  targetRole: string;
  /** Marca o desmarca como "Lo estoy aprendiendo" las habilidades de un requisito. */
  onToggleLearning: (skills: string[], learning: boolean) => void;
}

/** Texto de cada estado. El color lo pone solo el punto (.dot); las filas son neutras. */
const STATE_LABEL: Record<RequirementState, string> = {
  have: 'Lo tengo',
  learning: 'Lo estoy aprendiendo',
  missing: 'Por aprender',
  condition: 'A confirmar en la entrevista'
};

const euros = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' });

/** "20.000€ - 26.000€ al año" → [20000, 26000] (o `null` si no se entiende). */
function parseSalaryRange(text: string): [number, number] | null {
  const numbers = (text.match(/\d{1,3}(?:\.\d{3})+|\d+/g) ?? []).map(n => Number(n.replace(/\./g, '')));
  if (numbers.length < 2 || numbers.some(n => !Number.isFinite(n))) return null;
  return [Math.min(numbers[0], numbers[1]), Math.max(numbers[0], numbers[1])];
}

/**
 * Mini barra del salario de la oferta frente al sueldo junior habitual del puesto más parecido.
 * Si la oferta no se parece a ningún puesto de la guía, no se pinta.
 */
function SalaryComparison({ offer }: { offer: JobOffer }) {
  const roleKey = roleKeyForOffer(offer);
  const role = roleKey ? ROLE_DATABASE[roleKey] : undefined;
  const reference = role ? parseSalaryRange(role.avgSalaryJunior) : null;
  if (!role || !reference) return null;

  const [refMin, refMax] = reference;
  const low = Math.min(refMin, offer.salaryMin);
  const high = Math.max(refMax, offer.salaryMax);
  const pad = Math.max((high - low) * 0.15, 1000);
  const scaleMin = low - pad;
  const span = high + pad - scaleMin;
  const pos = (value: number) => `${((value - scaleMin) / span) * 100}%`;
  const width = (from: number, to: number) => `max(${((to - from) / span) * 100}%, 4px)`;

  const middle = (offer.salaryMin + offer.salaryMax) / 2;
  const verdict =
    middle > refMax ? 'Por encima de lo habitual' : middle < refMin ? 'Por debajo de lo habitual' : 'Dentro de lo habitual';
  const refText = `${euros.format(refMin)} – ${euros.format(refMax)} €`;

  return (
    <div
      className="mt-3 max-w-sm"
      role="img"
      aria-label={`${verdict}: el sueldo junior de ${role.name} suele estar entre ${refText} brutos al año.`}
    >
      <div className="relative h-4" aria-hidden="true">
        <span className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-px bg-line-strong" />
        <span
          className="absolute top-1/2 -translate-y-1/2 h-2 rounded-sm bg-line-strong"
          style={{ left: pos(refMin), width: width(refMin, refMax) }}
        />
        <span
          className="absolute top-1/2 -translate-y-1/2 h-1 rounded-sm bg-accent"
          style={{ left: pos(offer.salaryMin), width: width(offer.salaryMin, offer.salaryMax) }}
        />
      </div>
      <p className="mt-1 text-meta text-fg-2" aria-hidden="true">
        <span className="font-semibold text-fg">{verdict}</span>
        <span className="block">
          <span className="inline-block w-3 h-1 mr-1.5 align-middle rounded-sm bg-accent" />
          Esta oferta
          <span className="inline-block w-3 h-2 ml-3 mr-1.5 align-middle rounded-sm bg-line-strong" />
          Junior de {role.name}: <span className="nums">{refText}</span>
        </span>
      </p>
    </div>
  );
}

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
  const course = state === 'missing' ? courseForRequirement(courses, requirement) : null;

  return (
    <li className="px-3 py-2.5 rounded border border-line text-body">
      <div className="flex items-start gap-2.5">
        <span className="dot mt-[0.4375rem]" data-state={state === 'condition' ? undefined : state} aria-hidden="true" />
        <div className="flex-1 min-w-0 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="text-fg font-medium">{requirement.label}</span>
          <span className="text-meta text-fg-2">{STATE_LABEL[state]}</span>
        </div>
      </div>

      {requirement.trainable && state !== 'have' && (
        <p className="mt-1.5 pl-[1.125rem]">
          <span className="badge-technical text-ok border-ok/50">
            <Sprout className="w-3.5 h-3.5" aria-hidden="true" />
            La empresa te lo enseña
          </span>
        </p>
      )}

      {state === 'missing' && requirement.skills.length > 0 && (
        <div className="mt-2 ml-[1.125rem] pt-2 border-t border-line flex flex-col gap-2">
          {course ? (
            <p className="text-meta text-fg-2">
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
            <p className="text-meta text-fg-2">Aún no tenemos un curso del catálogo para esto.</p>
          )}
          <button
            type="button"
            onClick={() => onToggleLearning(requirement.skills, true)}
            className="btn btn-secondary self-start px-3"
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
          className="mt-1 ml-[1.125rem] min-h-11 text-meta text-fg-2 underline underline-offset-2 hover:text-fg"
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
  const segments = sortSegments(essentials.map(c => c.state as FitSegmentState));
  const fitText = fitLabel(fit);
  const fitAria =
    fit.essentialTotal > 0
      ? `${fitText} conocimientos imprescindibles${
          fit.essentialTotal - fit.essentialHave - fit.essentialLearning > 0
            ? `; te faltan ${fit.essentialTotal - fit.essentialHave - fit.essentialLearning}`
            : ''
        }`
      : fitText;

  return (
    <article className="card-technical p-5 md:p-6" aria-labelledby={titleId}>
      {offer.openToNewcomers && (
        <p className="badge-technical mb-3 text-accent-strong border-accent/50">
          <Sprout className="w-3.5 h-3.5" aria-hidden="true" />
          Abierta a perfiles que empiezan o cambian de sector
        </p>
      )}

      <p className="text-body text-fg-2">
        {offer.companyName} · {offer.sector}
      </p>
      <h3 id={titleId} className="font-display font-bold text-xl md:text-2xl leading-tight tracking-[-0.015em] text-fg mt-1">
        {offer.title}
      </h3>

      <p className="mt-3 font-semibold text-lead text-fg nums">{formatSalary(offer)}</p>
      <SalaryComparison offer={offer} />
      <p className="mt-3 text-body text-fg-2 flex items-start gap-1.5">
        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-fg-3" aria-hidden="true" />
        <span>
          {offer.city} · {offer.modality} · Jornada {offer.workday.toLowerCase()}
        </span>
      </p>

      {fit.essentialTotal > 0 ? (
        <div className="mt-5 max-w-sm">
          <p className="text-meta text-fg-2 mb-1.5" aria-hidden="true">Conocimientos imprescindibles</p>
          <FitMeter segments={segments} label={fitText} ariaLabel={fitAria} />
        </div>
      ) : (
        <p className="mt-5 text-body font-semibold text-fg">{fitText}</p>
      )}

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
        <summary className="min-h-11 flex items-center cursor-pointer text-control font-semibold text-accent-strong">
          Más detalles de la oferta
        </summary>
        <div className="pt-2 space-y-4 text-body">
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
