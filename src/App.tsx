import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Code,
  Compass,
  FileText,
  GraduationCap,
  Layers,
  LoaderCircle,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Terminal,
  TrendingUp,
  Zap
} from 'lucide-react';

// Servicio de autenticación (demo hoy, Supabase en el futuro)
import { authService } from './auth/authService';

// Pantalla de acceso con volteo de fichas
import LoginScreen from './components/auth/LoginScreen';

// Estructura común de los paneles e indicadores
import { MobileHeader, PageHeader, Sidebar } from './components/common/AppShell';
import type { NavItem } from './components/common/AppShell';
import VuMeter from './components/common/VuMeter';
import AmbientBackground from './components/common/AmbientBackground';

// Recomendador de itinerarios formativos
import TrainingRecommender from './components/training/TrainingRecommender';
import PlanCourses from './components/training/PlanCourses';

// Panel de empresas: vacantes, candidaturas e impacto
import CompanyPanel from './components/company/CompanyPanel';

// Comparación de tecnologías con los requisitos del puesto
import { coversRequirement } from './lib/skillMatch';
import { gapSkillList, planGaps } from './lib/courseRecommendations';
import { scoreAnswer } from './lib/answerScore';

// Ofertas de empleo y perfil del joven (diagnóstico ampliado, guardado por email)
import { Briefcase as OffersIcon } from 'lucide-react';
import OffersSection from './components/offers/OffersSection';
import type { OffersView } from './components/offers/OffersSection';
import OffersNotice from './components/offers/OffersNotice';
import { PortfolioFields, WorkExperienceFields } from './components/profile/WorkExperienceFields';
import { useUnseenApplications } from './hooks/useOffers';
import { loadYoungProfile, saveYoungProfile } from './lib/youngProfileStorage';
import type { CandidateProfile, WorkExperience } from './types';
import { GENERAL_SKILLS } from './mockData';
import { SkillPicker } from './components/profile/SkillPicker';

// Scroll suave (Lenis)
import { scrollToTop, useSmoothScroll } from './lib/smoothScroll';

// Importación de Tipos e Interfaces
import type {
  UserSession,
  InterviewFeedback
} from './types';

// Importación de Base de Datos Estática
import {
  ROLE_DATABASE,
  INTERVIEW_QUESTIONS_DATABASE
} from './mockData';

// ============================================================================
// CONFIGURACIÓN ESTÁTICA DE LA INTERFAZ
// ============================================================================

/** Secciones del panel de jóvenes (barra lateral y pestañas móviles). */
const YOUNG_NAV: NavItem[] = [
  { id: 'welcome', label: 'Inicio y perfil', shortLabel: 'Inicio', icon: Compass },
  { id: 'diagnostic', label: 'Diagnóstico de tu perfil', shortLabel: 'Diagnóstico', icon: Layers },
  { id: 'roadmap', label: 'Plan de acción y CV', shortLabel: 'Plan & CV', icon: TrendingUp },
  { id: 'offers', label: 'Ofertas', shortLabel: 'Ofertas', icon: OffersIcon },
  { id: 'interview', label: 'Simulador de entrevista', shortLabel: 'Entrevista', icon: Terminal },
  { id: 'ask', label: 'Consultas al mentor', shortLabel: 'Mentor', icon: MessageSquare },
  { id: 'training', label: 'Formación recomendada', shortLabel: 'Formación', icon: GraduationCap }
];

const EXPERIENCE_LABELS: Record<string, string> = {
  '0-6': '0–6 meses',
  '6-12': '6–12 meses',
  '12+': 'Más de 1 año'
};

const BLOCKER_OPTIONS: Array<{ id: string; title: string; description: string }> = [
  { id: 'cv', title: 'No me llaman', description: 'Envío mi CV, pero no me llaman para una primera entrevista.' },
  { id: 'technical', title: 'Me atasco en las pruebas', description: 'Llego a las entrevistas, pero me bloqueo en las pruebas prácticas o de código.' },
  { id: 'stack', title: 'No sé por dónde seguir', description: 'No sé qué aprender ahora ni en qué orden hacerlo.' }
];

interface ChatMessage {
  sender: 'bot' | 'user';
  text: string;
  /** Hora local HH:MM en la que se envió. */
  time: string;
}

/** Hora local en formato HH:MM para el registro del chat. */
const currentTime = (): string =>
  new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

/**
 * Componente Principal de la Aplicación.
 * Gestiona el flujo de autenticación, el control de acceso por roles (Jóvenes vs Empresa),
 * el estado persistente en LocalStorage y los submódulos correspondientes.
 */
