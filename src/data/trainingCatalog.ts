/**
 * @file trainingCatalog.ts
 * @description Catálogo de recursos formativos gratuitos, subvencionados y mixtos recopilado
 * por el Grupo Motor, y perfiles objetivo usados por el recomendador de itinerarios.
 *
 * Entidad, precio, idioma y enlace se corresponden con la hoja de recursos de formación del equipo.
 * Modalidad, categoría, roles y skills son una clasificación propia para poder filtrar y recomendar.
 * Se han omitido los recursos sin relación con el empleo IT (salud, clima, propiedad intelectual...).
 */

export type TrainingCategory =
  | 'frontend'
  | 'backend'
  | 'cloud_devops'
  | 'cybersecurity'
  | 'ai_data'
  | 'soft_skills';

export type TrainingPriceType = 'subvencionado' | 'gratuito' | 'mixto';

export interface TrainingCourse {
  id: string;
  refCode: string;
  title: string;
  provider: string;
  category: TrainingCategory;
  priceType: TrainingPriceType;
  priceLabel: string;
  modality: 'Online' | 'Presencial' | 'Híbrido';
  language: 'Español' | 'Inglés' | 'Multilingüe';
  targetRoles: string[];
  skillsCovered: string[];
  officialCertification: boolean;
  /** Quién respalda la certificación: el Estado (homologación oficial) o el fabricante. */
  certificationIssuer?: 'estatal' | 'fabricante';
  certificationName?: string;
  url: string;
  description: string;
}

export const PRICE_LABELS = {
  subvencionado: 'Subvencionado al 100 % (gratis para ti)',
  gratuito: 'Gratis y abierto a todo el mundo',
  mixto: 'Una parte gratis y otra de pago'
} as const satisfies Record<TrainingPriceType, string>;

