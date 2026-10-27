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

export interface CompanyData {
  id: string;
  companyName: string;
  contactEmail: string;
  neededRoles: string[];
  techSkills: string[];
  softSkills: string[];
  createdAt: string;
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