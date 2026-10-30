/**
 * @file jobOffers.ts
 * @description Ofertas de ejemplo para que la sección de ofertas funcione sin que ninguna empresa haya publicado nada.
 *
 * Las dos primeras empresas son las cuentas demo (Tech Solutions e InnovaData): al entrar con ellas
 * se ven las candidaturas a sus ofertas. Además de puestos tecnológicos hay puestos "puente"
 * (atención al cliente, administración, almacén…) porque la plataforma no es solo para tecnología.
 *
 * Las habilidades de cada requisito (`skills`) usan el vocabulario del catálogo de cursos.
 */

import type { JobOffer, OfferRequirement } from '../types';

/** Fecha AAAA-MM-DD a `days` días de hoy (las ofertas de ejemplo no caducan nunca en la demo). */
function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

type RequirementOptions = Partial<Pick<OfferRequirement, 'essential' | 'trainable'>>;

/** Requisito de conocimiento: se compara con el diagnóstico y enlaza a cursos. */
function knowledge(label: string, skills: string[], options: RequirementOptions = {}): Omit<OfferRequirement, 'id'> {
  return { label, kind: 'knowledge', skills, essential: options.essential ?? true, trainable: options.trainable ?? false };
}

/** Condición del puesto (turnos, carné, desplazamiento): la confirma la persona, no penaliza. */
function condition(label: string, options: RequirementOptions = {}): Omit<OfferRequirement, 'id'> {
  return { label, kind: 'condition', skills: [], essential: options.essential ?? true, trainable: options.trainable ?? false };
}

type OfferSeed = Omit<JobOffer, 'requirements' | 'status' | 'createdAt' | 'closesAt'> & {
  requirements: Omit<OfferRequirement, 'id'>[];
  closesInDays: number;
};