export const TRAINING_CATALOG: TrainingCourse[] = [
  {
    id: 'garantia-juvenil',
    refCode: 'SEPE-GJ-01',
    title: 'Ofertas de formación y empleo de Garantía Juvenil',
    provider: 'Sistema Nacional de Garantía Juvenil',
    category: 'soft_skills',
    priceType: 'subvencionado',
    priceLabel: PRICE_LABELS.subvencionado,
    modality: 'Híbrido',
    language: 'Español',
    targetRoles: ['Sin experiencia previa', 'Primer empleo'],
    skillsCovered: ['Empleabilidad', 'Competencias digitales'],
    officialCertification: false,
    url: 'https://www.sepe.es/HomeSepe/encontrar-trabajo/Garantia-Juvenil/ofertas-garantia-juvenil.html',
    description:
      'Formación gratuita y oportunidades remuneradas para jóvenes de 16 a 29 años que quieren mejorar su empleabilidad o encontrar su primer empleo.'
  },
  {
    id: 'sepe-certificados-fp',
    refCode: 'SEPE-FP-02',
    title: 'Certificados Profesionales de FP',
    provider: 'Servicio Público de Empleo Estatal (SEPE)',
    category: 'backend',
    priceType: 'subvencionado',
    priceLabel: PRICE_LABELS.subvencionado,
    modality: 'Híbrido',
    language: 'Español',
    targetRoles: ['Junior Frontend', 'Junior Backend', 'Sistemas y redes'],
    skillsCovered: ['Fundamentos de programación', 'HTML/CSS', 'JavaScript', 'SQL', 'Java', 'Redes', 'Seguridad'],
    officialCertification: true,
    certificationIssuer: 'estatal',
    certificationName: 'Certificado Profesional (FP)',
    url: 'https://www.todofp.es/inicio.html',
    description:
      'Acreditaciones oficiales de Formación Profesional, incluida la familia de Informática y Comunicaciones (desarrollo web, programación, bases de datos, redes y seguridad).'
  },
  {
    id: 'fundae',
    refCode: 'FUNDAE-03',
    title: 'Formación subvencionada para trabajadores y autónomos',
    provider: 'FUNDAE (Fundación Estatal para la Formación en el Empleo)',
    category: 'soft_skills',
    priceType: 'subvencionado',
    priceLabel: PRICE_LABELS.subvencionado,
    modality: 'Híbrido',
    language: 'Español',
    targetRoles: ['Reconversión laboral', 'Primer empleo'],
    skillsCovered: ['Competencias digitales', 'Cloud', 'Seguridad'],
    officialCertification: false,
    url: 'https://experienciafundae.es/formacion-subvencionada',
    description:
      'Formación estatal subvencionada para empresas, personas trabajadoras y autónomas. Útil para quien ya trabaja y quiere reorientarse hacia el sector IT.'
  },
  {
    id: 'gencat-cifo',
    refCode: 'GENCAT-CIFO-04',
    title: "Centres d'Innovació i Formació Ocupacional (CIFO)",
    provider: 'Generalitat de Catalunya',
    category: 'backend',
    priceType: 'subvencionado',
    priceLabel: PRICE_LABELS.subvencionado,
    modality: 'Presencial',
    language: 'Español',
    targetRoles: ['Junior Backend', 'Sistemas y redes', 'Reconversión laboral'],
    skillsCovered: ['Fundamentos de programación', 'Redes', 'Competencias digitales'],
    officialCertification: false,
    url: 'https://serveiocupacio.gencat.cat/ca/soc/com-ens-organitzem/centres-propis-formacio-cifo-cfpa/centres-dinnovacio-i-formacio-ocupacional-cifo/',
    description:
      'Centros propios del Servei d’Ocupació de Catalunya con especialidades de formación ocupacional, entre ellas informática y comunicaciones.'
  },
  {
    id: 'gencat-cercador',
    refCode: 'GENCAT-CERC-05',
    title: 'Buscador integrado de cursos, especialidades y centros de formación',
    provider: 'Generalitat de Catalunya',
    category: 'soft_skills',
    priceType: 'subvencionado',
    priceLabel: PRICE_LABELS.subvencionado,
    modality: 'Híbrido',
    language: 'Español',
    targetRoles: ['Sin experiencia previa', 'Reconversión laboral'],
    skillsCovered: ['Competencias digitales', 'Empleabilidad'],
    officialCertification: false,
    url: 'https://serveiocupacio.gencat.cat/ca/persones/vull-formar-me/cercadors-formacio-especialitats/cercador-integrat',
    description:
      'Buscador del Servei d’Ocupació de Catalunya para localizar cursos subvencionados por especialidad, territorio y centro.'
  },
  {
    id: 'fpdgi-generacio-talent',
    refCode: 'FPDGI-GT-06',
    title: 'Generació Talent: mentoring, talleres y e-learning',
    provider: 'Fundació Princesa de Girona',
    category: 'soft_skills',
    priceType: 'subvencionado',
    priceLabel: PRICE_LABELS.subvencionado,
    modality: 'Híbrido',
    language: 'Español',
    targetRoles: ['Sin experiencia previa', 'Primer empleo'],
    skillsCovered: ['Mentoría', 'Empleabilidad', 'Comunicación'],
    officialCertification: false,
    url: 'https://www.fpdgi.org/ca/programes/generacio-talent/',
    description:
      'Programa de acompañamiento para jóvenes con mentoring, talleres y formación online orientados a la empleabilidad.'
  },
  {
    id: 'paco-puerto-ccoo',
    refCode: 'CCOO-FPP-07',
    title: 'Oferta formativa: acreditaciones y formación ocupacional',
    provider: 'Fundació Paco Puerto CCOO',
    category: 'soft_skills',
    priceType: 'mixto',
    priceLabel: PRICE_LABELS.mixto,
    modality: 'Híbrido',
    language: 'Español',
    targetRoles: ['Reconversión laboral'],
    skillsCovered: ['Competencias digitales', 'Empleabilidad'],
    officialCertification: false,
    url: 'https://fundaciopacopuerto.cat/cursos/',
    description:
      'Cursos de acreditación de competencias, preparación de oposiciones y formación ocupacional.'
  },
  {
    id: 'fad-goetech-academy',
    refCode: 'FAD-GOETECH-08',
    title: 'GoeTech Academy: certificaciones Microsoft, Cisco, Meta e IBM SkillsBuild',
    provider: 'Fundación Fad Juventud',
    category: 'cloud_devops',
    priceType: 'subvencionado',
    priceLabel: PRICE_LABELS.subvencionado,
    modality: 'Online',
    language: 'Multilingüe',
    targetRoles: ['Junior Frontend', 'Junior Backend', 'Cloud', 'Ciberseguridad', 'Sin experiencia previa'],
    skillsCovered: ['Cloud', 'Redes', 'Seguridad', 'IA', 'Python', 'Competencias digitales'],
    officialCertification: true,
    certificationIssuer: 'fabricante',
    certificationName: 'Microsoft · Cisco · Meta · IBM SkillsBuild',
    url: 'https://www.campusfad.org/goetech-academy/',
    description:
      'Itinerarios del campus de Fad Juventud que preparan para certificados de grandes empresas tecnológicas, muy valorados al buscar trabajo.'
  },
  {
    id: 'securiti-education',
    refCode: 'SECURITI-09',
    title: 'Certificaciones: AI Governance, Data Security y PrivacyOps',
    provider: 'Securiti Education',
    category: 'cybersecurity',
    priceType: 'gratuito',
    priceLabel: PRICE_LABELS.gratuito,
    modality: 'Online',
    language: 'Inglés',
    targetRoles: ['Ciberseguridad', 'Gobernanza IA'],
    skillsCovered: ['Gobernanza IA', 'Ética IA', 'Protección de datos', 'Seguridad'],
    officialCertification: true,
    certificationIssuer: 'fabricante',
    certificationName: 'Securiti AI Governance / Data Security / PrivacyOps',
    url: 'https://education.securiti.ai/certifications/ai-governance/',
    description:
      'Certificaciones gratuitas sobre el uso responsable de la IA, la seguridad de los datos y la privacidad.'
  },
  {
    id: 'ashoka-learning',
    refCode: 'ASHOKA-10',
    title: 'Innovación social, changemaking y cambio sistémico',
    provider: 'Ashoka Learning Ecosystem',
    category: 'soft_skills',
    priceType: 'gratuito',
    priceLabel: PRICE_LABELS.gratuito,
    modality: 'Online',
    language: 'Multilingüe',
    targetRoles: ['Primer empleo'],
    skillsCovered: ['Emprendimiento social', 'Comunicación'],
    officialCertification: false,
    url: 'https://ale.ashoka.org/',
    description:
      'Recursos de aprendizaje sobre innovación social y liderazgo de proyectos con impacto.'
  },
  {
    id: 'mckinsey-forward',
    refCode: 'MCK-FWD-11',
    title: 'McKinsey.org Forward',
    provider: 'McKinsey.org',
    category: 'soft_skills',
    priceType: 'gratuito',
    priceLabel: PRICE_LABELS.gratuito,
    modality: 'Online',
    language: 'Multilingüe',
    targetRoles: ['Primer empleo', 'Reconversión laboral'],
    skillsCovered: ['Empleabilidad', 'Comunicación', 'Resolución de problemas', 'Competencias digitales'],
    officialCertification: false,
    url: 'https://www.mckinsey.org/our-programs/forward/overview',
    description:
      'Programa para estudiantes, personas en búsqueda de empleo y profesionales centrado en habilidades transversales para el trabajo.'
  },
  {
    id: 'coursera',
    refCode: 'COURSERA-12',
    title: 'MOOCs, especializaciones y preparación para certificados tech',
    provider: 'Coursera',
    category: 'ai_data',
    priceType: 'mixto',
    priceLabel: PRICE_LABELS.mixto,
    modality: 'Online',
    language: 'Multilingüe',
    targetRoles: ['Junior Frontend', 'Junior Backend', 'Datos & IA', 'Ciberseguridad'],
    skillsCovered: ['Python', 'SQL', 'React', 'JavaScript', 'Git', 'Cloud', 'Seguridad', 'IA', 'Ciencia de datos'],
    officialCertification: false,
    url: 'https://www.coursera.org/',
    description:
      'Plataforma con cursos de universidades y empresas tecnológicas. Muchos cursos se pueden seguir gratis; el certificado suele ser de pago.'
  },
  {
    id: 'khan-academy',
    refCode: 'KHAN-13',
    title: 'Matemáticas, ciencias y programación',
    provider: 'Khan Academy',
    category: 'frontend',
    priceType: 'gratuito',
    priceLabel: PRICE_LABELS.gratuito,
    modality: 'Online',
    language: 'Multilingüe',
    targetRoles: ['Sin experiencia previa'],
    skillsCovered: ['Fundamentos de programación', 'HTML/CSS', 'JavaScript', 'SQL', 'Matemáticas'],
    officialCertification: false,
    url: 'https://es.khanacademy.org/',
    description:
      'Cursos gratuitos de matemáticas, ciencias, economía y programación. Buen punto de partida sin conocimientos previos.'
  },
  {
    id: 'freecodecamp',
    refCode: 'FCC-14',
    title: 'Plataforma interactiva de desarrollo de software',
    provider: 'freeCodeCamp',
    category: 'frontend',
    priceType: 'gratuito',
    priceLabel: PRICE_LABELS.gratuito,
    modality: 'Online',
    language: 'Inglés',
    targetRoles: ['Junior Frontend', 'Junior Backend', 'Full Stack', 'Sin experiencia previa'],
    skillsCovered: ['HTML/CSS', 'JavaScript', 'React', 'Python', 'SQL', 'PostgreSQL', 'APIs REST', 'Git', 'Seguridad'],
    officialCertification: false,
    url: 'https://www.freecodecamp.org/',
    description:
      'Currículo práctico y gratuito de desarrollo web y programación basado en proyectos, con certificados propios de la plataforma.'
  },
  {
    id: 'edx',
    refCode: 'EDX-15',
    title: 'MOOCs, especializaciones y preparación para certificados tech',
    provider: 'edX',
    category: 'ai_data',
    priceType: 'mixto',
    priceLabel: PRICE_LABELS.mixto,
    modality: 'Online',
    language: 'Multilingüe',
    targetRoles: ['Junior Backend', 'Datos & IA', 'Full Stack'],
    skillsCovered: ['Fundamentos de programación', 'Python', 'SQL', 'HTML/CSS', 'JavaScript', 'Ciencia de datos', 'IA'],
    officialCertification: false,
    url: 'https://www.edx.org/',
    description:
      'Cursos de universidades internacionales. El contenido suele ser de acceso libre y el certificado verificado, de pago.'
  },
  {
    id: 'uned-abierta',
    refCode: 'UNED-16',
    title: 'Cursos MOOC gratuitos y materiales de divulgación',
    provider: 'UNED Abierta',
    category: 'soft_skills',
    priceType: 'gratuito',
    priceLabel: PRICE_LABELS.gratuito,
    modality: 'Online',
    language: 'Español',
    targetRoles: ['Sin experiencia previa', 'Reconversión laboral'],
    skillsCovered: ['Competencias digitales', 'Fundamentos de programación'],
    officialCertification: false,
    url: 'https://iedra.uned.es/',
    description:
      'Plataforma de cursos online gratuitos (MOOC) de la UNED, con materiales de divulgación e investigación en español.'
  },
  {
    id: 'mit-ocw',
    refCode: 'MIT-OCW-17',
    title: '2.500 cursos del Massachusetts Institute of Technology',
    provider: 'MIT OpenCourseWare',
    category: 'ai_data',
    priceType: 'gratuito',
    priceLabel: PRICE_LABELS.gratuito,
    modality: 'Online',
    language: 'Inglés',
    targetRoles: ['Junior Backend', 'Datos & IA'],
    skillsCovered: ['Fundamentos de programación', 'Python', 'Matemáticas', 'Ciencia de datos', 'IA'],
    officialCertification: false,
    url: 'https://ocw.mit.edu/',
    description:
      'Materiales completos de asignaturas del MIT, incluidas ciencias de la computación y programación en Python. Sin certificado.'
  },
  {
    id: 'futurelearn',
    refCode: 'FUTURELEARN-18',
    title: 'MOOCs, especializaciones y preparación para certificados tech',
    provider: 'FutureLearn',
    category: 'cloud_devops',
    priceType: 'mixto',
    priceLabel: PRICE_LABELS.mixto,
    modality: 'Online',
    language: 'Inglés',
    targetRoles: ['Cloud', 'Ciberseguridad', 'Datos & IA'],
    skillsCovered: ['Cloud', 'Seguridad', 'Python', 'IA'],
    officialCertification: false,
    url: 'https://www.futurelearn.com/',
    description:
      'Cursos online de universidades y organizaciones, con acceso gratuito limitado y opciones de pago.'
  },
  {
    id: 'udemy',
    refCode: 'UDEMY-19',
    title: 'Cursos en vídeo de programación, diseño y negocio',
    provider: 'Udemy',
    category: 'frontend',
    priceType: 'mixto',
    priceLabel: PRICE_LABELS.mixto,
    modality: 'Online',
    language: 'Multilingüe',
    targetRoles: ['Junior Frontend', 'Junior Backend', 'Full Stack'],
    skillsCovered: ['React', 'Vue', 'TypeScript', 'Tailwind', 'JavaScript', 'Python', 'SQL', 'PostgreSQL', 'APIs REST', 'Git'],
    officialCertification: false,
    url: 'https://www.udemy.com/',
    description:
      'Catálogo muy amplio de cursos en vídeo. Hay cursos gratuitos, pero la mayoría son de pago y la calidad varía.'
  },
  {
    id: 'saylor',
    refCode: 'SAYLOR-20',
    title: 'Certificados gratuitos en Computer Science, matemáticas e inglés',
    provider: 'Saylor Academy',
    category: 'backend',
    priceType: 'gratuito',
    priceLabel: PRICE_LABELS.gratuito,
    modality: 'Online',
    language: 'Inglés',
    targetRoles: ['Junior Backend', 'Sin experiencia previa'],
    skillsCovered: ['Fundamentos de programación', 'Redes', 'Matemáticas', 'Inglés'],
    officialCertification: false,
    url: 'https://www.saylor.org/Programs',
    description:
      'Cursos a tu ritmo, con certificado gratuito de la plataforma, en informática, negocio, matemáticas e inglés.'
  },
  {
    id: 'santander-open-academy',
    refCode: 'SANTANDER-21',
    title: 'Cursos, becas de estudios y becas de movilidad',
    provider: 'Santander Open Academy',
    category: 'soft_skills',
    priceType: 'gratuito',
    priceLabel: PRICE_LABELS.gratuito,
    modality: 'Online',
    language: 'Multilingüe',
    targetRoles: ['Sin experiencia previa', 'Primer empleo', 'Reconversión laboral'],
    skillsCovered: ['Competencias digitales', 'IA', 'Inglés', 'Empleabilidad'],
    officialCertification: false,
    url: 'https://www.santanderopenacademy.com/en/index.html',
    description:
      'Cursos gratuitos y convocatorias de becas para formación y movilidad.'
  }
];

