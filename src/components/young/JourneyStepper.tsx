/**
 * @file JourneyStepper.tsx
 * @description Recorrido del joven en cuatro pasos (Diagnóstico → Plan → Ofertas → Entrevista) con ✓
 * en lo completado y el paso actual marcado. Cada paso lleva a su pestaña.
 */

import { Check } from 'lucide-react';

import type { JourneyStep, JourneyStepId } from './journey';

interface JourneyStepperProps {
  steps: JourneyStep[];
  /** Paso de la pestaña abierta (o `null` en Inicio). */
  currentId: JourneyStepId | null;
  onSelect: (id: JourneyStepId) => void;
  className?: string;
}

export default function JourneyStepper({ steps, currentId, onSelect, className = '' }: JourneyStepperProps) {
  return (
    <nav aria-label="Tu recorrido" className={className}>
      <ol className="timeline timeline-horizontal">
        {steps.map((step, index) => {
          const isCurrent = step.id === currentId;
          // El paso abierto se marca como actual aunque ya esté hecho, para que se vea dónde estás.
          const state = isCurrent ? 'current' : step.done ? 'done' : undefined;
          return (
            <li key={step.id} className="timeline-item p-0" data-state={state}>
              <button
                type="button"
                onClick={() => onSelect(step.id)}
                aria-current={isCurrent ? 'step' : undefined}
                className="group relative block w-full pt-6 pr-2 text-left rounded"
              >
                <span
                  className={`timeline-node grid place-items-center ${isCurrent && step.done ? 'bg-ok! border-ok!' : ''}`}
                  aria-hidden="true"
                >
                  {step.done && <Check className="w-2.5 h-2.5 text-canvas" strokeWidth={3.5} />}
                </span>
                <span className="block text-caption text-fg-3 nums">{index + 1}</span>
                <span
                  className={`block text-meta sm:text-body font-semibold leading-tight truncate group-hover:text-fg ${
                    isCurrent ? 'text-accent-strong' : step.done ? 'text-fg' : 'text-fg-2'
                  }`}
                >
                  {step.label}
                </span>
                <span className="sr-only">{step.done ? ' (hecho)' : ' (pendiente)'}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
