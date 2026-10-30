/**
 * @file LoginScreen.tsx
 * @description Pantalla de acceso: elección de perfil (Jóvenes / Empresas) con giro 3D de tarjeta
 * que revela el formulario de inicio de sesión, sobre un fondo animado que se carga en diferido.
 */

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { authService } from '../../auth/authService';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../auth/demoAccounts';
import type { UserRole, UserSession } from '../../types';
import type { BackdropVariant } from './LoginBackdrop';
import fadLogoUrl from '../../assets/brand/fad-juventud-light.png';

// three.js no debe bloquear el login: el fondo se descarga aparte.
const LoginBackdrop = lazy(() => import('./LoginBackdrop'));

const BACKDROP_STORAGE_KEY = 'it_orientador_login_backdrop';
const DESKTOP_QUERY = '(min-width: 768px)';
const FLIP_MS = 600;

const BACKDROP_OPTIONS: { value: BackdropVariant; label: string }[] = [
  { value: 'network', label: 'Red' },
  { value: 'gradient', label: 'Degradado' }
];

interface RoleCardContent {
  role: UserRole;
  title: string;
  description: string;
  features: string[];
  cta: string;
  accessLabel: string;
}

const ROLE_CARDS: RoleCardContent[] = [
  {
    role: 'young',
    title: 'Jóvenes y candidatos',
    description: 'Para ti, si buscas tu primer trabajo o vienes de otro sector y quieres cambiar de rumbo.',
    features: ['Descubre lo que ya sabes hacer', 'Tu plan paso a paso y tu CV', 'Ofertas con el salario a la vista', 'Practica entrevistas de trabajo', 'Cursos recomendados para ti'],
    cta: 'Soy joven',
    accessLabel: 'Acceso · Jóvenes'
  },
  {
    role: 'company',
    title: 'Empresas y organizaciones',
    description: 'Encontrad talento joven de forma ética: contacto directo con las personas candidatas, sin intermediarios ni comisiones.',
    features: ['Publicad vacantes con el salario visible', 'Candidaturas anónimas hasta abrir el contacto', 'Cifras de impacto de vuestras contrataciones'],
    cta: 'Soy empresa',
    accessLabel: 'Acceso · Empresas'
  }
];

/** Lee el fondo guardado; si el almacenamiento falla, usa la red. */
function readStoredBackdrop(): BackdropVariant {
  try {
    const stored = window.localStorage.getItem(BACKDROP_STORAGE_KEY);
    return stored === 'gradient' || stored === 'network' ? stored : 'network';
  } catch {
    return 'network';
  }
}

/** Indica si el viewport es de escritorio (≥768px). */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e: MediaQueryListEvent): void => setIsDesktop(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}