export type TrainingProfileId = 'all' | 'frontend' | 'backend_python' | 'cyber_ai' | 'zero';

export interface TrainingProfile {
  id: TrainingProfileId;
  label: string;
  requiredSkills: string[];
  /** Solo recursos sin coste (subvencionados o de acceso abierto). */
  freeOnly: boolean;
}

export const TRAINING_PROFILES: TrainingProfile[] = [
  { id: 'all', label: 'Ver todos los cursos', requiredSkills: [], freeOnly: false },
  {
    id: 'frontend',
    label: 'Desarrollo web (frontend)',
    requiredSkills: ['React', 'Vue', 'TypeScript', 'Tailwind', 'Git'],
    freeOnly: false
  },
  {
    id: 'backend_python',
    label: 'Programación de servidores con Python',
    requiredSkills: ['Python', 'SQL', 'PostgreSQL', 'APIs REST'],
    freeOnly: false
  },
  {
    id: 'cyber_ai',
    label: 'Ciberseguridad e IA responsable',
    requiredSkills: ['Redes', 'Seguridad', 'Ética IA', 'Gobernanza IA'],
    freeOnly: false
  },
  {
    id: 'zero',
    label: 'Empiezo desde cero (gratis)',
    requiredSkills: ['Fundamentos de programación', 'HTML/CSS', 'Competencias digitales', 'Empleabilidad'],
    freeOnly: true
  }
];

/** Equivalencias entre el stack del diagnóstico técnico y las skills del catálogo. */
const SKILL_ALIASES: Record<string, string> = {
  'Git/GitHub': 'Git',
  'Tailwind CSS': 'Tailwind'
};

export function normalizeSkill(skill: string): string {
  return SKILL_ALIASES[skill] ?? skill;
}
