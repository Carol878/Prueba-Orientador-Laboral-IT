/**
 * @file HomeDashboard.tsx
 * @description Inicio para quien vuelve (ya tiene perfil guardado): saludo, "Tu siguiente paso" según
 * el recorrido y tres cifras (candidaturas enviadas, cursos en el itinerario y básicos del puesto cubiertos).
 */

import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

import JourneyStepper from './JourneyStepper';
import type { JourneyStep, JourneyStepId } from './journey';

interface HomeDashboardProps {
  userName: string;
  roleName: string;
  steps: JourneyStep[];
  applicationsCount: number;
  itineraryCount: number;
  basicsHave: number;
  basicsTotal: number;
  /** Aviso de novedades en candidaturas (o nada). */
  notice?: ReactNode;
  onNavigate: (id: JourneyStepId | 'training') => void;
  onOpenApplications: () => void;
  onChangeStart: () => void;
}

const NEXT_STEP: Record<JourneyStepId, { title: string; text: string; cta: string }> = {
  diagnostic: {
    title: 'Completa tu diagnóstico',
    text: 'Marca las tecnologías que ya has usado y tu experiencia. Con eso preparamos tu plan.',
    cta: 'Seguir con el diagnóstico'
  },
  roadmap: {
    title: 'Mira tu plan de acción',
    text: 'Qué aprender primero, qué proyecto enseñar y cursos gratuitos para lo que te falta.',
    cta: 'Ver mi plan'
  },
  offers: {
    title: 'Encuentra una oferta que te encaje',
    text: 'Una oferta cada vez, con el salario a la vista y lo que piden comparado con lo que ya sabes.',
    cta: 'Ver ofertas'
  },
  interview: {
    title: 'Practica una entrevista',
    text: 'Responde preguntas reales de selección y recibe consejos antes de la entrevista de verdad.',
    cta: 'Practicar ahora'
  }
};

/** "Ana Martínez" → "AM". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '·';
}

function Stat({ value, label, onClick }: { value: ReactNode; label: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="card w-full h-full p-3 sm:p-4 text-left hover:border-line-strong">
        <span className="block nums font-bold text-title sm:text-heading leading-none text-fg">{value}</span>
        <span className="block mt-2 text-meta sm:text-body text-fg-2 leading-snug">{label}</span>
      </button>
    </li>
  );
}

export default function HomeDashboard({
  userName,
  roleName,
  steps,
  applicationsCount,
  itineraryCount,
  basicsHave,
  basicsTotal,
  notice,
  onNavigate,
  onOpenApplications,
  onChangeStart
}: HomeDashboardProps) {
  const firstName = userName.trim().split(/\s+/)[0] || userName;
  const next = steps.find(step => !step.done);
  const nextText = next ? NEXT_STEP[next.id] : null;

  return (
    <>
      <header className="mb-8 pb-5 border-b border-line flex items-center gap-4">
        <span
          className="w-12 h-12 shrink-0 grid place-items-center rounded-full bg-accent-soft border border-accent/40 text-accent-strong font-display font-bold text-lead"
          aria-hidden="true"
        >
          {initials(userName)}
        </span>
        <div className="min-w-0">
          <h2 className="font-display font-bold text-2xl md:text-heading leading-tight tracking-[-0.015em] text-fg">
            Hola, {firstName}
          </h2>
          <p className="text-body text-fg-2 mt-1">
            Tu objetivo: <span className="text-fg font-semibold">{roleName}</span>
          </p>
        </div>
      </header>

      {notice}

      <section className="card-technical p-5 md:p-6 mb-4" aria-labelledby="next-step-title">
        <p className="eyebrow mb-1">Tu siguiente paso</p>
        {nextText && next ? (
          <>
            <h3 id="next-step-title" className="font-display font-bold text-title text-fg">{nextText.title}</h3>
            <p className="text-body text-fg-2 mt-1 max-w-2xl">{nextText.text}</p>
            <button type="button" onClick={() => onNavigate(next.id)} className="btn btn-primary mt-4">
              {nextText.cta}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <h3 id="next-step-title" className="font-display font-bold text-title text-fg">Has completado todo el recorrido</h3>
            <p className="text-body text-fg-2 mt-1 max-w-2xl">
              Sigue de cerca tus candidaturas y vuelve a practicar antes de cada entrevista.
            </p>
            <button type="button" onClick={onOpenApplications} className="btn btn-primary mt-4">
              Ver mis candidaturas
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </>
        )}

        <JourneyStepper steps={steps} currentId={next?.id ?? null} onSelect={onNavigate} className="mt-6 pt-5 border-t border-line" />
      </section>

      <ul className="grid grid-cols-3 gap-2 sm:gap-4 mb-8" aria-label="Tus cifras">
        <Stat value={applicationsCount} label={applicationsCount === 1 ? 'candidatura enviada' : 'candidaturas enviadas'} onClick={onOpenApplications} />
        <Stat value={itineraryCount} label={itineraryCount === 1 ? 'curso en tu itinerario' : 'cursos en tu itinerario'} onClick={() => onNavigate('training')} />
        <Stat
          value={<>{basicsHave}<span className="text-fg-3">/{basicsTotal}</span></>}
          label="básicos del puesto cubiertos"
          onClick={() => onNavigate('roadmap')}
        />
      </ul>

      <p className="text-body text-fg-2">
        ¿Has cambiado de situación?{' '}
        <button type="button" onClick={onChangeStart} className="min-h-11 font-semibold text-accent-strong underline underline-offset-2">
          Elegir otro punto de partida
        </button>
      </p>
    </>
  );
}
