import React, { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, 
  UserCheck, 
  Compass, 
  MessageSquare, 
  CheckCircle2, 
  Terminal, 
  TrendingUp, 
  ChevronRight, 
  Send, 
  FileText, 
  Sparkles, 
  ArrowRight, 
  Code, 
  Layers, 
  Zap, 
  LogOut, 
  Building2, 
  Plus, 
  X, 
  Check 
} from 'lucide-react';

// Importación de Tipos e Interfaces
import type { 
  UserRole, 
  UserSession, 
  CompanyData, 
  InterviewFeedback 
} from './types';

// Importación de Base de Datos Estática
import { 
  AVAILABLE_TECH_STACK, 
  ROLE_DATABASE, 
  INTERVIEW_QUESTIONS_DATABASE, 
  COMPANY_PRESET_ROLES, 
  COMPANY_PRESET_TECHS, 
  COMPANY_PRESET_SOFT_SKILLS 
} from './mockData';

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
   * Se inicializa leyendo de LocalStorage para mantener la sesión tras recargar.
   */
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const savedSession = localStorage.getItem('it_orientador_current_user');
      return savedSession ? JSON.parse(savedSession) : null;
    } catch (error) {
      console.error('Error leyendo la sesión del almacenamiento local:', error);
      return null;
    }
  });

  // Modo de formulario en la modal de autenticación
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Rol seleccionado antes de completar la autenticación
  const [selectedRoleAuth, setSelectedRoleAuth] = useState<UserRole | null>(null);

  // Inputs del formulario de login/registro
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authName, setAuthName] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

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

  // Simulador de Entrevista Técnica
  const [interviewRole, setInterviewRole] = useState<string>('frontend');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [interviewFeedback, setInterviewFeedback] = useState<InterviewFeedback | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  // Chat con el Mentor IT
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: '¡Hola! Soy tu mentor IT. Puedo responder dudas sobre cómo conseguir tu primer empleo, qué proyectos construir, pretensiones salariales o cómo superar filtros de reclutadores. ¿Qué quieres consultar hoy?'
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

  const [companyTab, setCompanyTab] = useState<'form' | 'submissions'>('form');
  const [companyName, setCompanyName] = useState<string>('');
  const [companyEmail, setCompanyEmail] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedTechSkills, setSelectedTechSkills] = useState<string[]>([]);
  const [customTechInput, setCustomTechInput] = useState<string>('');
  const [selectedSoftSkills, setSelectedSoftSkills] = useState<string[]>([]);
  const [customSoftInput, setCustomSoftInput] = useState<string>('');
  const [companySubmitted, setCompanySubmitted] = useState<boolean>(false);

  /**
   * Lista de empresas registradas. Se inicializa leyendo 'registered_companies_data' de LocalStorage.
   */
  const [companiesData, setCompaniesData] = useState<CompanyData[]>(() => {
    try {
      const savedData = localStorage.getItem('registered_companies_data');
      return savedData ? JSON.parse(savedData) : [];
    } catch (error) {
      console.error('Error al cargar datos de empresas:', error);
      return [];
    }
  });

  /**
   * Sincronización automática de `companiesData` con LocalStorage cada vez que se actualiza.
   */
  useEffect(() => {
    try {
      localStorage.setItem('registered_companies_data', JSON.stringify(companiesData));
    } catch (error) {
      console.error('Error guardando en el almacenamiento local:', error);
    }
  }, [companiesData]);

  // ============================================================================
  // 4. MANEJO DE SESIÓN Y AUTENTICACIÓN
  // ============================================================================

  /**
   * Cierra la sesión activa y reinicia el estado global de la aplicación.
   */
  const handleLogout = (): void => {
    localStorage.removeItem('it_orientador_current_user');
    setCurrentUser(null);
    setSelectedRoleAuth(null);
    setAuthEmail('');
    setAuthPassword('');
    setAuthName('');
    setAuthError('');
    setCompanySubmitted(false);
  };

  /**
   * Procesa el inicio de sesión o registro de usuarios.
   */
  const handleAuthSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setAuthError('');

    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Por favor introduce tu correo y contraseña.');
      return;
    }

    if (authMode === 'register' && !authName.trim()) {
      setAuthError('Por favor introduce tu nombre completo o el de tu organización.');
      return;
    }

    const userSessionData: UserSession = {
      email: authEmail.trim(),
      role: selectedRoleAuth!,
      name: authName.trim() || (selectedRoleAuth === 'young' ? 'Joven Talento' : 'Empresa')
    };

    try {
      localStorage.setItem('it_orientador_current_user', JSON.stringify(userSessionData));
      setCurrentUser(userSessionData);
    } catch (error) {
      setAuthError('No se pudo guardar la sesión localmente.');
    }
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

  const handleEvaluateAnswer = (): void => {
    if (!userAnswer.trim()) return;
    setIsEvaluating(true);

    setTimeout(() => {
      setIsEvaluating(false);
      setInterviewFeedback({
        score: Math.floor(Math.random() * 25) + 75,
        strengths: 'Has estructurado tu respuesta con claridad y utilizado terminología técnica adecuada.',
        suggestions: 'Asegúrate de dar ejemplos concretos basados en proyectos propios para darle más peso a tu explicación.',
        checklist: filteredQuestions[currentQuestionIdx]?.keyPoints || []
      });
    }, 1000);
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
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');

    setTimeout(() => {
      let reply = "Para destacar como Junior IT, concéntrate en tener 2 proyectos reales desplegados (con código limpio en GitHub y README impecable) más que en acumular certificados.";
      const lower = userText.toLowerCase();

      if (lower.includes('cv') || lower.includes('curriculum') || lower.includes('resume')) {
        reply = "Para tu CV: Mantenlo en 1 sola página. Pon tus proyectos con enlace directo al deploy y a GitHub en la parte superior. Describe qué problemas resolviste y qué tecnologías usaste, no solo listas de cursos.";
      } else if (lower.includes('inglés') || lower.includes('english')) {
        reply = "El inglés es un multiplicador de oportunidades. Con nivel B1/B2 puedes optar a empresas internacionales o consultoras globales. Practica leer documentación técnica en inglés y preparar tu discurso de presentación (Elevator Pitch).";
      } else if (lower.includes('sueldo') || lower.includes('salario') || lower.includes('cobrar')) {
        reply = "En España/LATAM, el rango de entrada para un Junior oscila entre 18.000€ y 26.000€ brutos anuales según la ciudad y la tecnología. Prioriza empresas donde tengas mentores seniors antes que 2.000€ más de salario inicial.";
      } else if (lower.includes('reconversión') || lower.includes('cambio') || lower.includes('edad')) {
        reply = "La reconversión digital es muy valorada si sabes vender tu bagaje anterior. Un profesional con experiencia laboral previa aporta gestión del estrés, comunicación y madurez que un recién graduado a menudo aún no posee.";
      }

      setChatMessages(prev => [...prev, { sender: 'bot', text: reply }]);
    }, 800);
  };

  // ============================================================================
  // 6. MÉTODOS DEL MÓDULO DE EMPRESAS
  // ============================================================================

  const toggleCompanyRole = (role: string): void => {
    setSelectedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const toggleTechSkill = (skill: string): void => {
    setSelectedTechSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  const addCustomTech = (): void => {
    const trimmed = customTechInput.trim();
    if (trimmed && !selectedTechSkills.includes(trimmed)) {
      setSelectedTechSkills(prev => [...prev, trimmed]);
      setCustomTechInput('');
    }
  };

  const toggleSoftSkill = (skill: string): void => {
    setSelectedSoftSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  const addCustomSoft = (): void => {
    const trimmed = customSoftInput.trim();
    if (trimmed && !selectedSoftSkills.includes(trimmed)) {
      setSelectedSoftSkills(prev => [...prev, trimmed]);
      setCustomSoftInput('');
    }
  };

  /**
   * Guarda los datos introducidos por la empresa y activa la confirmación.
   */
  const handleCompanyFormSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    if (!companyName.trim() || !companyEmail.trim()) {
      alert('Por favor, indica el nombre de la organización y un correo de contacto.');
      return;
    }

    if (selectedRoles.length === 0 || selectedTechSkills.length === 0) {
      alert('Por favor selecciona al menos un puesto y una habilidad técnica requerida.');
      return;
    }

    const newCompanyEntry: CompanyData = {
      id: Date.now().toString(),
      companyName: companyName.trim(),
      contactEmail: companyEmail.trim(),
      neededRoles: selectedRoles,
      techSkills: selectedTechSkills,
      softSkills: selectedSoftSkills,
      createdAt: new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };

    setCompaniesData(prev => [...prev, newCompanyEntry]);
    setCompanySubmitted(true);
  };

  const handleResetCompanyForm = (): void => {
    setCompanyName('');
    setCompanyEmail('');
    setSelectedRoles([]);
    setSelectedTechSkills([]);
    setSelectedSoftSkills([]);
    setCompanySubmitted(false);
  };

  // ============================================================================
  // RENDER: PANTALLA DE SELECCIÓN DE ROL / AUTENTICACIÓN
  // ============================================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-4xl">

          {/* Encabezado */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full mb-3">
              <Compass className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-300">Plataforma de Orientación & Reclutamiento IT</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
              Bienvenido al Portal IT
            </h1>
            <p className="text-slate-400 text-xs md:text-sm max-w-xl mx-auto">
              Selecciona tu perfil de acceso para iniciar sesión. El acceso a cada panel queda asegurado según tu rol elegido.
            </p>
          </div>

          {!selectedRoleAuth ? (
            /* SELECCIÓN INICIAL DE ROL */
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Tarjeta Jóvenes */}
              <div 
                onClick={() => { setSelectedRoleAuth('young'); setAuthMode('login'); }}
                className="bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-950/80 p-8 rounded-2xl transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="p-4 bg-indigo-500/10 rounded-xl w-fit text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                    <UserCheck className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 block mb-1">Acceso a Talento</span>
                  <h2 className="text-xl font-bold text-white mb-3">Perfil Jóvenes / Candidatos</h2>
                  <p className="text-slate-400 text-xs md:text-sm leading-relaxed mb-6">
                    Accede a diagnósticos de carrera, roadmap técnico personalizado, simulador de entrevistas con IA y tutoría técnica directa.
                  </p>
                </div>
                <div className="flex items-center text-indigo-400 text-xs font-bold space-x-2">
                  <span>Acceder / Registrarse como Joven</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Tarjeta Empresa */}
              <div 
                onClick={() => { setSelectedRoleAuth('company'); setAuthMode('login'); }}
                className="bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-950/80 p-8 rounded-2xl transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="p-4 bg-emerald-500/10 rounded-xl w-fit text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 block mb-1">Acceso Corporativo</span>
                  <h2 className="text-xl font-bold text-white mb-3">Perfil Empresas / Organizaciones</h2>
                  <p className="text-slate-400 text-xs md:text-sm leading-relaxed mb-6">
                    Registra las necesidades de contratación de tu empresa, stack tecnológico demandado y habilidades blandas requeridas para conectar con candidatos.
                  </p>
                </div>
                <div className="flex items-center text-emerald-400 text-xs font-bold space-x-2">
                  <span>Acceder / Registrarse como Empresa</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

            </div>
          ) : (
            /* FORMULARIO DE INICIO DE SESIÓN / REGISTRO */
            <div className="max-w-md mx-auto bg-slate-950 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl relative">
              
              <button 
                onClick={() => setSelectedRoleAuth(null)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-xs flex items-center space-x-1"
              >
                <X className="w-4 h-4" />
                <span>Volver</span>
              </button>

              <div className="mb-6">
                <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold mb-2 ${
                  selectedRoleAuth === 'young' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {selectedRoleAuth === 'young' ? 'Rol: Jóvenes / Talento' : 'Rol: Empresa / Organización'}
                </span>
                <h2 className="text-xl font-bold text-white">
                  {authMode === 'login' ? 'Iniciar Sesión' : 'Crear nueva cuenta'}
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Ingresa tus datos para acceder a tu panel exclusivo.
                </p>
              </div>

              {authError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {selectedRoleAuth === 'young' ? 'Nombre completo' : 'Nombre de la Organización'}
                    </label>
                    <input
                      type="text"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder={selectedRoleAuth === 'young' ? 'Ej. Ana Martínez' : 'Ej. Tech Solutions S.L.'}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className={`w-full py-3 rounded-lg text-xs font-bold text-white transition-colors shadow-lg ${
                    selectedRoleAuth === 'young' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {authMode === 'login' ? 'Ingresar a la Plataforma' : 'Completar Registro'}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-900 text-center text-xs">
                {authMode === 'login' ? (
                  <p className="text-slate-400">
                    ¿No tienes cuenta registrada?{' '}
                    <button onClick={() => setAuthMode('register')} className="text-indigo-400 hover:underline font-semibold">
                      Regístrate gratis
                    </button>
                  </p>
                ) : (
                  <p className="text-slate-400">
                    ¿Ya tienes una cuenta?{' '}
                    <button onClick={() => setAuthMode('login')} className="text-indigo-400 hover:underline font-semibold">
                      Inicia Sesión
                    </button>
                  </p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: MODULO DE JÓVENES (ACCESO AUTENTICADO BLOQUEADO POR ROL)
  // ============================================================================
  if (currentUser.role === 'young') {
    return (
      <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
        
        {/* BARRA LATERAL */}
        <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 hidden md:flex">
          <div>
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-600 rounded-lg text-white">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-bold text-sm text-white">Orientador IT</h1>
                  <p className="text-xs text-slate-400">Panel de Jóvenes</p>
                </div>
              </div>
            </div>

            <div className="mx-4 my-4 p-3 bg-slate-900 rounded-lg border border-slate-800">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                <div className="truncate">
                  <span className="text-xs font-bold text-slate-200 block truncate">{currentUser.name}</span>
                  <span className="text-[10px] text-slate-500 block">Cuenta de Joven Talento</span>
                </div>
              </div>
            </div>

            <nav className="p-3 space-y-1">
              <button
                onClick={() => setActiveTabYoung('welcome')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                  activeTabYoung === 'welcome' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Inicio y Perfil</span>
              </button>

              <button
                onClick={() => setActiveTabYoung('diagnostic')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                  activeTabYoung === 'diagnostic' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Diagnóstico Técnico</span>
              </button>

              <button
                onClick={() => setActiveTabYoung('roadmap')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                  activeTabYoung === 'roadmap' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Plan de Acción & CV</span>
              </button>

              <button
                onClick={() => setActiveTabYoung('interview')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                  activeTabYoung === 'interview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>Simulador Entrevista</span>
              </button>

              <button
                onClick={() => setActiveTabYoung('ask')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                  activeTabYoung === 'ask' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Consultas al Mentor</span>
              </button>
            </nav>
          </div>

          <div className="p-4 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>

        {/* ÁREA DE CONTENIDO */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-900">

          <header className="p-4 bg-slate-950 border-b border-slate-800 flex md:hidden items-center justify-between">
            <div className="flex items-center space-x-2">
              <Compass className="w-5 h-5 text-indigo-400" />
              <span className="font-bold text-sm text-white">Orientador IT</span>
            </div>
            <button onClick={handleLogout} className="text-red-400 text-xs flex items-center space-x-1">
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </header>

          {/* TAB 1: INICIO */}
          {activeTabYoung === 'welcome' && (
            <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full">
              <div className="mb-8">
                <span className="inline-block px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-semibold mb-3 border border-indigo-500/20">
                  Acompañamiento Laboral Especializado
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  Impulsa tu incorporación al sector tecnológico
                </h2>
                <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                  Supera el estancamiento de la búsqueda de primer empleo. Obtén un diagnóstico claro sobre tu perfil, prioriza las tecnologías que demandan las empresas y entrena entrevistas reales.
                </p>
              </div>

              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
                Paso 1: Selecciona tu punto de partida
              </h3>

              <div className="grid md:grid-cols-2 gap-5 mb-8">
                <div 
                  onClick={() => { setProfileTypeYoung('junior'); setActiveTabYoung('diagnostic'); }}
                  className={`p-6 rounded-xl border transition-all cursor-pointer relative ${
                    profileTypeYoung === 'junior' ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="p-3 bg-indigo-500/10 w-fit rounded-lg text-indigo-400 mb-4">
                    <Code className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">Junior IT (Graduado / FP / Bootcamp)</h4>
                  <p className="text-slate-400 text-xs md:text-sm leading-relaxed mb-4">
                    Has estudiado desarrollo, sistemas o análisis de datos recientemente y buscas estructurar tu stack y pasar de las prácticas a tu primer contrato junior.
                  </p>
                  <div className="flex items-center text-indigo-400 text-xs font-semibold space-x-1">
                    <span>Iniciar Diagnóstico Junior</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div 
                  onClick={() => { setProfileTypeYoung('reskill'); setActiveTabYoung('diagnostic'); }}
                  className={`p-6 rounded-xl border transition-all cursor-pointer relative ${
                    profileTypeYoung === 'reskill' ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="p-3 bg-emerald-500/10 w-fit rounded-lg text-emerald-400 mb-4">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">Reconversión Digital (Career Switcher)</h4>
                  <p className="text-slate-400 text-xs md:text-sm leading-relaxed mb-4">
                    Provienes de otros sectores (administración, ventas, educación, diseño...) y deseas poner en valor tu experiencia previa combinada con tus nuevos conocimientos tecnológicos.
                  </p>
                  <div className="flex items-center text-emerald-400 text-xs font-semibold space-x-1">
                    <span>Iniciar Diagnóstico Reconversión</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">¿Cómo funciona esta plataforma?</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-slate-900 rounded text-indigo-400 mt-0.5">1</div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-200">Test de Mercado</h5>
                      <p className="text-xs text-slate-400 mt-0.5">Evaluamos tu stack técnico real frente a vacantes actuales.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-slate-900 rounded text-indigo-400 mt-0.5">2</div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-200">Matriz & Portfolio</h5>
                      <p className="text-xs text-slate-400 mt-0.5">Estrategia para cerrar lagunas y optimizar tu CV y GitHub.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-slate-900 rounded text-indigo-400 mt-0.5">3</div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-200">Simulación Técnica</h5>
                      <p className="text-xs text-slate-400 mt-0.5">Entrena preguntas de entrevistas con feedback estructurado.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIAGNÓSTICO TÉCNICO */}
          {activeTabYoung === 'diagnostic' && (
            <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full">
              <div className="mb-6 flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Diagnóstico del Estado Actual</h2>
                  <p className="text-xs text-slate-400">Evalúa tus competencias clave para definir el roadmap óptimo.</p>
                </div>
                <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs rounded border border-slate-700">Paso 2 de 4</span>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
                    1. ¿Hacia qué rol o especialización te orientas?
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {Object.keys(ROLE_DATABASE).map((roleKey) => (
                      <button
                        key={roleKey}
                        type="button"
                        onClick={() => setTargetRole(roleKey)}
                        className={`p-3 rounded-lg border text-xs font-medium transition-all text-left ${
                          targetRole === roleKey ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {ROLE_DATABASE[roleKey].name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    2. Selecciona las tecnologías con las que ya has construido al menos un proyecto:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TECH_STACK.map((tech) => {
                      const isSelected = techStack.includes(tech);
                      return (
                        <button
                          key={tech}
                          type="button"
                          onClick={() => handleTechToggle(tech)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                            isSelected ? 'bg-indigo-950 border-indigo-500 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          {isSelected && <span className="mr-1.5">✓</span>}
                          {tech}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
                      3. Nivel de Inglés profesional
                    </label>
                    <select
                      value={englishLevel}
                      onChange={(e) => setEnglishLevel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="A2">Básico (A2) - Leo documentación con ayuda</option>
                      <option value="B1">Intermedio (B1) - Entiendo texto técnico y mantengo conversaciones breves</option>
                      <option value="B2">Fluido Técnico (B2) - Puedo realizar entrevistas de trabajo completas en inglés</option>
                      <option value="C1">Avanzado (C1/C2) - Sin limitaciones de idioma</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
                      4. Experiencia práctica acumulada
                    </label>
                    <select
                      value={experienceMonths}
                      onChange={(e) => setExperienceMonths(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="0-6">Solo proyectos académicos / Bootcamp (0 - 6 meses)</option>
                      <option value="6-12">Proyectos personales avanzados + Prácticas (6 - 12 meses)</option>
                      <option value="12+">Más de 1 año construyendo proyectos autónomos</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
                    5. ¿Cuál es tu mayor obstáculo actual?
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setMainBlocker('cv')}
                      className={`p-3 rounded-lg border text-xs text-left transition-all ${mainBlocker === 'cv' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                    >
                      <span className="font-bold block text-sm mb-1">Filtro de CV</span>
                      No me llaman para primeras entrevistas telefónicas.
                    </button>
                    <button
                      type="button"
                      onClick={() => setMainBlocker('technical')}
                      className={`p-3 rounded-lg border text-xs text-left transition-all ${mainBlocker === 'technical' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                    >
                      <span className="font-bold block text-sm mb-1">Prueba Técnica</span>
                      Llego a entrevistas pero me bloquean las pruebas de código.
                    </button>
                    <button
                      type="button"
                      onClick={() => setMainBlocker('stack')}
                      className={`p-3 rounded-lg border text-xs text-left transition-all ${mainBlocker === 'stack' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                    >
                      <span className="font-bold block text-sm mb-1">Overwhelm Técnico</span>
                      No sé qué tecnologías seguir aprendiendo ni en qué orden.
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => setActiveTabYoung('roadmap')}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition-colors flex items-center space-x-2 shadow-lg"
                  >
                    <span>Generar Plan de Acción Personalizado</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PLAN DE ACCIÓN */}
          {activeTabYoung === 'roadmap' && (
            <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full">
              <div className="mb-6 flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Matriz de Recomendación Directa</h2>
                  <p className="text-xs text-slate-400">Plan estratégico ajustado a tus selecciones y demanda de mercado.</p>
                </div>
                <button onClick={() => setActiveTabYoung('diagnostic')} className="text-xs text-indigo-400 hover:underline">
                  <span>Ajustar respuestas</span>
                </button>
              </div>

              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Rol Objetivo Seleccionado</span>
                    <h3 className="text-2xl font-bold text-white">{ROLE_DATABASE[targetRole].name}</h3>
                  </div>
                  <div className="flex space-x-4 text-xs">
                    <div className="bg-slate-900 px-3 py-2 rounded border border-slate-800">
                      <span className="text-slate-500 block">Demanda de Mercado</span>
                      <span className="font-bold text-emerald-400">{ROLE_DATABASE[targetRole].marketDemand}</span>
                    </div>
                    <div className="bg-slate-900 px-3 py-2 rounded border border-slate-800">
                      <span className="text-slate-500 block">Rango Salarial Junior</span>
                      <span className="font-bold text-slate-200">{ROLE_DATABASE[targetRole].avgSalaryJunior}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Tus Puntos Fuertes Identificados</span>
                  </h4>
                  <ul className="space-y-2 mb-6">
                    {techStack.length > 0 ? (
                      techStack.map(t => (
                        <li key={t} className="text-xs text-slate-300 flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>Base de conocimientos en <strong className="text-white">{t}</strong></span>
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-slate-500 italic">No seleccionaste tecnologías. Te recomendamos comenzar por las imprescindibles.</li>
                    )}
                    {profileTypeYoung === 'reskill' && (
                      <li className="text-xs text-slate-300 flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Experiencia laboral previa (Habilidades blandas y adaptabilidad).</span>
                      </li>
                    )}
                    <li className="text-xs text-slate-300 flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>Nivel de inglés {englishLevel} suficiente para consulta técnica.</span>
                    </li>
                  </ul>

                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Prioridades Inmediatas para tu Stack</span>
                  </h4>
                  <div className="space-y-2">
                    {ROLE_DATABASE[targetRole].mustHave.map((req: string) => {
                      const hasIt = techStack.some(t => req.toLowerCase().includes(t.toLowerCase()));
                      return (
                        <div key={req} className={`p-2 rounded text-xs flex justify-between items-center ${hasIt ? 'bg-slate-900/60 text-slate-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium'}`}>
                          <span>{req}</span>
                          <span>{hasIt ? '✓ Cubierto' : '⚠️ Prioritario'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span>Estrategia de CV & Proyecto Estrella</span>
                    </h4>

                    <div className="mb-4">
                      <span className="text-xs text-slate-400 font-semibold block mb-1">Proyecto Imprescindible para Mostrar:</span>
                      <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-lg text-xs text-indigo-200 leading-relaxed">
                        {ROLE_DATABASE[targetRole].keyProject}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <span className="text-xs text-slate-400 font-semibold block">Reglas de Oro para tu CV Junior:</span>
                      <div className="text-xs text-slate-300 space-y-2">
                        <p className="flex items-start space-x-2">
                          <span className="text-indigo-400 font-bold">1.</span>
                          <span><strong>Links activos:</strong> Enlace a GitHub y Deploy arriba del todo.</span>
                        </p>
                        <p className="flex items-start space-x-2">
                          <span className="text-indigo-400 font-bold">2.</span>
                          <span><strong>Sin barras de porcentaje:</strong> Sustituye "JavaScript 70%" por los proyectos reales.</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-900 flex justify-end">
                    <button
                      onClick={() => { setInterviewRole(targetRole); setActiveTabYoung('interview'); }}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-lg transition-colors flex justify-center items-center space-x-2"
                    >
                      <span>Pasar al Simulador de Entrevista</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Checklist semanal de búsqueda activa</h4>
                <div className="grid md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-900 rounded border border-slate-800">
                    <span className="font-bold text-white block mb-1">LinkedIn Optimizado</span>
                    <span className="text-slate-400">Titular claro enfocado a tu rol objetivo y tecnologías clave.</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded border border-slate-800">
                    <span className="font-bold text-white block mb-1">Red de Contactos</span>
                    <span className="text-slate-400">Conecta semanalmente con reclutadores técnicos y profesionales del sector.</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded border border-slate-800">
                    <span className="font-bold text-white block mb-1">Práctica Diaria</span>
                    <span className="text-slate-400">Dedica tiempo constante a ejercicios de lógica y desarrollo de tu portfolio.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SIMULADOR DE ENTREVISTA */}
          {activeTabYoung === 'interview' && (
            <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full">
              <div className="mb-6 flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Simulador de Entrevista Técnica</h2>
                  <p className="text-xs text-slate-400">Entrena preguntas reales de procesos de selección y recibe feedback de estructura.</p>
                </div>
                <div className="flex space-x-2">
                  <select
                    value={interviewRole}
                    onChange={(e) => {
                      setInterviewRole(e.target.value);
                      setCurrentQuestionIdx(0);
                      setInterviewFeedback(null);
                      setUserAnswer('');
                    }}
                    className="bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200"
                  >
                    <option value="frontend">Frontend</option>
                    <option value="backend">Backend</option>
                  </select>
                </div>
              </div>

              {filteredQuestions.length > 0 ? (
                <div className="space-y-6">
                  <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-xs font-semibold rounded border border-indigo-500/20">
                        Pregunta {currentQuestionIdx + 1} de {filteredQuestions.length} — {filteredQuestions[currentQuestionIdx].type}
                      </span>
                      <button onClick={handleNextQuestion} className="text-xs text-slate-400 hover:text-white flex items-center space-x-1">
                        <span>Saltar pregunta</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-4">
                      "{filteredQuestions[currentQuestionIdx].question}"
                    </h3>

                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-slate-400 mb-2">Escribe tu respuesta como si estuvieses respondiendo al reclutador:</label>
                      <textarea
                        rows={5}
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Escribe aquí tu respuesta explicativa..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none font-sans"
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Consejo: Sé conciso, directo y utiliza ejemplos prácticos.</span>
                      <button
                        onClick={handleEvaluateAnswer}
                        disabled={isEvaluating || !userAnswer.trim()}
                        className={`px-5 py-2.5 rounded-lg text-xs font-medium flex items-center space-x-2 ${
                          isEvaluating || !userAnswer.trim() ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                        }`}
                      >
                        {isEvaluating ? <span>Evaluando respuesta...</span> : <><Sparkles className="w-4 h-4" /><span>Evaluar Respuesta</span></>}
                      </button>
                    </div>
                  </div>

                  {interviewFeedback && (
                    <div className="bg-slate-950 p-6 rounded-xl border border-indigo-500/30">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg font-bold text-sm">
                            Puntuación: {interviewFeedback.score}%
                          </div>
                          <span className="text-xs font-bold text-white">Evaluación Estructurada</span>
                        </div>
                      </div>

                      <div className="space-y-4 text-xs">
                        <div>
                          <span className="font-bold text-slate-300 block mb-1">Aspectos Positivos:</span>
                          <p className="text-slate-400">{interviewFeedback.strengths}</p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-300 block mb-1">Sugerencia de Mejora:</span>
                          <p className="text-slate-400">{interviewFeedback.suggestions}</p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-300 block mb-2">Claves que debías incluir:</span>
                          <ul className="space-y-1">
                            {interviewFeedback.checklist.map((item: string, idx: number) => (
                              <li key={idx} className="flex items-start space-x-2 text-slate-300">
                                <span className="text-indigo-400 font-bold">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-900 flex justify-end">
                        <button onClick={handleNextQuestion} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded transition-colors flex items-center space-x-1">
                          <span>Siguiente Pregunta</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
                  No hay preguntas configuradas para este rol actualmente.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CHAT MENTOR */}
          {activeTabYoung === 'ask' && (
            <div className="flex-1 flex flex-col h-full max-w-4xl mx-auto w-full p-4 md:p-6 overflow-hidden">
              <div className="pb-3 mb-3 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Consultas Directas al Mentor IT</h2>
                    <p className="text-xs text-slate-400">Respuestas directas sobre empleabilidad, cartas de presentación y negociación.</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] md:max-w-[75%] rounded-xl p-4 text-xs leading-relaxed ${
                      msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none'
                    }`}>
                      {msg.sender === 'bot' && (
                        <div className="flex items-center space-x-1.5 text-indigo-400 font-bold mb-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Orientador IT</span>
                        </div>
                      )}
                      <p className="whitespace-pre-line">{msg.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendChatMessage} className="shrink-0 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Pregunta sobre CV, cartas de motivación, expectativas salariales..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <button type="submit" className="px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

        </main>
      </div>
    );
  }

  // ============================================================================
  // RENDER: MÓDULO DE EMPRESAS (ACCESO AUTENTICADO BLOQUEADO POR ROL)
  // ============================================================================
  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">

      {/* BARRA LATERAL */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 hidden md:flex">
        <div>
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-600 rounded-lg text-white">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-sm text-white">Portal Organizaciones</h1>
                <p className="text-xs text-slate-400">Captación de Talento</p>
              </div>
            </div>
          </div>

          <div className="mx-4 my-4 p-3 bg-slate-900 rounded-lg border border-slate-800">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="text-xs font-bold text-slate-200 block truncate">{currentUser.name}</span>
                <span className="text-[10px] text-slate-500 block">{currentUser.email}</span>
              </div>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            <button
              onClick={() => setCompanyTab('form')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                companyTab === 'form' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Formulario de Necesidades</span>
            </button>

            <button
              onClick={() => setCompanyTab('submissions')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                companyTab === 'submissions' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Solicitudes Registradas ({companiesData.length})</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-900">

        <header className="p-4 bg-slate-950 border-b border-slate-800 flex md:hidden items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm text-white">Portal Empresas</span>
          </div>
          <button onClick={handleLogout} className="text-red-400 text-xs flex items-center space-x-1">
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </header>

        {companyTab === 'form' ? (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full">
            
            {companySubmitted ? (
              /* MENSAJE EXACTO SOLICITADO */
              <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-8 text-center max-w-2xl mx-auto my-12 shadow-2xl">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 mx-auto mb-6 border border-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  ¡Registro Completado Exitosamente!
                </h3>
                <p className="text-emerald-300 text-base leading-relaxed mb-8 bg-emerald-950/40 p-4 rounded-xl border border-emerald-500/20 font-medium">
                  "¡Gracias por registrar las necesidades de tu empresa! Si encontramos un perfil que se adapte a lo que buscas, te pondremos en aviso de inmediato."
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleResetCompanyForm}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Registrar Otra Vacante o Necesidad
                  </button>
                  <button
                    onClick={() => setCompanyTab('submissions')}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Ver Registro de Datos Guardados
                  </button>
                </div>
              </div>
            ) : (
              /* FORMULARIO DINÁMICO DE EMPRESA */
              <div>
                <div className="mb-8">
                  <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold mb-3 border border-emerald-500/20">
                    Captación de Talento Junior & Reskill
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    Formulario Dinámico de Necesidades Corporativas
                  </h2>
                  <p className="text-slate-400 text-xs md:text-sm">
                    Especifica los roles, tecnologías y habilidades más demandadas en tu organización para vincular los perfiles adecuados.
                  </p>
                </div>

                <form onSubmit={handleCompanyFormSubmit} className="space-y-8">
                  
                  {/* BLOQUE 1: DATOS ORGANIZACIÓN */}
                  <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
                      <Building2 className="w-4 h-4" />
                      <span>1. Información de la Organización</span>
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-2">Nombre de la Organización *</label>
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Ej. Acme Technology Solutions"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-2">Correo de contacto RRHH / Selección *</label>
                        <input
                          type="email"
                          required
                          value={companyEmail}
                          onChange={(e) => setCompanyEmail(e.target.value)}
                          placeholder="reclutamiento@empresa.com"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* BLOQUE 2: PUESTOS NECESARIOS */}
                  <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center space-x-2">
                      <Briefcase className="w-4 h-4" />
                      <span>2. Puestos más necesarios en su organización *</span>
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">Selecciona los roles que necesitas incorporar actualmente:</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {COMPANY_PRESET_ROLES.map((role) => {
                        const isSelected = selectedRoles.includes(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => toggleCompanyRole(role)}
                            className={`p-3 rounded-lg border text-xs text-left font-medium transition-all ${
                              isSelected ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-md' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{role}</span>
                              {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* BLOQUE 3: HABILIDADES TÉCNICAS */}
                  <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center space-x-2">
                      <Code className="w-4 h-4" />
                      <span>3. Rellenar habilidades técnicas más necesarias *</span>
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">Marca las tecnologías imprescindibles o añade las tuyas propias:</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {COMPANY_PRESET_TECHS.map((tech) => {
                        const isSelected = selectedTechSkills.includes(tech);
                        return (
                          <button
                            key={tech}
                            type="button"
                            onClick={() => toggleTechSkill(tech)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                              isSelected ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}{tech}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customTechInput}
                        onChange={(e) => setCustomTechInput(e.target.value)}
                        placeholder="Añadir otra tecnología personalizada (ej. GraphQL, Kubernetes...)"
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={addCustomTech}
                        className="px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Añadir</span>
                      </button>
                    </div>
                  </div>

                  {/* BLOQUE 4: HABILIDADES BLANDAS */}
                  <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center space-x-2">
                      <Sparkles className="w-4 h-4" />
                      <span>4. Habilidades blandas más necesarias</span>
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">Indica qué competencias comportamentales valoras más:</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {COMPANY_PRESET_SOFT_SKILLS.map((soft) => {
                        const isSelected = selectedSoftSkills.includes(soft);
                        return (
                          <button
                            key={soft}
                            type="button"
                            onClick={() => toggleSoftSkill(soft)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                              isSelected ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}{soft}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customSoftInput}
                        onChange={(e) => setCustomSoftInput(e.target.value)}
                        placeholder="Añadir otra habilidad blanda personalizada..."
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={addCustomSoft}
                        className="px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Añadir</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xl transition-colors flex items-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Registrar Necesidades de la Empresa</span>
                    </button>
                  </div>

                </form>
              </div>
            )}

          </div>
        ) : (
          /* TAB DE REGISTROS GUARDADOS */
          <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full">
            <div className="mb-6 pb-4 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Solicitudes de Reclutamiento Guardadas</h2>
                <p className="text-xs text-slate-400">Datos persistidos en el sistema (LocalStorage)</p>
              </div>
              <button onClick={() => setCompanyTab('form')} className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded font-semibold">
                + Nueva Solicitud
              </button>
            </div>

            {companiesData.length === 0 ? (
              <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
                Aún no has registrado ninguna solicitud de empresa.
              </div>
            ) : (
              <div className="space-y-4">
                {companiesData.map((data) => (
                  <div key={data.id} className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex justify-between items-start border-b border-slate-900 pb-3">
                      <div>
                        <h4 className="font-bold text-white text-sm">{data.companyName}</h4>
                        <span className="text-xs text-slate-500">{data.contactEmail} — Registrado el {data.createdAt}</span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold border border-emerald-500/20">
                        Guardado en Sistema
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-xs font-semibold block mb-1">Roles Buscados:</span>
                      <div className="flex flex-wrap gap-1">
                        {data.neededRoles.map(r => (
                          <span key={r} className="px-2 py-0.5 bg-slate-900 text-slate-300 rounded text-xs border border-slate-800">{r}</span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 text-xs font-semibold block mb-1">Habilidades Técnicas:</span>
                      <div className="flex flex-wrap gap-1">
                        {data.techSkills.map(t => (
                          <span key={t} className="px-2 py-0.5 bg-indigo-950 text-indigo-300 rounded text-xs border border-indigo-900">{t}</span>
                        ))}
                      </div>
                    </div>

                    {data.softSkills.length > 0 && (
                      <div>
                        <span className="text-slate-400 text-xs font-semibold block mb-1">Habilidades Blandas:</span>
                        <div className="flex flex-wrap gap-1">
                          {data.softSkills.map(s => (
                            <span key={s} className="px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded text-xs border border-emerald-900">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}