/**
 * @file AppShell.tsx
 * @description Barra lateral (escritorio) y cabecera con pestañas (móvil) compartidas por los paneles
 * de jóvenes y de empresas.
 */

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { LogOut, Pause, Sparkles } from 'lucide-react';
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
  /** Icono del panel. Ya no se pinta: la cabecera móvil usa el logotipo de Fad. */
  brandIcon?: LucideIcon;
  userName: string;
  userEmail: string;
  roleLabel: string;
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onLogout: () => void;
  /** Muestra el selector de fondo (quieto o animado). Por defecto, sí; el portal de empresa lo oculta. */
  showBackdropToggle?: boolean;
}

/**
 * Botón de cierre de sesión con confirmación rápida: el primer toque pide confirmar
 * y el segundo, dentro de 3 segundos, cierra la sesión.
 */
function LogoutButton({ onLogout }: { onLogout: () => void }) {
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
      className={`btn w-full ${armed ? 'btn-danger' : 'btn-secondary text-fg-2'}`}
    >
      <LogOut className="w-4 h-4" aria-hidden="true" />
      <span aria-live="polite">{armed ? '¿Confirmar salida?' : 'Cerrar sesión'}</span>
    </button>
  );
}

const BACKDROP_OPTIONS: { mode: PanelBackdropMode; label: string; icon: LucideIcon }[] = [
  { mode: 'static', label: 'Quieto', icon: Pause },
  { mode: 'live', label: 'Animado', icon: Sparkles },
];

