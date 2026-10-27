/**
 * @file mockData.ts
 * @description Catálogo estático de roles IT, preguntas de entrevista y tecnologías disponibles.
 */

import type { RoleDetail, InterviewQuestion } from './types';

export const AVAILABLE_TECH_STACK = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 
  'Java', 'HTML/CSS', 'SQL', 'Git/GitHub', 'Docker', 
  'Tailwind CSS', 'Express', 'Spring Boot', 'Figma'
];

export const ROLE_DATABASE: Record<string, RoleDetail> = {
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

export const COMPANY_PRESET_ROLES = [
  'Frontend Developer', 'Backend Developer', 'Fullstack Developer', 
  'Data Analyst / BI', 'QA Automation / Tester', 'DevOps Engineer', 
  'UX/UI Designer', 'Mobile Developer (React Native/Flutter)'
];

export const COMPANY_PRESET_TECHS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 
  'SQL / PostgreSQL', 'MongoDB', 'Docker', 'Git / GitHub', 'Spring Boot', 
  'Tailwind CSS', 'AWS / Cloud', 'PowerBI'
];

export const COMPANY_PRESET_SOFT_SKILLS = [
  'Trabajo en equipo', 'Comunicación efectiva', 'Resolución de problemas', 
  'Adaptabilidad / Proactividad', 'Gestión del tiempo', 'Pensamiento crítico', 
  'Capacidad de autogestión', 'Inglés fluido / técnico'
];