export default function App() {

  // ============================================================================
  // 1. ESTADOS DE SESIÓN Y AUTENTICACIÓN
  // ============================================================================

  /**
   * Usuario actualmente autenticado.
   * Se recupera del servicio de autenticación al montar la app para mantener la sesión tras recargar.
   */
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState<boolean>(true);

  useEffect(() => {
    authService.getSession()
      .then(setCurrentUser)
      .finally(() => setIsSessionLoading(false));
  }, []);

  // ============================================================================
  // 2. ESTADOS DEL PANEL DE JÓVENES
  // ============================================================================

  const [activeTabYoung, setActiveTabYoung] = useState<string>('welcome');
  const [profileTypeYoung, setProfileTypeYoung] = useState<string | null>(null);

  // Formulario de Diagnóstico
  const [targetRole, setTargetRole] = useState<string>('frontend');
  const [techStack, setTechStack] = useState<string[]>([]);
  const [englishLevel, setEnglishLevel] = useState<string>('B1');
  const [experienceMonths, setExperienceMonths] = useState<string>('0-6');
  const [mainBlocker, setMainBlocker] = useState<string>('cv');

  // Perfil ampliado para las ofertas: lo que está aprendiendo, experiencia laboral y portfolio
  const [learningSkills, setLearningSkills] = useState<string[]>([]);
  const [workExperience, setWorkExperience] = useState<WorkExperience[]>([]);
  const [portfolioUrl, setPortfolioUrl] = useState<string>('');
  const [mainProject, setMainProject] = useState<string>('');
  const [practicedInterview, setPracticedInterview] = useState<boolean>(false);
  const [offersView, setOffersView] = useState<OffersView>('deck');
  /** Email cuyo perfil guardado ya se ha cargado (evita sobrescribirlo con los valores por defecto). */
  const [profileLoadedFor, setProfileLoadedFor] = useState<string | null>(null);

  const youngEmail = currentUser?.role === 'young' ? currentUser.email : null;
  const unseenApplications = useUnseenApplications(youngEmail);

  // Al entrar un joven, recupera su perfil guardado en este navegador.
  useEffect(() => {
    if (!youngEmail) return;
    const saved = loadYoungProfile(youngEmail);
    setProfileTypeYoung(saved.profileType);
    setTargetRole(ROLE_DATABASE[saved.targetRole] ? saved.targetRole : 'frontend');
    setTechStack(saved.techStack);
    setLearningSkills(saved.learningSkills);
    setEnglishLevel(saved.englishLevel);
    setExperienceMonths(saved.experienceMonths);
    setMainBlocker(saved.mainBlocker);
    setWorkExperience(saved.workExperience);
    setPortfolioUrl(saved.portfolioUrl);
    setMainProject(saved.mainProject);
    setPracticedInterview(saved.practicedInterview);
    setProfileLoadedFor(youngEmail);
  }, [youngEmail]);

  // Guarda el perfil cada vez que cambia (solo después de haberlo cargado).
  useEffect(() => {
    if (!youngEmail || profileLoadedFor !== youngEmail) return;
    saveYoungProfile(youngEmail, {
      profileType: profileTypeYoung === 'junior' || profileTypeYoung === 'reskill' ? profileTypeYoung : null,
      targetRole,
      techStack,
      learningSkills,
      englishLevel,
      experienceMonths,
      mainBlocker,
      workExperience,
      portfolioUrl,
      mainProject,
      practicedInterview
    });
  }, [youngEmail, profileLoadedFor, profileTypeYoung, targetRole, techStack, learningSkills, englishLevel, experienceMonths, mainBlocker, workExperience, portfolioUrl, mainProject, practicedInterview]);

  /** Perfil que se envía a la empresa con "Me interesa" (sin nombre ni email visibles hasta abrir el contacto). */
  const candidateProfile = useMemo<CandidateProfile | null>(() => {
    if (!currentUser || currentUser.role !== 'young') return null;
    return {
      email: currentUser.email,
      name: currentUser.name,
      profileType: profileTypeYoung === 'junior' || profileTypeYoung === 'reskill' ? profileTypeYoung : null,
      targetRole: ROLE_DATABASE[targetRole]?.name ?? targetRole,
      techStack,
      learningSkills,
      englishLevel,
      experienceMonths,
      // Solo las experiencias con algo escrito.
      workExperience: workExperience.filter(item => item.role.trim() || item.tasks.trim()),
      portfolioUrl: portfolioUrl.trim(),
      mainProject: mainProject.trim(),
      practicedInterview
    };
  }, [currentUser, profileTypeYoung, targetRole, techStack, learningSkills, englishLevel, experienceMonths, workExperience, portfolioUrl, mainProject, practicedInterview]);

  /** Marca (o desmarca) habilidades como "Lo estoy aprendiendo". */
  const handleToggleLearning = (skills: string[], learning: boolean): void => {
    setLearningSkills(prev =>
      learning ? [...new Set([...prev, ...skills])] : prev.filter(skill => !skills.includes(skill))
    );
  };

  // Simulador de Entrevista Técnica
  const [interviewRole, setInterviewRole] = useState<string>('frontend');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [interviewFeedback, setInterviewFeedback] = useState<InterviewFeedback | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  // Chat con el Mentor IT
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      sender: 'bot',
      text: '¡Hola! Soy tu mentor. Puedo ayudarte con dudas sobre cómo conseguir tu primer empleo, qué proyectos hacer, cuánto pedir de sueldo o cómo pasar los filtros de selección. ¿Qué quieres preguntar hoy?',
      time: currentTime()
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para el chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ============================================================================
  // 3. ESTADOS Y PERSISTENCIA DEL PANEL DE EMPRESAS
  // ============================================================================

  // El panel de empresas (vacantes, candidaturas e impacto) gestiona su propio estado en
  // `components/company/CompanyPanel.tsx` y guarda los datos con `offersService`.

  // ============================================================================
  // 4. MANEJO DE SESIÓN Y AUTENTICACIÓN
  // ============================================================================

  /**
   * Cierra la sesión activa y reinicia el estado global de la aplicación.
   */
  const handleLogout = async (): Promise<void> => {
    await authService.signOut();
    setCurrentUser(null);
  };

  // ============================================================================
  // 5. MÉTODOS DEL MÓDULO DE JÓVENES
  // ============================================================================

  const handleTechToggle = (tech: string): void => {
    setTechStack(prev =>
      prev.includes(tech) ? prev.filter(t => t !== tech) : [...prev, tech]
    );
  };

  const filteredQuestions = INTERVIEW_QUESTIONS_DATABASE.filter(
    q => q.role === interviewRole || q.role === 'general' || (profileTypeYoung === 'reskill' && q.role === 'reskill')
  );

  /** Requisitos imprescindibles del rol objetivo marcados como cubiertos o pendientes. */
  const mustHaveStatus = ROLE_DATABASE[targetRole].mustHave.map(req => ({
    req,
    hasIt: coversRequirement(req, techStack)
  }));
  const stackCoverage = (mustHaveStatus.filter(s => s.hasIt).length / mustHaveStatus.length) * 100;

  /** Lo que le falta según el plan, traducido a habilidades de los cursos de la base de datos. */
  const requirementGaps = useMemo(
    () => planGaps(ROLE_DATABASE[targetRole].mustHave.filter(req => !coversRequirement(req, techStack)), techStack),
    [targetRole, techStack]
  );
  const planGapSkills = useMemo(() => gapSkillList(requirementGaps), [requirementGaps]);

  const handleEvaluateAnswer = (): void => {
    if (!userAnswer.trim()) return;
    setIsEvaluating(true);

    setTimeout(() => {
      const keyPoints = filteredQuestions[currentQuestionIdx]?.keyPoints || [];
      const { score, covered, missing } = scoreAnswer(userAnswer, keyPoints);
      setIsEvaluating(false);
      setPracticedInterview(true);
      setInterviewFeedback({
        score,
        strengths: covered.length > 0
          ? `Mencionas ${covered.length} de las ${keyPoints.length} ideas clave que suele buscar quien entrevista.`
          : 'Te has animado a responder: es el primer paso. Ahora toca incluir las ideas clave de la pregunta.',
        suggestions: missing.length > 0
          ? 'Revisa las ideas clave de abajo que no aparecen en tu respuesta y añade un ejemplo de algo que hayas hecho.'
          : 'Están todas las ideas clave. Para redondear, añade un ejemplo concreto de un proyecto tuyo.',
        checklist: keyPoints
      });
    }, 1000);
  };

  /** Cambia el puesto del simulador y empieza desde la primera pregunta. */
  const changeInterviewRole = (role: string): void => {
    setInterviewRole(role);
    setCurrentQuestionIdx(0);
    setInterviewFeedback(null);
    setUserAnswer('');
  };

  const handleNextQuestion = (): void => {
    setUserAnswer('');
    setInterviewFeedback(null);
    setCurrentQuestionIdx((prev) => (prev + 1) % filteredQuestions.length);
  };

  const handleSendChatMessage = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userText, time: currentTime() }]);
    setChatInput('');

    setTimeout(() => {
      let reply = "Para destacar en tu primer empleo, concéntrate en tener 2 proyectos reales publicados en internet (con el código ordenado en GitHub y bien explicado en el README) más que en acumular certificados.";
      const lower = userText.toLowerCase();

      if (lower.includes('cv') || lower.includes('curriculum') || lower.includes('resume')) {
        reply = "Para tu CV: Mantenlo en 1 sola página. Pon tus proyectos en la parte superior, con enlace directo a la versión publicada y a GitHub. Describe qué problemas resolviste y qué tecnologías usaste, no solo listas de cursos.";
      } else if (lower.includes('inglés') || lower.includes('english')) {
        reply = "El inglés es un multiplicador de oportunidades. Con nivel B1/B2 puedes optar a empresas internacionales o consultoras globales. Practica leer documentación técnica en inglés y prepara una presentación breve de ti (lo que contarías en un minuto).";
      } else if (lower.includes('sueldo') || lower.includes('salario') || lower.includes('cobrar')) {
        reply = "En España/LATAM, el sueldo de entrada para un primer empleo junior oscila entre 18.000€ y 26.000€ brutos anuales según la ciudad y la tecnología. Prioriza empresas donde tengas personas con experiencia que te enseñen antes que 2.000€ más de salario inicial.";
      } else if (lower.includes('reconversión') || lower.includes('cambio') || lower.includes('edad')) {
        reply = "Cambiar de sector hacia la tecnología es muy valorado si sabes poner en valor tu experiencia anterior. Un profesional con experiencia laboral previa aporta gestión del estrés, comunicación y madurez que un recién graduado a menudo aún no posee.";
      }

      setChatMessages(prev => [...prev, { sender: 'bot', text: reply, time: currentTime() }]);
    }, 800);
  };

  // ============================================================================
  // 7. SCROLL SUAVE
  // ============================================================================
  useSmoothScroll();

  // Cada pestaña o vista nueva empieza arriba, como una página nueva.
  useEffect(() => {
    scrollToTop();
  }, [currentUser, activeTabYoung]);

  // ============================================================================
  // RENDER: CARGA DE SESIÓN
  // ============================================================================
  if (isSessionLoading) {
    return (
      <div className="min-h-dvh bg-ambient grid place-items-center">
        <LoaderCircle className="w-6 h-6 text-accent animate-spin" aria-label="Cargando" />
      </div>
    );
  }

  // ============================================================================
  // RENDER: PANTALLA DE BIENVENIDA, SELECCIÓN DE ROL Y ACCESO
  // ============================================================================
  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  // ============================================================================
  // RENDER: MÓDULO DE JÓVENES (ACCESO AUTENTICADO BLOQUEADO POR ROL)
  // ============================================================================
  if (currentUser.role === 'young') {
    const youngShell = {
      panelName: 'Panel de jóvenes',
      brandIcon: Compass,
      userName: currentUser.name,
      userEmail: currentUser.email,
      roleLabel: 'Joven talento',
      // El menú "Ofertas" muestra cuántas candidaturas tienen respuestas sin ver.
      items: YOUNG_NAV.map(item =>
        item.id === 'offers' && unseenApplications > 0
          ? { ...item, label: `Ofertas (${unseenApplications})`, shortLabel: `Ofertas (${unseenApplications})` }
          : item
      ),
      activeId: activeTabYoung,
      onSelect: setActiveTabYoung,
      onLogout: handleLogout
    };
    const currentQuestion = filteredQuestions[currentQuestionIdx];
    const filledJobs = workExperience.filter(item => item.role.trim()).length;

    return (
      <div className="flex min-h-dvh bg-ambient text-fg">
        <AmbientBackground />
        <Sidebar {...youngShell} />

        <main className={`flex-1 flex flex-col min-w-0 ${activeTabYoung === 'ask' ? 'h-dvh' : ''}`}>
          <MobileHeader {...youngShell} />

          {/* TAB 1: INICIO */}
          {activeTabYoung === 'welcome' && (
            <div className="flex-1 px-4 py-8 md:p-10 max-w-5xl mx-auto w-full animate-enter">
              <PageHeader
                eyebrow="Orientación laboral personalizada"
                title="Da el paso hacia tu primer empleo en tecnología"
                description="Si te está costando encontrar tu primer trabajo, aquí te acompañamos. Descubre en qué punto estás, qué conocimientos piden las empresas y practica entrevistas antes de la de verdad."
              />

              <OffersNotice
                count={unseenApplications}
                onOpen={() => { setOffersView('applications'); setActiveTabYoung('offers'); }}
              />

              <h3 className="label-tech mb-3">Paso 1 · Elige tu punto de partida</h3>

              <div className="grid md:grid-cols-2 gap-4 mb-10">
                {[
                  {
                    id: 'junior',
                    icon: Code,
                    title: 'Acabo de formarme en tecnología',
                    text: 'Has terminado hace poco una FP, un grado o un bootcamp (curso intensivo) de programación, sistemas o datos, y quieres ordenar lo que sabes para pasar de las prácticas a tu primer contrato.',
                    cta: 'Empezar mi diagnóstico'
                  },
                  {
                    id: 'reskill',
                    icon: Sparkles,
                    title: 'Vengo de otro sector',
                    text: 'Has trabajado en otros ámbitos (administración, ventas, educación, diseño…) y quieres aprovechar esa experiencia junto a lo que estás aprendiendo de tecnología.',
                    cta: 'Empezar mi diagnóstico de cambio de sector'
                  }
                ].map(profile => (
                  <button
                    key={profile.id}
                    type="button"
                    aria-pressed={profileTypeYoung === profile.id}
                    onClick={() => { setProfileTypeYoung(profile.id); setActiveTabYoung('diagnostic'); }}
                    className="option p-6 flex flex-col gap-3"
                  >
                    <profile.icon className="w-5 h-5 text-accent" aria-hidden="true" />
                    <span className="font-display font-bold text-lg tracking-[-0.015em] text-fg">{profile.title}</span>
                    <span className="text-sm text-fg-2 leading-relaxed">{profile.text}</span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-accent-strong mt-auto">
                      {profile.cta}
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </span>
                  </button>
                ))}
              </div>

              <section className="card p-6" aria-labelledby="how-it-works">
                <h3 id="how-it-works" className="label-tech mb-5">¿Cómo funciona esta plataforma?</h3>
                <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { title: 'Descubre dónde estás', text: 'Comparamos lo que ya sabes con lo que piden hoy las ofertas de empleo.' },
                    { title: 'Prepara tu plan', text: 'Te decimos qué aprender primero y cómo mejorar tu CV y tus proyectos.' },
                    { title: 'Practica entrevistas', text: 'Responde preguntas reales de entrevista y recibe consejos para mejorar.' }
                  ].map((step, idx) => (
                    <li key={step.title} className="border-t-2 border-fg pt-3">
                      <span className="text-xs font-medium text-fg-3">Paso {idx + 1}</span>
                      <p className="font-display font-semibold text-fg mt-1">{step.title}</p>
                      <p className="text-sm text-fg-2 mt-1 leading-relaxed">{step.text}</p>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          )}

          {/* TAB 2: DIAGNÓSTICO TÉCNICO */}
          {activeTabYoung === 'diagnostic' && (
            <div className="flex-1 px-4 py-8 md:p-10 max-w-6xl mx-auto w-full animate-enter">
              <PageHeader
                eyebrow="Paso 2 de 4"
                title="Cuéntanos en qué punto estás"
                description="Responde unas preguntas rápidas y prepararemos tu plan de acción."
              />

              <div className="grid lg:grid-cols-[1fr_280px] gap-8 items-start">
                <div className="space-y-10">
                  <fieldset>
                    <legend className="label-tech mb-3">¿A qué puesto te gustaría dedicarte?</legend>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
                      {Object.keys(ROLE_DATABASE).map((roleKey) => (
                        <button
                          key={roleKey}
                          type="button"
                          aria-pressed={targetRole === roleKey}
                          onClick={() => setTargetRole(roleKey)}
                          className="option font-medium"
                        >
                          {ROLE_DATABASE[roleKey].name}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend className="label-tech mb-3">Tecnologías con las que ya has hecho al menos un proyecto</legend>
                    <SkillPicker selected={techStack} onToggle={handleTechToggle} excluded={GENERAL_SKILLS} />
                  </fieldset>

                  {/* Habilidades útiles fuera de la programación (se guardan junto a las tecnologías) */}
                  <fieldset>
                    <legend className="label-tech mb-1">Otras habilidades que ya usas en el trabajo o en tu día a día</legend>
                    <p className="text-sm text-fg-2 mb-3">Muchas empresas las piden y también abren puertas en tecnología.</p>
                    <div className="flex flex-wrap gap-2">
                      {GENERAL_SKILLS.map((skill) => {
                        const isSelected = techStack.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => handleTechToggle(skill)}
                            className="chip"
                          >
                            {isSelected ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Plus className="w-3.5 h-3.5 text-fg-3" aria-hidden="true" />}
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <WorkExperienceFields value={workExperience} onChange={setWorkExperience} />

                  <PortfolioFields
                    portfolioUrl={portfolioUrl}
                    mainProject={mainProject}
                    onPortfolioUrlChange={setPortfolioUrl}
                    onMainProjectChange={setMainProject}
                  />

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="english-level" className="label-tech">Tu nivel de inglés</label>
                      <select
                        id="english-level"
                        value={englishLevel}
                        onChange={(e) => setEnglishLevel(e.target.value)}
                        className="input-technical"
                      >
                        <option value="A2">Básico (A2) - Leo textos técnicos con ayuda</option>
                        <option value="B1">Intermedio (B1) - Entiendo textos técnicos y mantengo conversaciones breves</option>
                        <option value="B2">Fluido (B2) - Puedo hacer una entrevista de trabajo completa en inglés</option>
                        <option value="C1">Avanzado (C1/C2) - Sin limitaciones de idioma</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="experience" className="label-tech">Tu práctica con proyectos de tecnología</label>
                      <select
                        id="experience"
                        value={experienceMonths}
                        onChange={(e) => setExperienceMonths(e.target.value)}
                        aria-describedby="experience-hint"
                        className="input-technical"
                      >
                        <option value="0-6">Proyectos de clase o del curso (0–6 meses)</option>
                        <option value="6-12">Proyectos propios o prácticas (6–12 meses)</option>
                        <option value="12+">Más de 1 año con proyectos de tecnología</option>
                      </select>
                      <p id="experience-hint" className="text-xs text-fg-2 mt-1.5">
                        Solo lo que has hecho con tecnología. Tu experiencia en otros trabajos va en «Experiencia laboral» y cuenta igual.
                      </p>
                    </div>
                  </div>

                  <fieldset>
                    <legend className="label-tech mb-3">¿Qué es lo que más te frena ahora mismo?</legend>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {BLOCKER_OPTIONS.map(blocker => (
                        <button
                          key={blocker.id}
                          type="button"
                          aria-pressed={mainBlocker === blocker.id}
                          onClick={() => setMainBlocker(blocker.id)}
                          className="option"
                        >
                          <span className="block font-semibold text-fg mb-1">{blocker.title}</span>
                          {blocker.description}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div className="pt-2 flex justify-end">
                    <button type="button" onClick={() => setActiveTabYoung('roadmap')} className="btn btn-primary">
                      Ver mi plan de acción
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Resumen del perfil en tiempo real */}
                <aside className="card-technical p-5 lg:sticky lg:top-6" aria-label="Resumen de tu perfil">
                  <p className="eyebrow mb-4">Tu perfil</p>
                  <dl className="text-sm divide-y divide-line">
                    <div className="py-2 flex justify-between gap-3">
                      <dt className="text-fg-3">Puesto que buscas</dt>
                      <dd className="font-semibold text-fg text-right">{ROLE_DATABASE[targetRole].name}</dd>
                    </div>
                    <div className="py-2 flex justify-between gap-3">
                      <dt className="text-fg-3">Tecnologías</dt>
                      <dd className="text-fg">{techStack.length}</dd>
                    </div>
                    <div className="py-2 flex justify-between gap-3">
                      <dt className="text-fg-3">Inglés</dt>
                      <dd className="text-fg">{englishLevel}</dd>
                    </div>
                    <div className="py-2 flex justify-between gap-3">
                      <dt className="text-fg-3">Práctica en tecnología</dt>
                      <dd className="text-fg text-right">{EXPERIENCE_LABELS[experienceMonths]}</dd>
                    </div>
                    <div className="py-2 flex justify-between gap-3">
                      <dt className="text-fg-3">Experiencia laboral</dt>
                      <dd className="text-fg text-right">
                        {filledJobs === 0 ? 'Sin añadir' : `${filledJobs} ${filledJobs === 1 ? 'puesto' : 'puestos'}`}
                      </dd>
                    </div>
                    <div className="py-2 flex justify-between gap-3">
                      <dt className="text-fg-3">Lo que te frena</dt>
                      <dd className="text-fg text-right">{BLOCKER_OPTIONS.find(b => b.id === mainBlocker)?.title}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 pt-4 border-t border-line">
                    <p className="text-xs text-fg-2 mb-2">Lo básico del puesto que ya dominas</p>
                    <VuMeter value={stackCoverage} label="cubierto" tone={stackCoverage >= 60 ? 'ok' : 'gap'} />
                  </div>
                </aside>
              </div>
            </div>
          )}

          {/* TAB 3: PLAN DE ACCIÓN */}
          {activeTabYoung === 'roadmap' && (
            <div className="flex-1 px-4 py-8 md:p-10 max-w-5xl mx-auto w-full animate-enter">
              <PageHeader
                eyebrow="Paso 3 de 4"
                title="Tu plan de acción"
                description="Pasos concretos según tus respuestas y lo que buscan hoy las empresas."
                aside={
                  <button type="button" onClick={() => setActiveTabYoung('diagnostic')} className="btn btn-secondary">
                    Ajustar respuestas
                  </button>
                }
              />

              {/* Ficha del puesto */}
              <section className="card-technical p-6 mb-4">
                <p className="eyebrow mb-1">El puesto que buscas</p>
                <h3 className="font-display font-bold text-2xl tracking-[-0.015em] text-fg mb-5">{ROLE_DATABASE[targetRole].name}</h3>
                <dl className="grid sm:grid-cols-3 border border-line divide-y sm:divide-y-0 sm:divide-x divide-line rounded-[2px]">
                  <div className="p-4">
                    <dt className="label-tech">Ofertas de empleo</dt>
                    <dd className="font-semibold text-ok">{ROLE_DATABASE[targetRole].marketDemand}</dd>
                  </div>
                  <div className="p-4">
                    <dt className="label-tech">Sueldo al empezar</dt>
                    <dd className="text-sm text-fg">{ROLE_DATABASE[targetRole].avgSalaryJunior}</dd>
                  </div>
                  <div className="p-4">
                    <dt className="label-tech">Lo básico que ya dominas</dt>
                    <dd><VuMeter value={stackCoverage} label="cubierto" tone={stackCoverage >= 60 ? 'ok' : 'gap'} /></dd>
                  </div>
                </dl>
              </section>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <section className="card p-6">
                  <h4 className="label-tech flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-ok" aria-hidden="true" />
                    Tus puntos fuertes
                  </h4>
                  <ul className="space-y-2 mb-8 text-sm">
                    {techStack.length > 0 ? (
                      techStack.map(t => (
                        <li key={t} className="flex items-center gap-2 text-fg-2">
                          <span className="w-1.5 h-1.5 bg-ok shrink-0" aria-hidden="true" />
                          <span>Ya has trabajado con <strong className="text-fg">{t}</strong></span>
                        </li>
                      ))
                    ) : (
                      <li className="text-fg-3">Todavía no has marcado ninguna tecnología. Te recomendamos empezar por las básicas del puesto.</li>
                    )}
                    {profileTypeYoung === 'reskill' && (
                      <li className="flex items-center gap-2 text-fg-2">
                        <span className="w-1.5 h-1.5 bg-ok shrink-0" aria-hidden="true" />
                        <span>Tu experiencia laboral anterior (trato con personas, organización y capacidad de adaptarte).</span>
                      </li>
                    )}
                    <li className="flex items-center gap-2 text-fg-2">
                      <span className="w-1.5 h-1.5 bg-ok shrink-0" aria-hidden="true" />
                      <span>Inglés {englishLevel}: suficiente para consultar documentación y tutoriales.</span>
                    </li>
                  </ul>

                  <h4 className="label-tech flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-gap" aria-hidden="true" />
                    Qué aprender primero
                  </h4>
                  <ul className="space-y-1.5">
                    {mustHaveStatus.map(({ req, hasIt }) => (
                      <li
                        key={req}
                        className={`px-3 py-2 rounded-[2px] text-sm flex justify-between items-center gap-3 border ${
                          hasIt ? 'border-line text-fg-2' : 'border-gap/40 border-l-2 border-l-gap bg-gap-soft text-fg'
                        }`}
                      >
                        <span>{req}</span>
                        <span className={`text-xs font-medium shrink-0 ${hasIt ? 'text-ok' : 'text-gap'}`}>
                          {hasIt ? 'Ya lo tienes' : 'Empieza por aquí'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="card p-6 flex flex-col">
                  <h4 className="label-tech flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-accent" aria-hidden="true" />
                    Tu CV y tu proyecto principal
                  </h4>

                  <p className="text-xs font-semibold text-fg-2 mb-2">Un proyecto que te conviene enseñar</p>
                  <p className="p-4 bg-accent-soft border-l-2 border-accent text-sm text-fg leading-relaxed mb-6">
                    {ROLE_DATABASE[targetRole].keyProject}
                  </p>

                  <p className="text-xs font-semibold text-fg-2 mb-2">Dos consejos para tu CV</p>
                  <ol className="space-y-2 text-sm text-fg-2">
                    <li className="flex gap-3">
                      <span className="text-xs font-semibold text-accent-strong pt-0.5">1</span>
                      <span><strong className="text-fg">Enlaces a la vista:</strong> pon arriba del todo tu GitHub (donde guardas tu código) y el enlace a tu proyecto publicado.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-xs font-semibold text-accent-strong pt-0.5">2</span>
                      <span><strong className="text-fg">Sin barras de porcentaje:</strong> en vez de poner "JavaScript 70%", enseña proyectos reales.</span>
                    </li>
                  </ol>

                  <button
                    type="button"
                    onClick={() => { changeInterviewRole(targetRole); setActiveTabYoung('interview'); }}
                    className="btn btn-secondary w-full mt-auto"
                  >
                    Practicar una entrevista
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </section>
              </div>

              <PlanCourses gaps={requirementGaps} onSeeAll={() => setActiveTabYoung('training')} />

              <section className="card p-6">
                <h4 className="label-tech mb-4">Tu rutina semanal de búsqueda</h4>
                <ul className="grid md:grid-cols-3 gap-4 text-sm">
                  {[
                    { title: 'LinkedIn al día', text: 'Un titular claro con el puesto que buscas y tus tecnologías principales.' },
                    { title: 'Red de contactos', text: 'Cada semana, conecta con personas de selección y profesionales del sector.' },
                    { title: 'Práctica diaria', text: 'Dedica un rato cada día a ejercicios de lógica y a tus proyectos.' }
                  ].map(item => (
                    <li key={item.title} className="border-t-2 border-fg pt-3">
                      <p className="font-semibold text-fg mb-1">{item.title}</p>
                      <p className="text-fg-2 leading-relaxed">{item.text}</p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}

          {/* TAB 4: SIMULADOR DE ENTREVISTA */}
          {activeTabYoung === 'interview' && (
            <div className="flex-1 px-4 py-8 md:p-10 max-w-4xl mx-auto w-full animate-enter">
              <PageHeader
                eyebrow="Paso 4 de 4"
                title="Practica tu entrevista"
                description="Responde preguntas reales de procesos de selección y recibe consejos para mejorar tus respuestas."
                aside={
                  <div>
                    <label htmlFor="interview-role" className="sr-only">Puesto de la entrevista</label>
                    <select
                      id="interview-role"
                      value={interviewRole}
                      onChange={(e) => changeInterviewRole(e.target.value)}
                      className="input-technical w-auto"
                    >
                      {Object.keys(ROLE_DATABASE).map(roleKey => (
                        <option key={roleKey} value={roleKey}>{ROLE_DATABASE[roleKey].name}</option>
                      ))}
                    </select>
                  </div>
                }
              />

              {currentQuestion ? (
                <div className="space-y-4">
                  {/* Ventana de evaluación */}
                  <section className="card overflow-hidden">
                    <div className="px-4 py-2.5 bg-raised border-b border-line flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-fg-2">
                        Pregunta {currentQuestionIdx + 1} de {filteredQuestions.length} · {currentQuestion.type}
                      </span>
                      <button type="button" onClick={handleNextQuestion} className="min-h-9 text-xs font-medium text-fg-2 hover:text-fg flex items-center gap-1">
                        Saltar pregunta
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="p-6">
                      <h3 className="font-display font-semibold text-xl leading-snug tracking-[-0.015em] text-fg mb-6">
                        {currentQuestion.question}
                      </h3>

                      <label htmlFor="interview-answer" className="label-tech">Tu respuesta, como si hablaras con quien te entrevista</label>
                      <textarea
                        id="interview-answer"
                        rows={6}
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Escribe aquí tu respuesta…"
                        className="input-technical resize-none leading-relaxed"
                      />

                      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span className="text-xs text-fg-3">Consejo: ve al grano y pon ejemplos de cosas que hayas hecho.</span>
                        <button
                          type="button"
                          onClick={handleEvaluateAnswer}
                          disabled={isEvaluating || !userAnswer.trim()}
                          className="btn btn-primary"
                        >
                          {isEvaluating ? <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Sparkles className="w-4 h-4" aria-hidden="true" />}
                          {isEvaluating ? 'Evaluando respuesta…' : 'Evaluar respuesta'}
                        </button>
                      </div>
                    </div>
                  </section>

                  {interviewFeedback && (
                    <section className="card-technical p-6 animate-enter" aria-live="polite">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-line">
                        <h4 className="font-display font-semibold text-lg text-fg">Cómo ha ido tu respuesta</h4>
                        <VuMeter value={interviewFeedback.score} label="puntuación orientativa" tone={interviewFeedback.score >= 60 ? 'ok' : 'gap'} />
                      </div>

                      <dl className="space-y-5 text-sm">
                        <div>
                          <dt className="label-tech">Lo que has hecho bien</dt>
                          <dd className="text-fg-2 leading-relaxed">{interviewFeedback.strengths}</dd>
                        </div>
                        <div>
                          <dt className="label-tech">Qué puedes mejorar</dt>
                          <dd className="text-fg-2 leading-relaxed">{interviewFeedback.suggestions}</dd>
                        </div>
                        <div>
                          <dt className="label-tech">Ideas clave que conviene mencionar</dt>
                          <dd>
                            <ul className="space-y-1.5">
                              {interviewFeedback.checklist.map((item: string) => (
                                <li key={item} className="flex items-start gap-2 text-fg">
                                  <Check className="w-4 h-4 text-ok mt-0.5 shrink-0" aria-hidden="true" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-6 pt-4 border-t border-line flex justify-end">
                        <button type="button" onClick={handleNextQuestion} className="btn btn-secondary">
                          Siguiente pregunta
                          <ChevronRight className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </section>
                  )}
                </div>
              ) : (
                <div className="card p-8 text-center text-sm text-fg-2">
                  Todavía no hay preguntas para este puesto.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CHAT MENTOR (registro de comunicaciones) */}
          {activeTabYoung === 'ask' && (
            <div className="flex-1 min-h-0 flex flex-col max-w-4xl mx-auto w-full px-4 py-6 md:p-8 animate-enter">
              <div className="pb-4 mb-4 border-b border-line shrink-0">
                <p className="eyebrow mb-1">Pregunta lo que quieras</p>
                <h2 className="font-display font-bold text-xl tracking-[-0.015em] text-fg">Consultas al mentor</h2>
                <p className="text-sm text-fg-2">Resuelve dudas sobre tu búsqueda de empleo, cartas de presentación o cómo hablar de sueldo.</p>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain card p-4 md:p-5 space-y-5 mb-3" data-lenis-prevent>
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`max-w-[88%] md:max-w-[75%] ${msg.sender === 'user' ? 'ml-auto' : ''}`}>
                    <p className={`flex items-center gap-2 mb-1 text-xs font-medium ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                      <span className={msg.sender === 'user' ? 'text-fg-2' : 'text-accent-strong'}>
                        {msg.sender === 'user' ? 'Tú' : 'Mentor'}
                      </span>
                      <time className="text-fg-3">{msg.time}</time>
                    </p>
                    <p className={`p-3 rounded-[2px] text-sm leading-relaxed whitespace-pre-line border ${
                      msg.sender === 'user'
                        ? 'bg-accent-soft border-accent/25 text-fg'
                        : 'bg-raised border-line border-l-2 border-l-accent text-fg'
                    }`}>
                      {msg.text}
                    </p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendChatMessage} className="shrink-0 flex gap-2">
                <label htmlFor="chat-input" className="sr-only">Tu consulta</label>
                <input
                  id="chat-input"
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Pregunta sobre CV, cartas de motivación, salario…"
                  enterKeyHint="send"
                  className="input-technical flex-1"
                />
                <button type="submit" className="btn btn-primary px-4" aria-label="Enviar consulta">
                  <Send className="w-4 h-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          )}

          {/* TAB: OFERTAS Y CANDIDATURAS */}
          {activeTabYoung === 'offers' && candidateProfile && (
            <OffersSection
              candidate={candidateProfile}
              targetRole={targetRole}
              view={offersView}
              onViewChange={setOffersView}
              onToggleLearning={handleToggleLearning}
              onPracticeInterview={(roleKey) => {
                if (roleKey && ROLE_DATABASE[roleKey]) changeInterviewRole(roleKey);
                setActiveTabYoung('interview');
              }}
            />
          )}

          {/* TAB 6: RECOMENDADOR DE FORMACIÓN */}
          {activeTabYoung === 'training' && (
            <TrainingRecommender userEmail={currentUser.email} knownSkills={techStack} planGapSkills={planGapSkills} />
          )}

        </main>
      </div>
    );
  }

  // ============================================================================
  // RENDER: MÓDULO DE EMPRESAS (ACCESO AUTENTICADO BLOQUEADO POR ROL)
  // ============================================================================
  return <CompanyPanel user={currentUser} onLogout={handleLogout} />;
}
