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
  // 1. ESTADOS DE NAVEGACIÓN Y PERFIL DE USUARIO
  // ==========================================
  const [activeTab, setActiveTab] = useState('welcome'); // Controla la pantalla activa (welcome, diagnostic, roadmap, interview, ask)
  const [profileType, setProfileType] = useState<string | null>(null); // Almacena si el usuario eligió 'junior' o 'reskill' (reconversión)
  
  // ==========================================
  // 2. ESTADOS DEL FORMULARIO DE DIAGNÓSTICO
  // ==========================================
  const [targetRole, setTargetRole] = useState('frontend'); // Rol IT al que aspira el usuario
  const [techStack, setTechStack] = useState<string[]>([]); // Tecnologías seleccionadas por el usuario
  const [englishLevel, setEnglishLevel] = useState('B1'); // Nivel de inglés profesional seleccionado
  const [experienceMonths, setExperienceMonths] = useState('0-6'); // Experiencia práctica acumulada
  const [mainBlocker, setMainBlocker] = useState('cv'); // Principal obstáculo en su búsqueda laboral

  // ==========================================
  // 3. ESTADOS DEL SIMULADOR DE ENTREVISTAS
  // ==========================================
  const [interviewRole, setInterviewRole] = useState('frontend'); // Rol de la entrevista técnica
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0); // Índice de la pregunta actual
  const [userAnswer, setUserAnswer] = useState(''); // Respuesta escrita por el usuario
  const [interviewFeedback, setInterviewFeedback] = useState<any>(null); // Feedback generado tras evaluar la respuesta
  const [isEvaluating, setIsEvaluating] = useState(false); // Estado de carga durante la evaluación simulada

  // ==========================================
  // 4. ESTADOS DEL CHAT CON EL MENTOR IT
  // ==========================================
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'bot',
      text: '¡Hola! Soy tu mentor IT. Puedo responder dudas sobre cómo conseguir tu primer empleo, qué proyectos construir, pretensiones salariales o cómo superar filtros de reclutadores. ¿Qué quieres consultar hoy?'
    }
  ]);
  const [chatInput, setChatInput] = useState(''); // Texto ingresado en el input del chat
  const chatEndRef = useRef<HTMLDivElement>(null); // Referencia para auto-scroll al final del chat

  // Efecto para desplazar la vista automáticamente al último mensaje del chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Listado de tecnologías disponibles para marcar en el test
  const availableTech = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 
    'Java', 'HTML/CSS', 'SQL', 'Git/GitHub', 'Docker', 
    'Tailwind CSS', 'Express', 'Spring Boot', 'Figma'
  ];

  // Función para marcar o desmarcar tecnologías de forma interactiva
  const handleTechToggle = (tech: string) => {
    if (techStack.includes(tech)) {
      setTechStack(techStack.filter(t => t !== tech));
    } else {
      setTechStack([...techStack, tech]);
    }
  };

  // Base de datos de roles IT, demandas, salarios y proyectos clave recomendados
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

  // Banco de preguntas técnicas y comportamentales para entrevistas
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

  // Filtra las preguntas según el rol seleccionado y perfil del usuario
  const filteredQuestions = interviewQuestions.filter(q => q.role === interviewRole || q.role === 'general' || (profileType === 'reskill' && q.role === 'reskill'));

  // Evalúa de manera simulada la respuesta de la entrevista introducida por el usuario
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

  // Avanza a la siguiente pregunta del simulador
  const handleNextQuestion = () => {
    setUserAnswer('');
    setInterviewFeedback(null);
    setCurrentQuestionIdx((prev) => (prev + 1) % filteredQuestions.length);
  };

  // Gestiona el envío de preguntas y respuestas automáticas del bot mentor
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

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      
      {/* BARRA LATERAL DE NAVEGACIÓN (Escritorio) */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 hidden md:flex">
        <div>
          {/* Logo y cabecera de la app */}
          <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-white">Orientador IT</h1>
              <p className="text-xs text-slate-400">Guía de Carrera & Mercado</p>
            </div>
          </div>

          {/* Insignia del perfil de usuario seleccionado */}
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

          {/* Opciones de menú principal */}
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

        {/* Pie de la barra lateral */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Mercado IT Actualizado 2026</span>
          </div>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
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

        {/* ========================================== */}
        {/* PANTALLA 1: BIENVENIDA Y SELECCIÓN DE PERFIL */}
        {/* ========================================== */}
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

            <div className="grid md:grid-cols-2 gap-5 mb-8">
              {/* Tarjeta de Perfil Junior */}
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

              {/* Tarjeta de Perfil Reconversión Digital */}
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

            {/* Bloque explicativo de pilares */}
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

        {/* ========================================== */}
        {/* PANTALLA 2: DIAGNÓSTICO TÉCNICO Y DE PERFIL */}
        {/* ========================================== */}
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
              {/* Selección de Rol Objetivo */}
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

              {/* Selección del Stack Tecnológico */}
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

              {/* Nivel de inglés y Experiencia */}
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

              {/* Mayor obstáculo actual */}
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

              {/* Botón de acción para generar el roadmap */}
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setActiveTab('roadmap')}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition-colors flex items-center space-x-2 shadow-lg"
                >
                  <span>Generar Plan de Acción Personalizado</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* PANTALLA 3: PLAN DE ACCIÓN Y ROADMAP (CV)  */}
        {/* ========================================== */}
        {activeTab === 'roadmap' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full">
            <div className="mb-6 flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Matriz de Recomendación Directa</h2>
                <p className="text-xs text-slate-400">Plan estratégico ajustado a tus selecciones y demanda de mercado.</p>
              </div>
              <button onClick={() => setActiveTab('diagnostic')} className="text-xs text-indigo-400 hover:underline">
                <span>Ajustar respuestas</span>
              </button>
            </div>

            {/* Cabecera del rol objetivo */}
            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Rol Objetivo Seleccionado</span>
                  <h3 className="text-2xl font-bold text-white">{roleData[targetRole].name}</h3>
                </div>
                <div className="flex space-x-4 text-xs">
                  <div className="bg-slate-900 px-3 py-2 rounded border border-slate-800">
                    <span className="text-slate-500 block">Demanda de Mercado</span>
                    <span className="font-bold text-emerald-400">{roleData[targetRole].marketDemand}</span>
                  </div>
                  <div className="bg-slate-900 px-3 py-2 rounded border border-slate-800">
                    <span className="text-slate-500 block">Rango Salarial Junior</span>
                    <span className="font-bold text-slate-200">{roleData[targetRole].avgSalaryJunior}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pilares: Puntos fuertes y Estrategia de CV */}
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
                  {profileType === 'reskill' && (
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
                  {roleData[targetRole].mustHave.map((req: string) => {
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
                      {roleData[targetRole].keyProject}
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
                    onClick={() => { setInterviewRole(targetRole); setActiveTab('interview'); }}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-lg transition-colors flex justify-center items-center space-x-2"
                  >
                    <span>Pasar al Simulador de Entrevista</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Checklist semanal */}
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

        {/* ========================================== */}
        {/* PANTALLA 4: SIMULADOR DE ENTREVISTAS      */}
        {/* ========================================== */}
        {activeTab === 'interview' && (
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

                {/* Panel de Feedback */}
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

        {/* ========================================== */}
        {/* PANTALLA 5: CHAT CON EL MENTOR IT          */}
        {/* ========================================== */}
        {activeTab === 'ask' && (
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

            {/* Historial de mensajes */}
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

            {/* Formulario de entrada de chat */}
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