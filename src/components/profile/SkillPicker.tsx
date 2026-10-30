/**
 * @file SkillPicker.tsx
 * @description Selector de tecnologías del diagnóstico: las más usadas a la vista y, con "Ver más",
 * el resto agrupado por área, con buscador y opción de añadir una que no esté en la lista.
 */

import { useId, useMemo, useState } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';

import { ALL_SKILLS, POPULAR_SKILLS, SKILL_GROUPS } from '../../data/skillCatalog';

interface SkillPickerProps {
  selected: string[];
  onToggle: (skill: string) => void;
  /** Habilidades que se eligen en otro bloque del diagnóstico y no deben salir como "otras". */
  excluded?: string[];
}

const normalize = (text: string): string =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function SkillChip({ skill, selected, onToggle }: { skill: string; selected: boolean; onToggle: (skill: string) => void }) {
  return (
    <button type="button" aria-pressed={selected} onClick={() => onToggle(skill)} className="chip">
      {selected ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Plus className="w-3.5 h-3.5 text-fg-3" aria-hidden="true" />}
      {skill}
    </button>
  );
}

export function SkillPicker({ selected, onToggle, excluded = [] }: SkillPickerProps) {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');
  const panelId = useId();
  const searchId = useId();

  // Las elegidas fuera de las populares (de "Ver más" o añadidas a mano) se ven siempre arriba.
  const extraSelected = selected.filter(skill => !POPULAR_SKILLS.includes(skill) && !excluded.includes(skill));
  const extraCount = ALL_SKILLS.length - POPULAR_SKILLS.length;

  const trimmed = query.trim();
  const groups = useMemo(() => {
    const q = normalize(trimmed);
    return SKILL_GROUPS
      .map(group => ({ ...group, skills: q ? group.skills.filter(skill => normalize(skill).includes(q)) : group.skills }))
      .filter(group => group.skills.length > 0);
  }, [trimmed]);
  const canAddCustom = trimmed.length > 1 && !ALL_SKILLS.some(skill => normalize(skill) === normalize(trimmed)) && !selected.includes(trimmed);

  const addCustom = () => {
    if (!canAddCustom) return;
    onToggle(trimmed);
    setQuery('');
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {POPULAR_SKILLS.map(skill => (
          <SkillChip key={skill} skill={skill} selected={selected.includes(skill)} onToggle={onToggle} />
        ))}
        {extraSelected.map(skill => (
          <SkillChip key={skill} skill={skill} selected onToggle={onToggle} />
        ))}
      </div>

      <button
        type="button"
        aria-expanded={showAll}
        aria-controls={panelId}
        onClick={() => setShowAll(open => !open)}
        className="btn btn-secondary mt-3"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`} aria-hidden="true" />
        {showAll ? 'Ver menos' : `Ver más tecnologías (${extraCount})`}
      </button>

      {showAll && (
        <div id={panelId} className="mt-4 border border-line rounded-[2px] p-4 bg-surface">
          <label htmlFor={searchId} className="label-tech">Buscar tecnología o herramienta</label>
          <div className="relative mt-2 mb-4 max-w-md">
            <Search className="w-4 h-4 text-fg-3 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addCustom();
                }
              }}
              placeholder="Ej.: Django, Flutter, Tableau…"
              className="input-technical w-full !pl-9"
            />
          </div>

          {groups.map(group => (
            <fieldset key={group.id} className="mb-4 last:mb-0">
              <legend className="text-sm font-semibold text-fg mb-2">{group.label}</legend>
              <div className="flex flex-wrap gap-2">
                {group.skills.map(skill => (
                  <SkillChip key={skill} skill={skill} selected={selected.includes(skill)} onToggle={onToggle} />
                ))}
              </div>
            </fieldset>
          ))}

          {groups.length === 0 && !canAddCustom && <p className="text-sm text-fg-2">No hay resultados para «{trimmed}».</p>}

          {canAddCustom && (
            <button type="button" onClick={addCustom} className="btn btn-secondary mt-2">
              <Plus className="w-4 h-4" aria-hidden="true" />
              Añadir «{trimmed}»
            </button>
          )}
        </div>
      )}
    </div>
  );
}
