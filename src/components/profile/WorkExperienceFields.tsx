/**
 * @file WorkExperienceFields.tsx
 * @description Bloques del diagnóstico para la experiencia laboral (de cualquier sector) y el
 * portfolio. La empresa ve la experiencia ANTES que cualquier otra cosa del perfil.
 */

import { Plus, Trash2 } from 'lucide-react';

import type { WorkExperience } from '../../types';

interface WorkExperienceFieldsProps {
  value: WorkExperience[];
  onChange: (next: WorkExperience[]) => void;
}

const EMPTY_EXPERIENCE: WorkExperience = { role: '', sector: '', years: 0, tasks: '' };

/** Lista editable de experiencias laborales: se pueden añadir varias. */
export function WorkExperienceFields({ value, onChange }: WorkExperienceFieldsProps) {
  const update = (index: number, patch: Partial<WorkExperience>) =>
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <fieldset>
      <legend className="label-tech mb-1">Experiencia laboral (de cualquier sector)</legend>
      <p className="text-body text-fg-2 mb-3">
        Camarera, dependiente, mozo de almacén, monitor… Todo cuenta: las empresas lo verán antes que nada de tu perfil.
      </p>

      {value.length > 0 && (
        <ol className="space-y-3 mb-3">
          {value.map((item, index) => (
            <li key={index} className="card p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-body font-semibold text-fg">Experiencia {index + 1}</p>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  className="min-h-11 px-2 flex items-center gap-1.5 text-meta text-fg-2 hover:text-danger"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Quitar<span className="sr-only"> la experiencia {index + 1}</span>
                </button>
              </div>
              <div className="grid sm:grid-cols-[1fr_1fr_7rem] gap-3">
                <div>
                  <label htmlFor={`exp-role-${index}`} className="label-tech">Puesto</label>
                  <input
                    id={`exp-role-${index}`}
                    type="text"
                    value={item.role}
                    onChange={e => update(index, { role: e.target.value })}
                    placeholder="Dependienta"
                    className="input-technical"
                  />
                </div>
                <div>
                  <label htmlFor={`exp-sector-${index}`} className="label-tech">Sector</label>
                  <input
                    id={`exp-sector-${index}`}
                    type="text"
                    value={item.sector}
                    onChange={e => update(index, { sector: e.target.value })}
                    placeholder="Comercio"
                    className="input-technical"
                  />
                </div>
                <div>
                  <label htmlFor={`exp-years-${index}`} className="label-tech">Años</label>
                  <input
                    id={`exp-years-${index}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={50}
                    step={0.5}
                    value={item.years}
                    onChange={e => update(index, { years: Math.max(0, Number(e.target.value) || 0) })}
                    className="input-technical"
                  />
                </div>
              </div>
              <label htmlFor={`exp-tasks-${index}`} className="label-tech mt-3">Qué hacías (tareas que te sirven en otros trabajos)</label>
              <textarea
                id={`exp-tasks-${index}`}
                rows={2}
                value={item.tasks}
                onChange={e => update(index, { tasks: e.target.value })}
                placeholder="Atender a clientes, cerrar caja, controlar el inventario, organizar turnos…"
                className="input-technical resize-y"
              />
            </li>
          ))}
        </ol>
      )}

      <button type="button" onClick={() => onChange([...value, { ...EMPTY_EXPERIENCE }])} className="btn btn-secondary">
        <Plus className="w-4 h-4" aria-hidden="true" />
        {value.length === 0 ? 'Añadir una experiencia' : 'Añadir otra experiencia'}
      </button>
    </fieldset>
  );
}

interface PortfolioFieldsProps {
  portfolioUrl: string;
  mainProject: string;
  onPortfolioUrlChange: (value: string) => void;
  onMainProjectChange: (value: string) => void;
}

/** Enlace a portfolio o GitHub y descripción del proyecto principal. */
export function PortfolioFields({ portfolioUrl, mainProject, onPortfolioUrlChange, onMainProjectChange }: PortfolioFieldsProps) {
  return (
    <fieldset>
      <legend className="label-tech mb-1">Tu trabajo, a la vista</legend>
      <p className="text-body text-fg-2 mb-3">Opcional. Ayuda a que la empresa vea lo que sabes hacer sin conocer tu nombre.</p>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label htmlFor="portfolio-url" className="label-tech">Enlace a tu portfolio o GitHub</label>
          <input
            id="portfolio-url"
            type="url"
            inputMode="url"
            value={portfolioUrl}
            onChange={e => onPortfolioUrlChange(e.target.value)}
            placeholder="https://github.com/tu-usuario"
            className="input-technical"
          />
        </div>
        <div>
          <label htmlFor="main-project" className="label-tech">Tu proyecto principal (en una frase)</label>
          <input
            id="main-project"
            type="text"
            value={mainProject}
            onChange={e => onMainProjectChange(e.target.value)}
            placeholder="Una web de reservas para el bar donde trabajaba"
            className="input-technical"
          />
        </div>
      </div>
    </fieldset>
  );
}
