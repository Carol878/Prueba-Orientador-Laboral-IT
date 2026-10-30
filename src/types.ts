/**
 * @file types.ts
 * @description Definición centralizada de interfaces y tipos para la aplicación.
 */

export type UserRole = 'young' | 'company';

export interface UserSession {
  email: string;
  role: UserRole;
  name: string;
}

export interface RoleDetail {
  name: string;
  mustHave: string[];
  niceToHave: string[];
  marketDemand: string;
  avgSalaryJunior: string;
  keyProject: string;
}

export interface InterviewQuestion {
  id: number;
  role: string;
  type: string;
  question: string;
  keyPoints: string[];
}

export interface InterviewFeedback {
  score: number;
  strengths: string;
  suggestions: string;
  checklist: string[];
}
// ============================================================================
// OFERTAS Y CANDIDATURAS
// ============================================================================

/** Conocimiento (se calcula con el diagnóstico) o condición (turnos, carné…: la confirma la persona). */
export type RequirementKind = 'knowledge' | 'condition';

export interface OfferRequirement {
  id: string;
  /** Texto visible ("Excel avanzado", "Disponibilidad de turnos de tarde"). */
  label: string;
  kind: RequirementKind;
  /** Imprescindible para el puesto. Los no imprescindibles son "deseables". */
  essential: boolean;
  /** La empresa se compromete a enseñarlo si falta. */
  trainable: boolean;
  /** Habilidades del catálogo de cursos que lo cubren (mismo vocabulario que `requirementSkills.ts`). */
  skills: string[];
}

export type WorkModality = 'Presencial' | 'Híbrido' | 'Remoto';
export type Workday = 'Completa' | 'Parcial' | 'Por turnos';
export type OfferStatus = 'open' | 'paused' | 'closed';

export interface JobOffer {
  id: string;
  /** Email de la cuenta de empresa que la publica. */
  companyEmail: string;
  companyName: string;
  title: string;
  /** Sector de la empresa (Tecnología, Logística, Comercio…). */
  sector: string;
  city: string;
  /** Zona y transporte público ("Polígono Los Ángeles · Cercanías C-4, 10 min a pie"). */
  commute: string;
  modality: WorkModality;
  workday: Workday;
  contract: string;
  /** Salario bruto anual en euros. Obligatorio: sin salario no se publica. */
  salaryMin: number;
  salaryMax: number;
  description: string;
  requirements: OfferRequirement[];
  /** Abierta a personas que empiezan o vienen de otro sector. */
  openToNewcomers: boolean;
  /** Fecha de cierre (AAAA-MM-DD). */
  closesAt: string;
  /** Días en los que la empresa se compromete a responder. */
  responseDays: number;
  status: OfferStatus;
  createdAt: string;
}

export interface WorkExperience {
  role: string;
  sector: string;
  years: number;
  /** Tareas transferibles ("gestión de un equipo de 5 personas, caja, inventario"). */
  tasks: string;
}

/** Perfil que ve la empresa. Nombre y email solo se muestran con el contacto abierto. */
export interface CandidateProfile {
  email: string;
  name: string;
  profileType: 'junior' | 'reskill' | null;
  targetRole: string;
  techStack: string[];
  /** Habilidades del catálogo que está aprendiendo ahora. */
  learningSkills: string[];
  englishLevel: string;
  experienceMonths: string;
  workExperience: WorkExperience[];
  portfolioUrl: string;
  mainProject: string;
  practicedInterview: boolean;
}

export type OfferDecision = 'interested' | 'skipped' | 'saved';

/** pending → contact_open → interview → hired, o declined en cualquier momento. */
export type ApplicationStatus = 'pending' | 'contact_open' | 'interview' | 'hired' | 'declined';

export interface Application {
  id: string;
  offerId: string;
  candidateEmail: string;
  /** Copia del perfil en el momento de mostrar interés. */
  candidate: CandidateProfile;
  status: ApplicationStatus;
  /** Motivo elegido por la empresa al descartar (de `DECLINE_REASONS`). */
  declineReason?: string;
  /** Email de contacto de la empresa (solo con el contacto abierto; lo envía la API). */
  companyContactEmail?: string;
  /** Pide que una orientadora de Fad acompañe el proceso. */
  wantsFadSupport: boolean;
  createdAt: string;
  updatedAt: string;
  /** Hay un cambio que la persona candidata aún no ha visto. */
  unseenByCandidate: boolean;
  /** Candidatura nueva que la empresa aún no ha visto. */
  unseenByCompany: boolean;
}
