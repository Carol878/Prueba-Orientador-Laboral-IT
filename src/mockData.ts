/**
 * @file mockData.ts
 * @description Catálogo estático de puestos, preguntas de entrevista y habilidades generales.
 */

import type { RoleDetail, InterviewQuestion } from './types';

/** Habilidades útiles fuera de la programación (puestos puente: datos, administración, atención al cliente…). */
export const GENERAL_SKILLS = [
  'Atención al cliente', 'Ofimática', 'Gestión de inventario', 'Caja y cobros',
  'Coordinación de equipos', 'Venta y asesoramiento', 'Gestión administrativa', 'Logística y almacén'
];

export const ROLE_DATABASE: Record<string, RoleDetail> = {
  frontend: {
    name: 'Frontend Developer',
    mustHave: ['JavaScript (ES6+)', 'React / Vue / Angular', 'HTML5 & CSS3', 'Git', 'Diseño responsive (adaptado a móvil)'],
    niceToHave: ['TypeScript', 'Next.js / Nuxt', 'Tailwind CSS', 'Tests automáticos (Jest/Cypress)', 'Gestión del estado (Zustand/Redux)'],
    marketDemand: 'Alta',
    avgSalaryJunior: '20.000€ - 26.000€ al año',
    keyProject: 'Una aplicación web que muestre datos de un servicio externo (API), con páginas, filtros y que recuerde lo que elige cada usuario.'
  },
  backend: {
    name: 'Backend Developer',
    mustHave: ['Node.js / Python / Java', 'SQL / bases de datos relacionales', 'APIs REST', 'Git', 'Autenticación de usuarios (JWT)'],
    niceToHave: ['Docker', 'MongoDB / NoSQL', 'TypeScript', 'Arquitectura limpia', 'Tests unitarios y de integración'],
    marketDemand: 'Muy alta',
    avgSalaryJunior: '22.000€ - 28.000€ al año',
    keyProject: 'Un servicio para otras aplicaciones (API REST) con inicio de sesión, distintos permisos por usuario, comprobación de datos y su documentación (Swagger).'
  },
  fullstack: {
    name: 'Fullstack Developer',
    mustHave: ['JavaScript / TypeScript', 'React u otro framework de frontend', 'Node.js u otro lenguaje de servidor', 'SQL / NoSQL', 'Git'],
    niceToHave: ['Docker', 'Bases de CI/CD (publicación automática)', 'Publicar en la nube (Vercel/Render)', 'ORM (Prisma/TypeORM)'],
    marketDemand: 'Muy alta',
    avgSalaryJunior: '22.000€ - 29.000€ al año',
    keyProject: 'Una aplicación web completa con área de usuario, pagos de prueba (Stripe) y opciones para crear, ver, editar y borrar datos guardados en una base de datos.'
  },
  data: {
    name: 'Data Analyst / BI',
    mustHave: ['SQL avanzado', 'Python (Pandas, NumPy)', 'PowerBI / Tableau', 'Excel avanzado', 'Estadística básica'],
    niceToHave: ['Scikit-Learn', 'Procesos ETL (mover y limpiar datos)', 'BigQuery / Snowflake', 'Git'],
    marketDemand: 'Alta',
    avgSalaryJunior: '21.000€ - 27.000€ al año',
    keyProject: 'Un panel interactivo (dashboard) que analice datos reales de Kaggle y explique qué has descubierto y por qué.'
  },
  qa: {
    name: 'QA Automation / Tester',
    mustHave: ['Metodología de pruebas', 'JavaScript / Python', 'Cypress / Selenium', 'Git', 'Postman / pruebas de APIs'],
    niceToHave: ['CI/CD (GitHub Actions)', 'Playwright', 'Jira / TestRail', 'Pruebas de rendimiento (JMeter)'],
    marketDemand: 'Alta',
    avgSalaryJunior: '20.000€ - 25.000€ al año',
    keyProject: 'Un conjunto de pruebas automáticas que recorra de principio a fin una tienda online de ejemplo y genere un informe de resultados.'
  }
};

export const INTERVIEW_QUESTIONS_DATABASE: InterviewQuestion[] = [
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
    type: 'Sobre ti (método STAR)',
    question: 'Cuéntame alguna ocasión en la que estuviste horas atascado con un error (bug) difícil. ¿Cómo lo resolviste?',
    keyPoints: ['Estructura STAR (Situación, Tarea, Acción, Resultado).', 'Uso de herramientas de debugging, lectura de documentación o preguntar al equipo o a alguien con más experiencia explicando bien el problema.', 'Aprendizaje extraído para evitar el problema en el futuro.']
  },
  {
    id: 5,
    role: 'reskill',
    type: 'Tu experiencia anterior',
    question: 'Vienes de un sector ajeno a la tecnología. ¿Qué habilidades transferibles de tu experiencia anterior crees que te hacen un mejor profesional de la tecnología?',
    keyPoints: ['Habilidades blandas: Comunicación, resolución de problemas bajo presión, gestión de clientes o proyectos.', 'Motivación real por el cambio tecnológico y capacidad de autoaprendizaje.', 'Madurez laboral y visión de negocio aplicada al código.']
  }
];

export const COMPANY_PRESET_ROLES = [
  'Frontend Developer', 'Backend Developer', 'Fullstack Developer',
  'Data Analyst / BI', 'QA Automation / Tester', 'DevOps Engineer',
  'UX/UI Designer', 'Mobile Developer (React Native/Flutter)',
  // Puestos puente (no técnicos o de entrada)
  'Atención al cliente', 'Administrativo/a', 'Auxiliar de almacén',
  'Soporte técnico', 'Analista de datos'
];
