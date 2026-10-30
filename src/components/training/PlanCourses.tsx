/**
 * @file PlanCourses.tsx
 * @description Bloque del plan de acción "Cursos para lo que te falta": muestra los cursos de la base
 * de datos que mejor cubren los requisitos pendientes del puesto, con enlace directo a su web.
 */

import { useMemo } from 'react';
import { ArrowUpRight, ChevronRight, GraduationCap, Loader2 } from 'lucide-react';

import { useTrainingCatalog } from '../../hooks/useTrainingCatalog';
import CatalogErrorNotice from './CatalogErrorNotice';
import { recommendCourses } from '../../lib/courseRecommendations';
import type { RequirementGap } from '../../lib/courseRecommendations';

interface PlanCoursesProps {
  /** Requisitos pendientes del plan con sus habilidades de catálogo. */
  gaps: RequirementGap[];
  /** Abre la sección "Formación recomendada" con el catálogo completo. */
  onSeeAll: () => void;
}

const MAX_COURSES = 4;

export default function PlanCourses({ gaps, onSeeAll }: PlanCoursesProps) {
  const { courses, status, error, retry } = useTrainingCatalog();
  const isLoading = status === 'loading';

  const recommendations = useMemo(() => recommendCourses(courses, gaps, MAX_COURSES), [courses, gaps]);

  // Requisitos pendientes que ningún curso del catálogo cubre (para avisar con honestidad).
  const uncovered = useMemo(() => {
    const offered = new Set(courses.flatMap(course => course.skillsCovered));
    return gaps.filter(gap => !gap.skills.some(skill => offered.has(skill))).map(gap => gap.requirement);
  }, [courses, gaps]);

  return (
    <section className="card p-6 mb-4" aria-labelledby="plan-courses-title" aria-busy={isLoading}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h4 id="plan-courses-title" className="label-tech flex items-center gap-2 mb-1">
            <GraduationCap className="w-4 h-4 text-accent" aria-hidden="true" />
            Cursos para lo que te falta
          </h4>
          <p className="text-sm text-fg-2">
            Formación gratuita, subvencionada o con parte gratis para aprender lo que marcamos como “Empieza por aquí”.
          </p>
        </div>
        <button type="button" onClick={onSeeAll} className="btn btn-secondary">
          Ver todos los cursos
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {gaps.length === 0 ? (
        <p className="p-4 bg-ok-soft border-l-2 border-ok text-sm text-fg">
          Ya cubres lo básico del puesto. En “Formación recomendada” puedes buscar cursos para ampliar o conseguir un certificado.
        </p>
      ) : error ? (
        <CatalogErrorNotice error={error} onRetry={retry} />
      ) : isLoading ? (
        <p className="flex items-center gap-2 text-sm text-fg-3 py-6" role="status">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          Buscando cursos para ti…
        </p>
      ) : recommendations.length === 0 ? (
        <p className="text-sm text-fg-2 py-2">
          Todavía no tenemos cursos en el catálogo para lo que te falta. Pregunta a tu orientador o revisa “Formación recomendada”.
        </p>
      ) : (
        <ol className="grid md:grid-cols-2 gap-3">
          {recommendations.map(({ course, coveredRequirements }, index) => (
            <li key={course.id} className="card-technical p-4 flex flex-col">
              <p className="text-xs font-semibold text-fg-2 mb-1">
                <span className="text-accent-strong mr-1.5">{index + 1}.</span>
                {course.provider}
              </p>
              <h5 className="font-display font-bold text-base leading-snug text-fg mb-2">{course.title}</h5>

              <p className="text-xs text-fg-3 mb-1.5">Te ayuda con:</p>
              <ul className="flex flex-wrap gap-1.5 mb-3" aria-label="Requisitos que cubre">
                {coveredRequirements.map(requirement => (
                  <li key={requirement} className="px-2 py-0.5 border border-gap rounded bg-gap-soft text-xs text-gap">
                    {requirement}
                  </li>
                ))}
              </ul>

              <p className="text-xs text-fg-2 mb-4">
                <span className={course.priceType === 'mixto' ? 'text-fg-2' : 'text-ok font-semibold'}>{course.priceLabel}</span>
                {' · '}
                {course.language}
                {' · '}
                {course.modality}
              </p>

              <a
                href={course.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary mt-auto self-start"
              >
                Ir a la web del curso
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">(se abre en una pestaña nueva)</span>
              </a>
            </li>
          ))}
        </ol>
      )}

      {status === 'ready' && uncovered.length > 0 && (
        <p className="text-xs text-fg-3 mt-4">
          Sin cursos en el catálogo por ahora para: {uncovered.join(', ')}.
        </p>
      )}
    </section>
  );
}