const SEEDS: OfferSeed[] = [
  {
    id: 'demo-techsolutions-frontend',
    companyEmail: 'rrhh@techsolutions.demo',
    companyName: 'Tech Solutions S.L.',
    title: 'Desarrollador/a web frontend junior',
    sector: 'Tecnología',
    city: 'Sevilla',
    commute: 'Parque Científico Cartuja · Bus C2, parada a 3 min',
    modality: 'Híbrido',
    workday: 'Completa',
    contract: 'Indefinido con 6 meses de prueba',
    salaryMin: 21000,
    salaryMax: 24000,
    description: 'Maquetarás y mantendrás las webs de nuestros clientes junto a una persona sénior que te acompañará los primeros meses.',
    requirements: [
      knowledge('JavaScript (ES6+)', ['JavaScript']),
      knowledge('HTML5 & CSS3', ['HTML/CSS']),
      knowledge('React', ['React'], { trainable: true }),
      knowledge('Git', ['Git']),
      knowledge('TypeScript', ['TypeScript'], { essential: false }),
      condition('Dos días a la semana en la oficina')
    ],
    openToNewcomers: true,
    closesInDays: 25,
    responseDays: 5
  },
  {
    id: 'demo-techsolutions-qa',
    companyEmail: 'rrhh@techsolutions.demo',
    companyName: 'Tech Solutions S.L.',
    title: 'Técnico/a de pruebas de software (QA) junior',
    sector: 'Tecnología',
    city: 'Sevilla',
    commute: 'Parque Científico Cartuja · Bus C2, parada a 3 min',
    modality: 'Presencial',
    workday: 'Completa',
    contract: 'Temporal 12 meses con opción a indefinido',
    salaryMin: 19500,
    salaryMax: 22000,
    description: 'Probarás nuestras aplicaciones antes de cada entrega y escribirás pruebas automáticas sencillas.',
    requirements: [
      knowledge('Metodología de pruebas', ['Testing'], { trainable: true }),
      knowledge('JavaScript o Python', ['JavaScript', 'Python']),
      knowledge('Pruebas de APIs con Postman', ['Testing', 'APIs REST'], { trainable: true }),
      knowledge('Git', ['Git'], { essential: false }),
      condition('Atención al detalle y paciencia para repetir pruebas')
    ],
    openToNewcomers: true,
    closesInDays: 18,
    responseDays: 7
  },
  {
    id: 'demo-innovadata-reporting',
    companyEmail: 'talento@innovadata.demo',
    companyName: 'InnovaData',
    title: 'Analista de datos junior (informes y cuadros de mando)',
    sector: 'Tecnología',
    city: 'Zaragoza',
    commute: 'Centro · Tranvía L1, parada Plaza España',
    modality: 'Híbrido',
    workday: 'Completa',
    contract: 'Indefinido',
    salaryMin: 22000,
    salaryMax: 26000,
    description: 'Prepararás informes semanales para clientes de comercio y logística. Valoramos que conozcas cómo funciona una tienda o un almacén por dentro.',
    requirements: [
      knowledge('SQL', ['SQL']),
      knowledge('Excel avanzado', ['Excel']),
      knowledge('Power BI', ['Visualización de datos'], { trainable: true }),
      knowledge('Python para datos', ['Python', 'Ciencia de datos'], { essential: false }),
      knowledge('Estadística básica', ['Estadística'], { essential: false })
    ],
    openToNewcomers: true,
    closesInDays: 30,
    responseDays: 5
  },
  {
    id: 'demo-innovadata-soporte',
    companyEmail: 'talento@innovadata.demo',
    companyName: 'InnovaData',
    title: 'Soporte técnico a clientes',
    sector: 'Tecnología',
    city: 'Zaragoza',
    commute: 'Centro · Tranvía L1, parada Plaza España',
    modality: 'Presencial',
    workday: 'Por turnos',
    contract: 'Temporal 6 meses con opción a indefinido',
    salaryMin: 18500,
    salaryMax: 20500,
    description: 'Atenderás por teléfono y correo a clientes que usan nuestras herramientas y resolverás incidencias sencillas.',
    requirements: [
      knowledge('Competencias digitales', ['Competencias digitales']),
      knowledge('Atención al cliente', ['Comunicación']),
      knowledge('Nociones de redes', ['Redes'], { trainable: true }),
      condition('Turnos de mañana o tarde (rotativos)')
    ],
    openToNewcomers: true,
    closesInDays: 15,
    responseDays: 4
  },
  {
    id: 'demo-logisur-almacen',
    companyEmail: 'empleo@logisur.demo',
    companyName: 'LogiSur Distribución',
    title: 'Auxiliar de almacén con gestión de inventario',
    sector: 'Logística',
    city: 'Getafe (Madrid)',
    commute: 'Polígono Los Ángeles · Cercanías C-4, 10 min a pie',
    modality: 'Presencial',
    workday: 'Por turnos',
    contract: 'Indefinido',
    salaryMin: 19000,
    salaryMax: 21000,
    description: 'Recepción y preparación de pedidos y control de inventario con lector y hoja de cálculo.',
    requirements: [
      knowledge('Hoja de cálculo (Excel) a nivel usuario', ['Excel']),
      condition('Turnos rotativos de mañana y tarde'),
      condition('Carné de carretillero', { trainable: true }),
      condition('Formación en prevención de riesgos laborales (PRL)', { trainable: true })
    ],
    openToNewcomers: true,
    closesInDays: 12,
    responseDays: 3
  },
  {
    id: 'demo-logisur-administrativo',
    companyEmail: 'empleo@logisur.demo',
    companyName: 'LogiSur Distribución',
    title: 'Administrativo/a de tráfico y pedidos',
    sector: 'Logística',
    city: 'Getafe (Madrid)',
    commute: 'Polígono Los Ángeles · Cercanías C-4, 10 min a pie',
    modality: 'Presencial',
    workday: 'Completa',
    contract: 'Indefinido',
    salaryMin: 20000,
    salaryMax: 22500,
    description: 'Gestionarás pedidos y rutas de reparto, y llevarás el seguimiento con transportistas y clientes.',
    requirements: [
      knowledge('Excel avanzado', ['Excel']),
      knowledge('Trato con clientes y proveedores', ['Comunicación']),
      knowledge('Competencias digitales', ['Competencias digitales']),
      knowledge('Inglés básico', ['Inglés'], { essential: false })
    ],
    openToNewcomers: true,
    closesInDays: 20,
    responseDays: 5
  },
  {
    id: 'demo-nexo-atencion',
    companyEmail: 'personas@nexoretail.demo',
    companyName: 'Nexo Retail',
    title: 'Atención al cliente en tienda online',
    sector: 'Comercio',
    city: 'Remoto (España)',
    commute: 'Trabajo desde casa · se entrega portátil',
    modality: 'Remoto',
    workday: 'Parcial',
    contract: 'Indefinido a media jornada (25 h/semana)',
    salaryMin: 12500,
    salaryMax: 13500,
    description: 'Responderás a clientes por chat y correo: pedidos, devoluciones e incidencias.',
    requirements: [
      knowledge('Atención al cliente', ['Comunicación']),
      knowledge('Competencias digitales', ['Competencias digitales']),
      condition('Conexión a internet estable en casa')
    ],
    openToNewcomers: true,
    closesInDays: 10,
    responseDays: 3
  },
  {
    id: 'demo-nexo-backend',
    companyEmail: 'personas@nexoretail.demo',
    companyName: 'Nexo Retail',
    title: 'Programador/a backend junior (Python)',
    sector: 'Comercio',
    city: 'Madrid',
    commute: 'Méndez Álvaro · Metro L6 y Cercanías',
    modality: 'Híbrido',
    workday: 'Completa',
    contract: 'Indefinido',
    salaryMin: 23000,
    salaryMax: 27000,
    description: 'Mantendrás la API de la tienda online: catálogo, pedidos y pagos.',
    requirements: [
      knowledge('Python', ['Python']),
      knowledge('SQL / bases de datos relacionales', ['SQL', 'PostgreSQL']),
      knowledge('APIs REST', ['APIs REST']),
      knowledge('Git', ['Git']),
      knowledge('Docker', ['Cloud'], { essential: false, trainable: true })
    ],
    openToNewcomers: false,
    closesInDays: 22,
    responseDays: 7
  },
  {
    id: 'demo-ciberes-fullstack',
    companyEmail: 'talento@ciberes.demo',
    companyName: 'Cíber ES Cooperativa',
    title: 'Desarrollador/a fullstack junior',
    sector: 'Economía social',
    city: 'Valencia',
    commute: 'Ruzafa · Metro L3 y L5, estación Xàtiva',
    modality: 'Remoto',
    workday: 'Completa',
    contract: 'Indefinido',
    salaryMin: 22000,
    salaryMax: 25000,
    description: 'Desarrollarás herramientas web para entidades sociales en un equipo pequeño y horizontal.',
    requirements: [
      knowledge('JavaScript / TypeScript', ['JavaScript', 'TypeScript']),
      knowledge('React u otro framework de frontend', ['React', 'Vue']),
      knowledge('Node.js u otro lenguaje de servidor', ['Node.js', 'Python', 'Java']),
      knowledge('SQL / NoSQL', ['SQL', 'NoSQL']),
      knowledge('Git', ['Git'])
    ],
    openToNewcomers: true,
    closesInDays: 28,
    responseDays: 6
  },
  {
    id: 'demo-ciberes-ciber',
    companyEmail: 'talento@ciberes.demo',
    companyName: 'Cíber ES Cooperativa',
    title: 'Técnico/a de sistemas y ciberseguridad en prácticas remuneradas',
    sector: 'Economía social',
    city: 'Valencia',
    commute: 'Ruzafa · Metro L3 y L5, estación Xàtiva',
    modality: 'Presencial',
    workday: 'Completa',
    contract: 'Contrato formativo 12 meses',
    salaryMin: 16500,
    salaryMax: 18000,
    description: 'Mantendrás equipos y redes de entidades sociales y aprenderás buenas prácticas de seguridad.',
    requirements: [
      knowledge('Nociones de redes', ['Redes']),
      knowledge('Fundamentos de seguridad', ['Seguridad'], { trainable: true }),
      knowledge('Competencias digitales', ['Competencias digitales']),
      condition('Desplazamientos ocasionales por la ciudad')
    ],
    openToNewcomers: true,
    closesInDays: 16,
    responseDays: 5
  }
];

/** Ofertas de ejemplo con identificadores de requisito y fechas calculadas. */
export const DEMO_JOB_OFFERS: JobOffer[] = SEEDS.map(({ requirements, closesInDays, ...offer }) => ({
  ...offer,
  requirements: requirements.map((req, index) => ({ ...req, id: `${offer.id}-r${index + 1}` })),
  closesAt: daysFromNow(closesInDays),
  status: 'open',
  createdAt: daysFromNow(-3)
}));

/** Motivos de descarte que puede elegir la empresa. Siempre en tono amable y con algo que hacer. */
export const DECLINE_REASONS = [
  'Hemos elegido un perfil con más experiencia en uno de los requisitos',
  'La vacante ya está cubierta',
  'Necesitamos a alguien con disponibilidad distinta (horario, turnos o incorporación)',
  'Buscamos un nivel más alto en alguno de los conocimientos imprescindibles',
  'Otro motivo (te lo explicaremos si nos escribes)'
] as const;
