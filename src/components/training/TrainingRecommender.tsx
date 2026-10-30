/**
 * @file TrainingRecommender.tsx
 * @description Recomendador de formación: cruza el perfil objetivo con lo que el joven ya domina
 * (diagnóstico técnico) y ordena el catálogo por los huecos que cubre cada programa.
 * Los cursos se leen únicamente de Supabase (`training_resources`); si falla, se muestra el motivo.
 * Si el joven ha hecho el diagnóstico, el objetivo por defecto es "Según mi plan de acción".
 * Se enseñan 6 programas y el resto con "Ver más", para que no sea un muro de tarjetas.
 */

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Bookmark, BookmarkCheck, ChevronDown, Search } from 'lucide-react';

import { TRAINING_PROFILES, normalizeSkill } from '../../data/trainingCatalog';
import type { TrainingCourse, TrainingProfile, TrainingProfileId } from '../../data/trainingCatalog';
import { useTrainingCatalog } from '../../hooks/useTrainingCatalog';
import CatalogErrorNotice from './CatalogErrorNotice';
import { PageHeader } from '../common/AppShell';
import FitMeter, { sortSegments } from '../young/FitMeter';
import ProviderMonogram from '../young/ProviderMonogram';
import { itineraryKey, loadItinerary } from '../young/journey';

type CostFilter = 'all' | 'free' | 'certified';

interface TrainingRecommenderProps {
  /** Email del usuario: separa el itinerario guardado de cada cuenta. */
  userEmail: string;
  /** Tecnologías marcadas en el diagnóstico técnico; no cuentan como pendientes. */
  knownSkills: string[];
  /** Habilidades pendientes según el plan de acción (vacío si no le falta nada). */
  planGapSkills: string[];
}

interface RankedCourse {
  course: TrainingCourse;
  /** Skills pendientes del perfil que cubre este programa. */
  gapSkills: string[];
}

const COST_FILTERS: Array<{ id: CostFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'free', label: 'Gratis o subvencionado' },
  { id: 'certified', label: 'Con certificado reconocido' }
];

const CERTIFICATION_LABELS = {
  estatal: 'Título oficial del Estado',
  fabricante: 'Certificado de la empresa tecnológica'
} as const;

/** Programas que se ven de entrada y que se añaden con cada "Ver más". */
const PAGE_SIZE = 6;

