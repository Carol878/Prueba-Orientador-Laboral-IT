/**
 * @file AppShell.tsx
 * @description Barra lateral (escritorio) y cabecera con pestañas (móvil) compartidas por los paneles
 * de jóvenes y de empresas.
 */

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { LogOut, Sparkles, Square } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import fadLogo from '../../assets/brand/fad-juventud-light.png';
import { usePanelBackdrop } from '../../lib/panelBackdrop';
import type { PanelBackdropMode } from '../../lib/panelBackdrop';

export interface NavItem {
  id: string;
  label: string;
  /** Etiqueta corta para la barra de pestañas móvil. */
  shortLabel: string;
  icon: LucideIcon;
}

interface ShellProps {
  /** Nombre del panel, p. ej. "Panel de jóvenes". */
  panelName: string;
  /** Icono de marca del panel. */
  brandIcon: LucideIcon;
  userName: string;
  userEmail: string;
  roleLabel: string;
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onLogout: () => void;
}

/**
 * Botón de cierre de sesión con confirmación rápida: el primer toque pide confirmar
 * y el segundo, dentro de 3 segundos, cierra la sesión.
 */
function LogoutButton({ onLogout, compact = false }: { onLogout: () => void; compact?: boolean }) {
  const [armed, setArmed] = useState<boolean>(false);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      onClick={() => (armed ? onLogout() : setArmed(true))}
      className={`btn ${compact ? 'px-3' : 'w-full'} ${
        armed ? 'bg-danger-soft border-danger text-danger' : 'btn-secondary text-fg-2'
      }`}
    >
      <LogOut className="w-4 h-4" aria-hidden="true" />
      <span aria-live="polite">{armed ? '¿Confirmar salida?' : compact ? 'Salir' : 'Cerrar sesión'}</span>
    </button>
  );
}

const BACKDROP_OPTIONS: { mode: PanelBackdropMode; label: string }[] = [
  { mode: 'static', label: 'Fijo' },
  { mode: 'live', label: 'Vivo' },
];

/** Selector segmentado del fondo del panel (barra lateral). */
function BackdropToggle() {
  const [mode, setMode] = usePanelBackdrop();
  return (
    <div role="group" aria-labelledby="backdrop-toggle-label" className="mb-3">
      <p id="backdrop-toggle-label" className="text-xs text-fg-3 mb-1.5">Fondo</p>
      <div className="grid grid-cols-2 gap-1 p-1 bg-surface border border-line rounded-[4px]">
        {BACKDROP_OPTIONS.map(opt => {
          const active = mode === opt.mode;
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setMode(opt.mode)}
              aria-pressed={active}
              className={`min-h-9 flex items-center justify-center gap-1.5 rounded-[4px] border text-xs font-medium ${
                active ? 'bg-accent-soft border-accent text-accent-strong' : 'border-transparent text-fg-2 hover:border-line-strong'
              }`}
            >
              {opt.mode === 'live'
                ? <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                : <Square className="w-3.5 h-3.5" aria-hidden="true" />}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Botón compacto (móvil) que alterna entre fondo fijo y animado. */
function BackdropIconToggle() {
  const [mode, setMode] = usePanelBackdrop();
  const live = mode === 'live';
  const Icon = live ? Sparkles : Square;
  return (
    <button
      type="button"
      onClick={() => setMode(live ? 'static' : 'live')}
      aria-pressed={live}
      aria-label={`Fondo animado: ${live ? 'activado' : 'desactivado'}`}
      title={live ? 'Fondo animado' : 'Fondo fijo'}
      className={`min-w-11 min-h-11 grid place-items-center rounded-[4px] border ${
        live ? 'bg-accent-soft border-accent text-accent-strong' : 'bg-surface border-line text-fg-2'
      }`}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
    </button>
  );
}

/** Barra lateral fija del panel (solo escritorio). */
export function Sidebar({ panelName, userName, userEmail, roleLabel, items, activeId, onSelect, onLogout }: ShellProps) {
  return (
    <aside className="w-64 sticky top-0 h-dvh bg-surface border-r border-line hidden md:flex flex-col justify-between shrink-0">
      <div>
        <div className="px-5 py-5 border-b border-line flex items-center gap-3">
          <img src={fadLogo} alt="Fundación Fad Juventud" width={52} height={37} className="w-[52px] h-auto shrink-0" />
          <div className="pl-3 border-l border-line">
            <p className="font-display font-bold text-[15px] tracking-[-0.015em] text-fg leading-tight">Orientador IT</p>
            <p className="text-xs text-fg-3">{panelName}</p>
          </div>
        </div>

        <div className="mx-4 my-4 card p-3">
          <p className="text-sm font-semibold text-fg truncate">{userName}</p>
          <p className="text-xs text-fg-3 truncate mt-0.5">{userEmail}</p>
          <span className="badge-technical mt-2">{roleLabel}</span>
        </div>

        <nav className="py-2 space-y-0.5" aria-label="Secciones del panel">
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={activeId === item.id ? 'page' : undefined}
              className="nav-item"
            >
              <item.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-line">
        <BackdropToggle />
        <LogoutButton onLogout={onLogout} />
      </div>
    </aside>
  );
}

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  /** Acción o metadato alineado a la derecha. */
  aside?: ReactNode;
}

/** Cabecera de cada vista: antetítulo, titular display y descripción. */
export function PageHeader({ eyebrow, title, description, aside }: PageHeaderProps) {
  return (
    <div className="mb-8 pb-5 border-b border-line flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div className="max-w-2xl">
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h2 className="font-display font-bold text-2xl md:text-[28px] leading-tight tracking-[-0.015em] text-fg">{title}</h2>
        {description && <p className="text-sm text-fg-2 mt-2 leading-relaxed">{description}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}

/** Cabecera fija con pestañas desplazables (solo móvil). */
export function MobileHeader({ panelName, brandIcon: BrandIcon, items, activeId, onSelect, onLogout }: ShellProps) {
  return (
    <header className="sticky top-0 z-10 bg-surface border-b border-line md:hidden">
      <div className="px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 grid place-items-center bg-accent text-on-accent rounded-[2px] shrink-0">
            <BrandIcon className="w-4 h-4" aria-hidden="true" />
          </div>
          <p className="font-display font-bold text-sm text-fg truncate">{panelName}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <BackdropIconToggle />
          <LogoutButton onLogout={onLogout} compact />
        </div>
      </div>
      <nav className="flex overflow-x-auto px-2" aria-label="Secciones del panel">
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={activeId === item.id ? 'page' : undefined}
            className={`shrink-0 min-h-11 flex items-center gap-1.5 px-3 border-b-2 text-xs font-medium ${
              activeId === item.id ? 'border-accent text-accent-strong' : 'border-transparent text-fg-2'
            }`}
          >
            <item.icon className="w-4 h-4" aria-hidden="true" />
            <span>{item.shortLabel}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