export default function LoginScreen({ onLogin }: { onLogin: (user: UserSession) => void }) {
  const isDesktop = useIsDesktop();

  // Perfil del formulario. Se conserva mientras la tarjeta gira de vuelta para que no "salte" el contenido.
  const [formRole, setFormRole] = useState<UserRole | null>(null);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  const [backdrop, setBackdrop] = useState<BackdropVariant>(readStoredBackdrop);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const timersRef = useRef<number[]>([]);

  /** Programa un temporizador que se limpia al desmontar. */
  const schedule = useCallback((fn: () => void, ms: number): void => {
    timersRef.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(id => window.clearTimeout(id));
  }, []);

  /** Elige perfil: gira la tarjeta correspondiente y lleva el foco al correo. */
  const handleChooseRole = (role: UserRole, e: ReactMouseEvent<HTMLButtonElement>): void => {
    openerRef.current = e.currentTarget;
    if (formRole !== role) {
      setAuthError('');
      setAuthPassword('');
      setShowPassword(false);
    }
    setFormRole(role);
    setIsFlipped(true);
    schedule(() => emailInputRef.current?.focus({ preventScroll: true }), 300);
  };

  /** Vuelve a la selección de perfil limpiando el formulario y devolviendo el foco. */
  const handleBackToRoles = useCallback((): void => {
    setIsFlipped(false);
    setAuthError('');
    setAuthPassword('');
    setShowPassword(false);
    schedule(() => openerRef.current?.focus({ preventScroll: true }), 50);
  }, [schedule]);

  // Escape también deshace el giro.
  useEffect(() => {
    if (!isFlipped) return;
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') handleBackToRoles();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isFlipped, handleBackToRoles]);

  // Al terminar el giro de vuelta se descarta el perfil del formulario.
  useEffect(() => {
    if (isFlipped || formRole === null) return;
    const id = window.setTimeout(() => setFormRole(null), FLIP_MS);
    return () => window.clearTimeout(id);
  }, [isFlipped, formRole]);

  /**
   * Valida las credenciales contra el servicio de autenticación.
   * El rol lo determina la cuenta; si no coincide con el perfil elegido se rechaza el acceso.
   */
  const handleAuthSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setAuthError('');

    if (!authEmail.trim() || !authPassword) {
      setAuthError('Por favor introduce tu correo y contraseña.');
      return;
    }

    setIsSubmittingAuth(true);
    const { user, error } = await authService.signIn(authEmail, authPassword);
    setIsSubmittingAuth(false);

    if (!user) {
      setAuthError(error);
      return;
    }

    if (user.role !== formRole) {
      await authService.signOut();
      setAuthError(
        user.role === 'young'
          ? 'Esta cuenta pertenece a un perfil de Jóvenes. Vuelve atrás y elige ese acceso.'
          : 'Esta cuenta pertenece a un perfil de Empresa. Vuelve atrás y elige ese acceso.'
      );
      return;
    }

    setAuthPassword('');
    onLogin(user);
  };

  /** Cambia el fondo y lo recuerda en este navegador. */
  const handleBackdropChange = (variant: BackdropVariant): void => {
    setBackdrop(variant);
    try {
      window.localStorage.setItem(BACKDROP_STORAGE_KEY, variant);
    } catch {
      // Sin almacenamiento disponible: el cambio solo dura esta visita.
    }
  };

  // En escritorio gira la tarjeta contraria (la elegida queda a la vista); en móvil, la propia.
  const flippedSlot: UserRole | null =
    formRole === null ? null : isDesktop ? (formRole === 'young' ? 'company' : 'young') : formRole;
  const demoEmail = DEMO_ACCOUNTS.find(account => account.role === formRole)?.email;
  const formCard = ROLE_CARDS.find(card => card.role === formRole);

  /** Cara trasera con el formulario de acceso para el perfil elegido. */
  const renderLoginForm = (): ReactNode => (
    <>
      <div className="flex items-center justify-between gap-3 mb-6">
        <span className="badge-technical">{formCard?.accessLabel}</span>
      </div>

      <h2 className="font-display font-bold text-2xl tracking-[-0.015em] text-fg">Iniciar sesión</h2>
      <p className="text-sm text-fg-2 mt-1 mb-6">Introduce tus datos para acceder a tu panel.</p>

      {authError && (
        <div
          role="alert"
          className="mb-4 p-3 border border-danger/40 border-l-2 border-l-danger bg-danger-soft rounded text-danger text-sm"
        >
          {authError}
        </div>
      )}

      <form onSubmit={handleAuthSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="auth-email" className="label-tech">Correo electrónico</label>
          <input
            ref={emailInputRef}
            id="auth-email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            placeholder="usuario@ejemplo.com"
            className="input-technical"
          />
        </div>

        <div>
          <label htmlFor="auth-password" className="label-tech">Contraseña</label>
          <div className="relative">
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="••••••••"
              className="input-technical pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute inset-y-0 right-0 w-11 grid place-items-center text-fg-3 hover:text-fg"
            >
              {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isSubmittingAuth} className="btn btn-primary w-full">
          {isSubmittingAuth && <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" />}
          <span>{isSubmittingAuth ? 'Comprobando…' : 'Entrar en la plataforma'}</span>
        </button>
        <button type="button" onClick={handleBackToRoles} className="btn btn-secondary w-full">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Volver
        </button>
      </form>

      {demoEmail && (
        <div className="mt-6 pt-4 border-t border-line text-xs text-fg-3 leading-relaxed">
          <p>
            Cuenta de prueba: <span className="text-fg font-medium break-all">{demoEmail}</span>
          </p>
          <p className="mt-1">
            Contraseña: <strong className="text-accent-strong font-bold">{DEMO_PASSWORD}</strong>
          </p>
          <button
            type="button"
            onClick={() => {
              setAuthEmail(demoEmail);
              setAuthPassword(DEMO_PASSWORD);
            }}
            className="mt-2 min-h-9 text-xs text-accent-strong hover:underline cursor-pointer block text-left"
          >
            Rellenar automáticamente con la cuenta de prueba
          </button>
        </div>
      )}
    </>
  );

  const faceBase =
    'card-technical bg-surface p-6 md:p-8 flex flex-col [grid-area:1/1] [backface-visibility:hidden] ' +
    'motion-reduce:transition-opacity motion-reduce:duration-200';

  return (
    <div className="relative isolate min-h-dvh bg-canvas text-fg">
      <Suspense fallback={null}>
        <LoginBackdrop variant={backdrop} focus={isFlipped ? formRole : null} />
      </Suspense>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 md:py-20">

        {/* Encabezado institucional */}
        <header className="mb-10 md:mb-14 max-w-3xl">
          <img
            src={fadLogoUrl}
            alt="Fundación Fad Juventud"
            width={136}
            height={97}
            className="w-[136px] h-auto mb-8"
          />
          <h1 className="font-display font-bold text-[34px] md:text-[44px] leading-[1.05] tracking-[-0.015em] text-fg mb-4">
            Sistema integrado de orientación y empleabilidad
          </h1>
          <p className="text-base text-fg-2 leading-relaxed max-w-2xl">
            Una iniciativa de Fundación Fad Juventud para acompañar a jóvenes hacia su primer empleo
            y conectar a las organizaciones con talento joven y personas que cambian de sector.
          </p>
        </header>

        {/* Tarjetas de perfil con giro 3D */}
        <div className="grid md:grid-cols-2 gap-4">
          {ROLE_CARDS.map(card => {
            const flipped = isFlipped && flippedSlot === card.role;
            const hasBack = flippedSlot === card.role;
            const selected = isFlipped && formRole === card.role && !flipped;

            return (
              <div key={card.role} className="[perspective:1400px]">
                <div
                  className={
                    'grid h-full [transform-style:preserve-3d] transition-transform duration-[600ms] ' +
                    'ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none motion-reduce:[transform:none] ' +
                    (flipped ? '[transform:rotateY(180deg)]' : '[transform:rotateY(0deg)]')
                  }
                >
                  {/* Cara delantera: presentación del perfil */}
                  <article
                    inert={flipped}
                    aria-hidden={flipped || undefined}
                    className={
                      faceBase +
                      (flipped ? ' pointer-events-none motion-reduce:opacity-0' : ' motion-reduce:opacity-100') +
                      (selected ? ' border-accent shadow-[inset_0_2px_0_var(--color-accent)]' : '')
                    }
                  >
                    <h2 className="font-display font-bold text-xl tracking-[-0.015em] text-fg mb-2">{card.title}</h2>
                    <p className="text-sm text-fg-2 leading-relaxed mb-5">{card.description}</p>
                    <ul className="border-t border-line mb-8">
                      {card.features.map(feature => (
                        <li key={feature} className="flex items-center gap-3 py-2.5 border-b border-line text-sm text-fg">
                          <span className="w-2 h-px bg-fg-3 shrink-0" aria-hidden="true" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={(e) => handleChooseRole(card.role, e)}
                      aria-pressed={selected}
                      className={`btn ${card.role === 'young' ? 'btn-primary' : 'btn-secondary'} mt-auto self-start`}
                    >
                      {card.cta}
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </article>

                  {/* Cara trasera: formulario de acceso */}
                  <section
                    inert={!flipped}
                    aria-hidden={!flipped || undefined}
                    aria-label={hasBack ? 'Iniciar sesión' : undefined}
                    className={
                      faceBase +
                      ' [transform:rotateY(180deg)] motion-reduce:[transform:none]' +
                      (flipped ? ' motion-reduce:opacity-100' : ' pointer-events-none motion-reduce:opacity-0')
                    }
                  >
                    {hasBack && renderLoginForm()}
                  </section>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="mt-16 pt-5 border-t border-line flex flex-wrap justify-between gap-2 text-xs text-fg-3">
          <span>Fundación Fad Juventud</span>
          <span>Orientador Laboral</span>
        </footer>
      </div>

      {/* Selector de fondo */}
      <div
        role="group"
        aria-label="Fondo de la pantalla"
        className="relative z-20 w-fit mx-auto mb-8 md:fixed md:m-0 md:bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] md:right-[calc(env(safe-area-inset-right,0px)+1rem)] flex items-center gap-2 p-1 pl-3 bg-surface border border-line rounded"
      >
        <span className="text-xs text-fg-3">Fondo</span>
        <div className="flex">
          {BACKDROP_OPTIONS.map(option => {
            const active = backdrop === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => handleBackdropChange(option.value)}
                className={
                  'min-h-8 px-3 text-xs rounded transition-colors ' +
                  (active ? 'bg-raised text-fg' : 'text-fg-3 hover:text-fg')
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
