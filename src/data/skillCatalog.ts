/**
 * @file skillCatalog.ts
 * @description Tecnologías y herramientas que se pueden marcar en el diagnóstico.
 *
 * Arriba se muestran las más pedidas (`POPULAR_SKILLS`); el resto aparece al pulsar "Ver más",
 * agrupado por área y con buscador. Si una tecnología cubre un requisito de los puestos con otro
 * nombre (p. ej. "PostgreSQL" cubre "SQL"), la equivalencia está en `skillMatch.ts`; si cubre una
 * habilidad de los cursos, en `SKILL_ALIASES` de `trainingCatalog.ts`.
 */

/** Las más usadas en ofertas para primer empleo. Se muestran siempre. */
export const POPULAR_SKILLS = [
  'JavaScript', 'TypeScript', 'HTML/CSS', 'React', 'Node.js', 'Python',
  'Java', 'SQL', 'Git/GitHub', 'Docker', 'Linux', 'AWS',
  'Tailwind CSS', 'Figma', 'Excel', 'Power BI'
];

export interface SkillGroup {
  id: string;
  label: string;
  skills: string[];
}

/** Resto de opciones, por área. Una tecnología puede repetirse en las populares, nunca entre grupos. */
export const SKILL_GROUPS: SkillGroup[] = [
  {
    id: 'frontend',
    label: 'Webs y aplicaciones (frontend)',
    skills: [
      'Vue.js', 'Angular', 'Svelte', 'Next.js', 'Nuxt', 'Astro', 'Vite', 'Webpack',
      'Sass/SCSS', 'Bootstrap', 'jQuery', 'Redux', 'Zustand', 'Accesibilidad web (WCAG)',
      'Diseño responsive', 'WordPress', 'Shopify'
    ]
  },
  {
    id: 'backend',
    label: 'Servidores y APIs (backend)',
    skills: [
      'Express', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'PHP', 'Laravel',
      'C#', '.NET', 'Go', 'Ruby', 'Ruby on Rails', 'Kotlin', 'Rust', 'C', 'C++',
      'APIs REST', 'GraphQL', 'Microservicios', 'JWT / OAuth'
    ]
  },
  {
    id: 'databases',
    label: 'Bases de datos',
    skills: ['PostgreSQL', 'MySQL', 'MariaDB', 'SQL Server', 'Oracle', 'SQLite', 'MongoDB', 'Redis', 'Firebase', 'Supabase', 'Prisma', 'Hibernate']
  },
  {
    id: 'mobile',
    label: 'Apps móviles',
    skills: ['React Native', 'Flutter', 'Dart', 'Swift', 'Android', 'iOS', 'Expo', 'Ionic']
  },
  {
    id: 'cloud',
    label: 'Nube, sistemas y DevOps',
    skills: [
      'Azure', 'Google Cloud', 'Kubernetes', 'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions',
      'GitLab', 'CI/CD', 'Nginx', 'Apache', 'Bash', 'PowerShell', 'Windows Server', 'Vercel', 'Netlify'
    ]
  },
  {
    id: 'data',
    label: 'Datos e inteligencia artificial',
    skills: [
      'Pandas', 'NumPy', 'Matplotlib', 'Jupyter', 'R', 'Tableau', 'Looker Studio', 'Excel avanzado (tablas dinámicas)',
      'Scikit-learn', 'TensorFlow', 'PyTorch', 'Machine Learning', 'Estadística', 'ETL', 'BigQuery', 'Spark',
      'IA generativa (ChatGPT, Claude…)', 'Prompt engineering'
    ]
  },
  {
    id: 'testing',
    label: 'Pruebas y calidad (QA)',
    skills: ['Jest', 'Vitest', 'Cypress', 'Playwright', 'Selenium', 'Postman', 'JUnit', 'Pytest', 'Pruebas manuales', 'JMeter']
  },
  {
    id: 'security',
    label: 'Redes y ciberseguridad',
    skills: ['Redes', 'Cisco', 'Ciberseguridad', 'Wireshark', 'Kali Linux', 'Firewalls', 'Active Directory', 'Soporte técnico (helpdesk)']
  },
  {
    id: 'design',
    label: 'Diseño y contenido',
    skills: ['Adobe Photoshop', 'Adobe Illustrator', 'Canva', 'Diseño UX/UI', 'Prototipado', 'Edición de vídeo', 'Blender', 'Unity']
  },
  {
    id: 'management',
    label: 'Gestión y herramientas de oficina',
    skills: [
      'Jira', 'Trello', 'Notion', 'Scrum / Agile', 'Google Workspace', 'Microsoft 365', 'SAP',
      'Salesforce', 'CRM', 'Contabilidad / ERP', 'Marketing digital', 'SEO'
    ]
  }
];

/** Todas las opciones sin repetir (populares primero). */
export const ALL_SKILLS = [...new Set([...POPULAR_SKILLS, ...SKILL_GROUPS.flatMap(group => group.skills)])];