/** Selector segmentado del fondo del panel (barra lateral y menú de cuenta en móvil). */
function BackdropToggle() {
  const [mode, setMode] = usePanelBackdrop();
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId}>
      <p id={labelId} className="text-sm text-fg-3 mb-1.5">Fondo del panel</p>
      <div className="grid grid-cols-2 gap-1 p-1 bg-canvas/40 border border-line rounded">
        {BACKDROP_OPTIONS.map(opt => {
          const active = mode === opt.mode;
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setMode(opt.mode)}
              aria-pressed={active}
              className={`min-h-11 flex items-center justify-center gap-1.5 rounded border text-sm font-medium ${
                active ? 'bg-accent-soft border-accent text-accent-strong' : 'border-transparent text-fg-2 hover:border-line-strong'
              }`}
            >
              <opt.icon className="w-4 h-4" aria-hidden="true" />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Iniciales para el avatar: primera letra de las dos primeras palabras del nombre. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map(part => part[0]!.toUpperCase()).join('') || '?';
}

/** Barra lateral fija del panel (solo escritorio). */
export function Sidebar({
  panelName,
  userName,
  userEmail,
  roleLabel,
  items,
  activeId,
  onSelect,
  onLogout,
  showBackdropToggle = true,
}: ShellProps) {
  return (
    <aside className="w-64 sticky top-0 h-dvh overflow-y-auto bg-surface border-r border-line hidden md:flex flex-col justify-between shrink-0">
      <div>
        <div className="px-5 py-5 border-b border-line flex items-center gap-3">
          <img src={fadLogo} alt="Fundación Fad Juventud" width={52} height={37} className="w-[52px] h-auto shrink-0" />
          <div className="pl-3 border-l border-line">
            <p className="font-display font-bold text-[15px] tracking-[-0.015em] text-fg leading-tight">Orientador Laboral</p>
            <p className="text-sm text-fg-3">{panelName}</p>
          </div>
        </div>

        <div className="mx-4 my-4 card p-3">
          <p className="text-sm font-semibold text-fg truncate">{userName}</p>
          <p className="text-meta text-fg-3 truncate mt-0.5">{userEmail}</p>
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

      <div className="p-4 border-t border-line space-y-3">
        {showBackdropToggle && <BackdropToggle />}
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
        <h2 className="font-display font-bold text-2xl md:text-heading leading-tight tracking-[-0.015em] text-fg">{title}</h2>
        {description && <p className="text-sm text-fg-2 mt-2 leading-relaxed">{description}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}

/** Alto de la fila de marca de la cabecera móvil (h-13 = 52 px); es lo que se recoge al bajar. */
const BRAND_ROW_PX = 52;

/**
 * Recoge la fila de marca al desplazarse hacia abajo y la devuelve al subir un poco.
 * Devuelve el estado y un setter para mostrarla de nuevo (p. ej. al recibir foco).
 */
function useCollapseOnScroll(): [boolean, (value: boolean) => void] {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        if (y <= BRAND_ROW_PX) setCollapsed(false);
        else if (y > lastY + 6) setCollapsed(true);
        else if (y < lastY - 6) setCollapsed(false);
        else return; // movimiento mínimo: se conserva la referencia para acumular
        lastY = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return [collapsed, setCollapsed];
}

/**
 * Marca los bordes de una fila desplazable que esconden contenido (data-fade-start / data-fade-end),
 * para que `.scroll-fade-x` pinte el fundido. Escribe en el DOM sin renderizar de nuevo.
 */
function useScrollFades(ref: RefObject<HTMLElement | null>): () => void {
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    el.toggleAttribute('data-fade-start', el.scrollLeft > 2);
    el.toggleAttribute('data-fade-end', el.scrollLeft < max - 2);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [ref, update]);

  return update;
}

/**
 * Cabecera fija (solo móvil): fila de marca con el logotipo y el menú de cuenta, y fila de pestañas
 * desplazables. Al bajar por la página la fila de marca se recoge y solo quedan las pestañas.
 */
export function MobileHeader({
  panelName,
  userName,
  userEmail,
  roleLabel,
  items,
  activeId,
  onSelect,
  onLogout,
  showBackdropToggle = true,
}: ShellProps) {
  const navRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [collapsed, setCollapsed] = useCollapseOnScroll();
  const updateFades = useScrollFades(navRef);

  // La pestaña activa siempre a la vista, centrada en la fila (sin mover la página en vertical).
  useLayoutEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    nav.scrollTo({
      left: active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2,
      behavior: reduced ? 'auto' : 'smooth',
    });
    updateFades();
  }, [activeId, updateFades]);

  // Si la fila de marca se recoge con el menú abierto, se cierra para no dejarlo flotando.
  useEffect(() => {
    if (collapsed && menuRef.current?.matches(':popover-open')) menuRef.current.hidePopover();
  }, [collapsed]);

  return (
    <header
      className={`sticky top-0 z-20 bg-surface border-b border-line md:hidden transition-[translate] duration-200 ease-out motion-reduce:transition-none ${
        collapsed ? '-translate-y-13' : ''
      }`}
    >
      {/* Con foco de teclado en la fila de marca, se vuelve a mostrar. */}
      <div className="h-13 pl-4 pr-2 flex items-center justify-between gap-3" onFocus={() => setCollapsed(false)}>
        <div className="flex items-center gap-3 min-w-0">
          <img src={fadLogo} alt="Fundación Fad Juventud" width={39} height={28} className="h-7 w-auto shrink-0" />
          <p className="pl-3 border-l border-line font-display font-bold text-sm text-fg truncate">{panelName}</p>
        </div>
        <button
          type="button"
          popoverTarget={menuId}
          aria-label={`Tu cuenta y ajustes: ${userName}`}
          className="btn btn-ghost btn-icon shrink-0"
        >
          <span
            aria-hidden="true"
            className="w-8 h-8 grid place-items-center rounded-full bg-accent-soft border border-accent/50 text-accent-strong text-meta font-bold"
          >
            {initialsOf(userName)}
          </span>
        </button>
      </div>

      <div ref={menuRef} id={menuId} popover="auto" className="menu-popover">
        <p className="text-sm font-semibold text-fg truncate">{userName}</p>
        <p className="text-meta text-fg-3 truncate mt-0.5">{userEmail}</p>
        <span className="badge-technical mt-2">{roleLabel}</span>
        <div className="mt-4 pt-4 border-t border-line space-y-3">
          {showBackdropToggle && <BackdropToggle />}
          <LogoutButton onLogout={onLogout} />
        </div>
      </div>

      <nav ref={navRef} className="scroll-fade-x flex overflow-x-auto px-1" aria-label="Secciones del panel">
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={activeId === item.id ? 'page' : undefined}
            className={`shrink-0 min-h-11 flex items-center gap-1.5 px-3 border-b-2 text-sm font-medium ${
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