export default function TrainingRecommender({ userEmail, knownSkills, planGapSkills }: TrainingRecommenderProps) {
  const { courses, status, error, retry } = useTrainingCatalog();
  const isLoading = status === 'loading';
  const [profileId, setProfileId] = useState<TrainingProfileId>(planGapSkills.length > 0 ? 'plan' : 'all');
  const [query, setQuery] = useState<string>('');
  const [costFilter, setCostFilter] = useState<CostFilter>('all');
  const [itinerary, setItinerary] = useState<string[]>(() => loadItinerary(userEmail));
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  // Al cambiar de objetivo, búsqueda o filtro se vuelve a enseñar solo lo primero.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [profileId, query, costFilter]);

  useEffect(() => {
    try {
      localStorage.setItem(itineraryKey(userEmail), JSON.stringify(itinerary));
    } catch {
      // Sin almacenamiento disponible el itinerario vive solo en la sesión actual.
    }
  }, [userEmail, itinerary]);

  /** Objetivos disponibles: primero el del plan de acción (si le falta algo), luego los fijos. */
  const profiles = useMemo<TrainingProfile[]>(
    () =>
      planGapSkills.length > 0
        ? [{ id: 'plan', label: 'Según mi plan de acción', requiredSkills: planGapSkills, freeOnly: false }, ...TRAINING_PROFILES]
        : TRAINING_PROFILES,
    [planGapSkills]
  );

  const profile = profiles.find(p => p.id === profileId) ?? profiles[0];

  const known = useMemo(() => new Set(knownSkills.map(normalizeSkill)), [knownSkills]);

  // Skills que el perfil exige y el joven aún no domina.
  const pendingSkills = useMemo(
    () => profile.requiredSkills.filter(skill => !known.has(skill)),
    [profile, known]
  );

  /** Catálogo filtrado y ordenado: primero los programas que más huecos cubren. */
  const rankedCourses = useMemo<RankedCourse[]>(() => {
    const term = query.trim().toLowerCase();

    return courses
      .filter(course => !profile.freeOnly || course.priceType !== 'mixto')
      .filter(course => {
        if (costFilter === 'free') return course.priceType !== 'mixto';
        if (costFilter === 'certified') return course.officialCertification;
        return true;
      })
      .filter(course => {
        if (!term) return true;
        const haystack = [course.title, course.provider, course.description, ...course.skillsCovered]
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      })
      .map(course => ({
        course,
        gapSkills: course.skillsCovered.filter(skill => pendingSkills.includes(skill))
      }))
      .sort((a, b) => b.gapSkills.length - a.gapSkills.length);
  }, [courses, query, costFilter, profile, pendingSkills]);

  const toggleItinerary = (courseId: string): void => {
    setItinerary(prev => (prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]));
  };

  return (
    <div className="page flex-1 animate-enter">
      <PageHeader
        eyebrow="Cursos para seguir aprendiendo"
        title="Formación recomendada"
        description="Cursos y certificados gratuitos o subvencionados, ordenados según lo que te falta aprender para llegar a tu objetivo."
        aside={
          <span className="badge-technical nums">
            {itinerary.length} {itinerary.length === 1 ? 'programa' : 'programas'} en tu itinerario
          </span>
        }
      />

      {/* Objetivo y análisis de huecos */}
      <section className="mb-8" aria-labelledby="training-goal">
        <h3 id="training-goal" className="label-tech mb-3">¿Qué te gustaría hacer?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {profiles.map(option => (
            <button
              key={option.id}
              type="button"
              aria-pressed={option.id === profileId}
              onClick={() => setProfileId(option.id)}
              className="option font-medium"
            >
              {option.label}
            </button>
          ))}
        </div>

        {profile.requiredSkills.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="text-body text-fg-2 mr-1">Lo que necesitas saber para este objetivo:</span>
            {profile.requiredSkills.map(skill => {
              const isKnown = known.has(skill);
              return (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-2 py-1 border border-line-strong rounded bg-raised text-meta text-fg"
                >
                  <span className="dot" data-state={isKnown ? 'have' : 'missing'} aria-hidden="true" />
                  {skill}
                  <span className="sr-only">{isKnown ? '(ya lo sabes)' : '(te falta)'}</span>
                </span>
              );
            })}
          </div>
        )}
      </section>

      {/* Búsqueda y filtros */}
      <section className="card p-4 mb-3 flex flex-col lg:flex-row lg:items-center gap-3" aria-label="Filtros del catálogo">
        <label className="relative flex-1">
          <span className="sr-only">Busca por tema, entidad o nombre del curso</span>
          <Search className="w-4 h-4 text-fg-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ej.: ciberseguridad, SEPE, Python…"
            enterKeyHint="search"
            className="input-technical pl-9"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {COST_FILTERS.map(filter => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={filter.id === costFilter}
              onClick={() => setCostFilter(filter.id)}
              className="chip min-h-11"
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      <p className="text-body text-fg-2 mb-4 nums" aria-live="polite">
        {isLoading ? 'Cargando cursos…' : error ? '' : `${rankedCourses.length} de ${courses.length} programas`}
      </p>

      {/* Fichas de programas: los certificados ocupan el ancho completo */}
      {error ? (
        <CatalogErrorNotice error={error} onRetry={retry} />
      ) : isLoading ? null : rankedCourses.length === 0 ? (
        <div className="card p-8 text-center text-body text-fg-2">
          No hay programas que encajen con lo que has elegido. Prueba con otra búsqueda o quita el filtro de precio.
        </div>
      ) : (
        <>
        <ul className="grid grid-cols-1 md:grid-cols-2 grid-flow-row-dense gap-4">
          {rankedCourses.slice(0, visibleCount).map(({ course, gapSkills }) => {
            const isSaved = itinerary.includes(course.id);
            const isFeatured = course.officialCertification;

            return (
              <li
                key={course.id}
                className={`card flex flex-col ${isFeatured ? 'md:col-span-2' : ''}`}
              >
                <div className={`p-5 md:p-6 flex-1 ${isFeatured ? 'md:grid md:grid-cols-[1fr_260px] md:gap-8' : 'flex flex-col'}`}>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2.5 mb-2">
                      <ProviderMonogram name={course.provider} />
                      <p className="text-meta font-semibold text-fg-2 leading-snug">{course.provider}</p>
                    </div>
                    <h3 className="font-display font-bold text-lg leading-snug tracking-[-0.015em] text-fg mb-2">{course.title}</h3>
                    <p className="text-body text-fg-2 leading-relaxed mb-4">{course.description}</p>

                    {gapSkills.length > 0 && (
                      <FitMeter
                        className="mb-4 max-w-xs"
                        segments={sortSegments(pendingSkills.map(skill => (gapSkills.includes(skill) ? 'learning' : 'missing')))}
                        label={`Cubre ${gapSkills.length} de ${pendingSkills.length} cosas que te faltan`}
                      />
                    )}

                    <ul className="flex flex-wrap gap-1.5" aria-label="Contenidos">
                      {course.skillsCovered.map(skill => (
                        <li
                          key={skill}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 border border-line-strong rounded bg-raised text-meta ${
                            gapSkills.includes(skill) ? 'text-fg' : 'text-fg-2'
                          }`}
                        >
                          {gapSkills.includes(skill) && <span className="dot" data-state="missing" aria-hidden="true" />}
                          {skill}
                          {gapSkills.includes(skill) && <span className="sr-only">(te falta)</span>}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className={`flex flex-col gap-3 ${isFeatured ? 'mt-5 md:mt-0' : 'mt-5'}`}>
                    {course.certificationIssuer && (
                      <p className="px-2.5 py-2 border border-cert border-l-2 rounded bg-raised">
                        <span className="block text-meta font-semibold text-cert">
                          {CERTIFICATION_LABELS[course.certificationIssuer]}
                        </span>
                        {course.certificationName && (
                          <span className="block text-meta text-fg-2 mt-0.5">{course.certificationName}</span>
                        )}
                      </p>
                    )}

                    <dl className="grid grid-cols-3 border border-line divide-x divide-line rounded">
                      <div className="p-2">
                        <dt className="text-caption text-fg-3">Formato</dt>
                        <dd className="text-meta font-semibold text-fg">{course.modality}</dd>
                      </div>
                      <div className="p-2">
                        <dt className="text-caption text-fg-3">Idioma</dt>
                        <dd className="text-meta font-semibold text-fg">{course.language}</dd>
                      </div>
                      <div className="p-2">
                        <dt className="text-caption text-fg-3">Precio</dt>
                        <dd className={`text-meta font-semibold ${course.priceType === 'mixto' ? 'text-fg' : 'text-ok'}`}>
                          {course.priceType === 'mixto' ? 'Variable' : 'Gratis'}
                        </dd>
                      </div>
                    </dl>
                    <p className={`text-meta ${course.priceType === 'mixto' ? 'text-fg-2' : 'text-ok'}`}>{course.priceLabel}</p>
                  </div>
                </div>

                <div className="px-5 md:px-6 py-3 border-t border-line flex flex-wrap items-center justify-between gap-2">
                  <a
                    href={course.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost px-2 text-accent-strong"
                  >
                    Web oficial
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                    <span className="sr-only">(se abre en una pestaña nueva)</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => toggleItinerary(course.id)}
                    aria-pressed={isSaved}
                    className={`btn btn-secondary ${isSaved ? 'border-ok/60 text-ok' : ''}`}
                  >
                    {isSaved ? <BookmarkCheck className="w-4 h-4" aria-hidden="true" /> : <Bookmark className="w-4 h-4" aria-hidden="true" />}
                    {isSaved ? 'En mi itinerario' : 'Añadir a mi itinerario'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {rankedCourses.length > visibleCount && (
          <div className="mt-6 flex justify-center">
            <button type="button" onClick={() => setVisibleCount(count => count + PAGE_SIZE)} className="btn btn-secondary">
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
              <span className="nums">Ver más ({rankedCourses.length - visibleCount})</span>
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
}
