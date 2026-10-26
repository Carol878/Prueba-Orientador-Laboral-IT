import React, { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, 
  UserCheck, 
  Compass, 
  MessageSquare, 
  CheckCircle2, 
  Terminal, 
  BookOpen, 
  Award, 
  TrendingUp, 
  ChevronRight, 
  Send, 
  RefreshCw, 
  HelpCircle,
  FileText,
  Sparkles,
  ArrowRight,
  Code,
  Layers,
  Zap
} from 'lucide-react';

export default function App() {
  // ==========================================
  // 1. ESTADOS PRINCIPALES DE NAVEGACIÓN Y PERFIL
  // ==========================================
  const [activeTab, setActiveTab] = useState('welcome'); // Controla qué pantalla se muestra (welcome, diagnostic, roadmap, interview, ask)
  const [profileType, setProfileType] = useState<string | null>(null); // Almacena si el usuario es 'junior' o 'reskill' (reconversión)
  
  // ==========================================
  // 2. ESTADOS DEL FORMULARIO DE DIAGNÓSTICO
  // ==========================================
  const [targetRole, setTargetRole] = useState('frontend'); // Rol IT elegido por el usuario (frontend, backend, etc.)
  const [techStack, setTechStack] = useState<string[]>([]); // Tecnologías que el usuario seleccionó que domina
  const [englishLevel, setEnglishLevel] = useState('B1'); // Nivel de inglés del usuario
  const [experienceMonths, setExperienceMonths] = useState('0-6'); // Experiencia práctica acumulada
  const [mainBlocker, setMainBlocker] = useState('cv'); // Principal obstáculo del usuario en la búsqueda de empleo

  // ==========================================
  // 3. ESTADOS DEL SIMULADOR DE ENTREVISTAS
  // ==========================================
  const [interviewRole, setInterviewRole] = useState('frontend'); // Especialidad de la entrevista técnica
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0); // Índice de la pregunta actual del test
  const [userAnswer, setUserAnswer] = useState(''); // Respuesta escrita por el usuario en la entrevista
  const [interviewFeedback, setInterviewFeedback] = useState<any>(null); // Resultado y puntuación de la evaluación por IA simulada
  const [isEvaluating, setIsEvaluating] = useState(false); // Indicador de carga mientras "evalúa" la respuesta

  // ==========================================
  // 4. ESTADOS DEL CHAT CON EL MENTOR
  // ==========================================
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'bot',
      text: '¡Hola! Soy tu mentor IT. Puedo responder dudas sobre cómo conseguir tu primer empleo, qué proyectos construir, pretensiones salariales o cómo superar filtros de reclutadores. ¿Qué quieres consultar hoy?'
    }
  ]);
  const [chatInput, setChatInput] = useState(''); // Texto que el usuario escribe en el chat
  const chatEndRef = useRef<HTMLDivElement>(null); // Referencia para hacer scroll automático al final del chat

  // Efecto para desplazar el scroll del chat automáticamente hacia abajo al recibir mensajes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Lista de tecnologías disponibles para marcar en el test diagnóstico
  const availableTech = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 
    'Java', 'HTML/CSS', 'SQL', 'Git/GitHub', 'Docker', 
    'Tailwind CSS', 'Express', 'Spring Boot', 'Figma'
  ];

  // Función para marcar o desmarcar tecnologías en el cuestionario
  const handleTechToggle = (tech: string) => {
    if (techStack.includes(tech)) {
      setTechStack(techStack.filter(t => t !== tech));
    } else {
      setTechStack([...techStack, tech]);
    }
  };

  // Base de datos interna con los roles IT, demandas de mercado, salarios y proyectos clave recomendados
  const roleData: Record<string, any> = {
    frontend: {
      name: 'Frontend Developer',
      mustHave: ['JavaScript (ES6+)', 'React / Vue / Angular', 'HTML5 & CSS3', 'Git', 'Responsive Design'],
      niceToHave: ['TypeScript', 'Next.js / Nuxt', 'Tailwind CSS', 'Testing (Jest/Cypress)', 'State Mgmt (Zustand/Redux)'],
      marketDemand: 'Alta',
      avgSalaryJunior: '20.000€ - 26.000€ / año',
      keyProject: 'Aplicación web interactiva que consuma una API externa con paginación, filtros y gestión de estado persistente.'
    },
    backend: {
      name: 'Backend Developer',
      mustHave: ['Node.js / Python / Java', 'SQL / Relational DBs', 'REST APIs', 'Git', 'Authentication / JWT'],
      niceToHave: ['Docker', 'MongoDB / NoSQL', 'TypeScript', 'Clean Architecture', 'Testing (Unit/Integration)'],
      marketDemand: 'Muy Alta',
      avgSalaryJunior: '22.000€ - 28.000€ / año',
      keyProject: 'API REST robusta con autenticación de usuarios, roles de acceso, validación de datos y documentación en Swagger.'
    },
    fullstack: {
      name: 'Fullstack Developer',
      mustHave: ['JavaScript / TypeScript', 'React / Frontend Framework', 'Node.js / Backend Language', 'SQL / NoSQL', 'Git'],
      niceToHave: ['Docker', 'CI/CD basics', 'Cloud Deployments (Vercel/Render)', 'ORM (Prisma/TypeORM)'],
      marketDemand: 'Muy Alta',
      avgSalaryJunior: '22.000€ - 29.000€ / año',
      keyProject: 'SaaS simple con panel de usuario, pagos integrados (Stripe demo) y CRUD completo con base de datos.'
    },
    data: {
      name: 'Data Analyst / BI',
      mustHave: ['SQL avanzado', 'Python (Pandas, NumPy)', 'PowerBI / Tableau', 'Excel Avanzado', 'Estadística básica'],
      niceToHave: ['Scikit-Learn', 'ETL pipelines', 'BigQuery / Snowflake', 'Git'],
      marketDemand: 'Alta',
      avgSalaryJunior: '21.000€ - 27.000€ / año',
      keyProject: 'Dashboard interactivo de negocio analizando un dataset real de Kaggle con hallazgos e hipótesis explicadas.'
    },
    qa: {
      name: 'QA Automation / Tester',
      mustHave: ['Metodología de Testing', 'JavaScript / Python', 'Cypress / Selenium', 'Git', 'Postman / API Testing'],
      niceToHave: ['CI/CD (GitHub Actions)', 'Playwright', 'Jira / TestRail', 'Performance Testing (JMeter)'],
      marketDemand: 'Alta',
      avgSalaryJunior: '20.000€ - 25.000€ / año',
      keyProject: 'Suite de pruebas end-to-end automatizada para una e-commerce simulada con generación de reportes.'
    }
  };

  // Banco de preguntas técnicas y comportamentales para las entrevistas
  const interviewQuestions = [
    {
      id: 1,
      role: 'frontend',
      type: 'Técnica',
      question: '¿Cuál es la diferencia entre let, const y var en JavaScript, y qué es el Hoisting?',
      keyPoints: ['var tiene scope de función y Hoisting con undefined.', 'let y const tienen scope de bloque (Temporal Dead Zone).', 'const no permite reasignación de la referencia.']
    },
    {
      id: 2,
      role: 'frontend',
      type: 'Técnica',
      question: 'Explica brevemente qué es el Virtual DOM en React y qué ventaja aporta frente al DOM real.',
      keyPoints: ['Es una representación liviana en memoria del DOM real.', 'React compara cambios (Reconciliation/Diffing algorithm).', 'Minimiza los repintados directos en el navegador mejorando el rendimiento.']
    },
    {
      id: 3,
      role: 'backend',
      type: 'Técnica',
      question: '¿Qué diferencia hay entre una base de datos Relacional (SQL) y una No Relacional (NoSQL)? ¿Cuándo usarías cada una?',
      keyPoints: ['SQL utiliza tablas estructuradas con esquemas fijos y relaciones (ACID).', 'NoSQL guarda documentos/llave-valor flexibilizando el esquema y escalando horizontalmente.', 'SQL para datos transaccionales/financieros; NoSQL para prototipado rápido o grandes volúmenes no estructurados.']
    },
    {
      id: 4,
      role: 'general',
      type: 'Comportamental (STAR)',
      question: 'Cuéntame alguna ocasión en la que te encontraste atascado con un bug técnico complejo por horas. ¿Cómo lo resolviste?',
      keyPoints: ['Estructura STAR (Situación, Tarea, Acción, Resultado).', 'Uso de herramientas de debugging, lectura de documentación o consulta estructurada a senior/equipo.', 'Aprendizaje extraído para evitar el problema en el futuro.']
    },
    {
      id: 5,
      role: 'reskill',
      type: 'Trayectoria / Transferencia',
      question: 'Vienes de un sector ajeno a la tecnología. ¿Qué habilidades transferibles de tu experiencia anterior crees que te hacen un mejor profesional IT?',
      keyPoints: ['Habilidades blandas: Comunicación, resolución de problemas bajo presión, gestión de clientes o proyectos.', 'Motivación real por el cambio tecnológico y capacidad de autoaprendizaje.', 'Madurez laboral y visión de negocio aplicada al código.']
    }
  ];

  // Filtra las preguntas según el rol seleccionado por el usuario en el simulador
  const filteredQuestions = interviewQuestions.filter(q => q.role === interviewRole || q.role === 'general' || (profileType === 'reskill' && q.role === 'reskill'));

  // Simula la evaluación de la respuesta del usuario mediante IA
  const handleEvaluateAnswer = () => {
    if (!userAnswer.trim()) return;
    setIsEvaluating(true);
    setTimeout(() => {
      setIsEvaluating(false);
      setInterviewFeedback({
        score: Math.floor(Math.random() * 25) + 75,
        strengths: 'Has estructurado tu respuesta con claridad y utilizado terminología técnica adecuada.',
        suggestions: 'Asegúrate de dar ejemplos concretos basados en proyectos propios para darle más peso a tu explicación.',
        checklist: filteredQuestions[currentQuestionIdx].keyPoints
      });
    }, 1000);
  };

  // Pasa a la siguiente pregunta del simulador de entrevistas
  const handleNextQuestion = () => {
    setUserAnswer('');
    setInterviewFeedback(null);
    setCurrentQuestionIdx((prev) => (prev + 1) % filteredQuestions.length);
  };

  // Lógica de respuestas automáticas del asistente mentor virtual
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
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

  // ==========================================
  // RENDERIZADO VISUAL DE LA APLICACIÓN (UI)
  // ==========================================
  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      
      {/* BARRA LATERAL DE NAVEGACIÓN (Escritorio) */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 hidden md:flex">
        <div>
          {/* Logo y título */}
          <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-white">Orientador IT</h1>
              <p className="text-xs text-slate-400">Guía de Carrera & Mercado</p>
            </div>
          </div>

          {/* Insignia de perfil seleccionado */}
          {profileType && (
            <div className="mx-4 my-4 p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-medium text-slate-300">
                  {profileType === 'junior' ? 'Perfil Junior IT' : 'Reconversión Digital'}
                </span>
              </div>
              <button 
                onClick={() => setProfileType(null)} 
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                title="Cambiar perfil"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Botones de navegación entre pestañas */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveTab('welcome')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'welcome' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Inicio y Perfil</span>
            </button>

            <button
              onClick={() => setActiveTab('diagnostic')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'diagnostic' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Diagnóstico Técnico</span>
            </button>

            <button
              onClick={() => setActiveTab('roadmap')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'roadmap' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Plan de Acción & CV</span>
            </button>

            <button
              onClick={() => setActiveTab('interview')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'interview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Simulador Entrevista</span>
            </button>

            <button
              onClick={() => setActiveTab('ask')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'ask' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Consultas al Mentor</span>
            </button>
          </nav>
        </div>

        {/* Pie de barra lateral con estado del mercado */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Mercado IT Actualizado 2026</span>
          </div>
        </div>
      </aside>

      {/* CONTENEDOR PRINCIPAL DE CONTENIDO */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-900">

        {/* Cabecera superior para dispositivos móviles */}
        <header className="p-4 bg-slate-950 border-b border-slate-800 flex md:hidden items-center justify-between">
          <div className="flex items-center space-x-2">
            <Compass className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-sm text-white">Orientador IT</span>
          </div>
          <div className="flex space-x-1 text-xs">
            <button onClick={() => setActiveTab('welcome')} className={`p-2 rounded ${activeTab === 'welcome' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Perfil</button>
            <button onClick={() => setActiveTab('diagnostic')} className={`p-2 rounded ${activeTab === 'diagnostic' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Diag.</button>
            <button onClick={() => setActiveTab('roadmap')} className={`p-2 rounded ${activeTab === 'roadmap' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Plan</button>
            <button onClick={() => setActiveTab('interview')} className={`p-2 rounded ${activeTab === 'interview' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Test</button>
            <button onClick={() => setActiveTab('ask')} className={`p-2 rounded ${activeTab === 'ask' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Chat</button>
          </div>
        </header>

        {/* PANTALLA 1: BIENVENIDA Y SELECCIÓN DE PERFIL */}
        {activeTab === 'welcome' && (
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

            {/* Tarjetas selectoras de perfil (Junior vs Reconversión) */}
            <div className="grid md:grid-cols-2 gap-5 mb-8">
              <div 
                onClick={() => { setProfileType('junior'); setActiveTab('diagnostic'); }}
                className={`p-6 rounded-xl border transition-all cursor-pointer relative ${
                  profileType === 'junior' ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
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
                onClick={() => { setProfileType('reskill'); setActiveTab('diagnostic'); }}
                className={`p-6 rounded-xl border transition-all cursor-pointer relative ${
                  profileType === 'reskill' ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
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
          </div>
        )}

        {/* PANTALLA 2: DIAGNÓSTICO TÉCNICO */}
        {activeTab === 'diagnostic' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full">
            <div className="mb-6 flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Diagnóstico del Estado Actual</h2>
                <p className="text-xs text-slate-400">Evalúa tus competencias clave para definir el roadmap óptimo.</p>
              </div>
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs rounded border border-slate-700">Paso 2 de 4</span>
            </div>

            <div className="space-y-8">
              {/* Selección de rol objetivo */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
                  1. ¿Hacia qué rol o especialización te orientas?
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {Object.keys(roleData).map((roleKey) => (
                    <button
                      key={roleKey}
                      type="button"
                      onClick={() => setTargetRole(roleKey)}
                      className={`p-3 rounded-lg border text-xs font-medium transition-all text-left ${
                        targetRole === roleKey ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {roleData[roleKey].name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selección múltiple de tecnologías */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  2. Selecciona las tecnologías con las que ya has construido al menos un proyecto:
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTech.map((tech) => {
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

              {/* Botón para avanzar al plan de acción */}
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setActiveTab('roadmap')}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition-colors flex items-center space-x-2"
                >
                  <span>Generar Plan de Acción Personalizado</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PANTALLA 3: PLAN DE ACCIÓN Y ROADMAP */}
        {activeTab === 'roadmap' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full">
            <div className="mb-6 flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Matriz de Recomendación Directa</h2>
                <p className="text-xs text-slate-400">Plan estratégico ajustado a tus selecciones y demanda de mercado.</p>
              </div>
            </div>
            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 mb-6">
              <h3 className="text-2xl font-bold text-white">{roleData[targetRole].name}</h3>
              <p className="text-xs text-slate-400 mt-1">Demanda: <span className="text-emerald-400 font-bold">{roleData[targetRole].marketDemand}</span> | Salario estimado: <span className="text-slate-200 font-bold">{roleData[targetRole].avgSalaryJunior}</span></p>
            </div>
          </div>
        )}

        {/* PANTALLA 4: SIMULADOR DE ENTREVISTAS */}
        {activeTab === 'interview' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full">
            <div className="mb-6 border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white">Simulador de Entrevista Técnica</h2>
              <p className="text-xs text-slate-400">Entrena preguntas reales de procesos de selección.</p>
            </div>
            {filteredQuestions.length > 0 && (
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                <h3 className="text-lg font-bold text-white mb-4">"{filteredQuestions[currentQuestionIdx].question}"</h3>
                <textarea
                  rows={4}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Escribe aquí tu respuesta explicativa..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 mb-4"
                />
                <button
                  onClick={handleEvaluateAnswer}
                  disabled={isEvaluating || !userAnswer.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg"
                >
                  {isEvaluating ? 'Evaluando...' : 'Evaluar Respuesta'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* PANTALLA 5: CHAT CON EL MENTOR */}
        {activeTab === 'ask' && (
          <div className="flex-1 flex flex-col h-full max-w-4xl mx-auto w-full p-4 md:p-6 overflow-hidden">
            <div className="pb-3 mb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">Consultas Directas al Mentor IT</h2>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-xl p-4 text-xs ${msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-200'}`}>
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
                placeholder="Pregunta sobre CV, salarios..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-xs text-slate-200"
              />
              <button type="submit" className="px-5 bg-indigo-600 text-white rounded-lg">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}