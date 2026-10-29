/**
 * @file courseRecommendations.ts
 * @description Recomienda cursos a partir de lo que le falta al joven según su plan de acción.
 *
 * 1. `planGaps`: toma los requisitos imprescindibles que NO cubre y los traduce a habilidades de catálogo.
 * 2. `recommendCourses`: ordena los cursos por cuántos de esos huecos cubren. A igualdad, gana el
 *    que es gratis o subvencionado, en español y con certificado reconocido.
 */

import { normalizeSkill } from '../data/trainingCatalog';
import type { TrainingCourse } from '../data/trainingCatalog';
import { skillsForRequirement } from '../data/requirementSkills';

export interface RequirementGap {
  /** Texto del requisito tal como aparece en el plan ("HTML5 & CSS3"). */
  requirement: string;
  /** Habilidades de catálogo pendientes para ese requisito. */
  skills: string[];
}

export interface CourseRecommendation {
  course: TrainingCourse;
  /** Habilidades pendientes que cubre el curso. */
  coveredSkills: string[];
  /** Requisitos del plan a los que ayuda el curso. */
  coveredRequirements: string[];
}

/** Requisitos pendientes del plan con las habilidades de catálogo que les corresponden. */
export function planGaps(missingRequirements: string[], knownSkills: string[]): RequirementGap[] {
  const known = new Set(knownSkills.map(normalizeSkill));
  return missingRequirements
    .map(requirement => ({
      requirement,
      skills: skillsForRequirement(requirement).filter(skill => !known.has(skill))
    }))
    .filter(gap => gap.skills.length > 0);
}

/** Todas las habilidades pendientes, sin repetir. */
export const gapSkillList = (gaps: RequirementGap[]): string[] => [...new Set(gaps.flatMap(gap => gap.skills))];

const tieBreak = (course: TrainingCourse): number =>
  (course.priceType !== 'mixto' ? 4 : 0) +
  (course.language === 'Español' ? 2 : course.language === 'Multilingüe' ? 1 : 0) +
  (course.officialCertification ? 1 : 0);

/** Cursos que cubren al menos un hueco, de más a menos útiles. */
export function recommendCourses(
  courses: TrainingCourse[],
  gaps: RequirementGap[],
  limit = Infinity
): CourseRecommendation[] {
  return courses
    .map(course => {
      const offered = new Set(course.skillsCovered);
      const coveredRequirements = gaps.filter(gap => gap.skills.some(skill => offered.has(skill))).map(gap => gap.requirement);
      const coveredSkills = gapSkillList(gaps).filter(skill => offered.has(skill));
      return { course, coveredSkills, coveredRequirements };
    })
    .filter(rec => rec.coveredRequirements.length > 0)
    .sort(
      (a, b) =>
        b.coveredRequirements.length - a.coveredRequirements.length ||
        tieBreak(b.course) - tieBreak(a.course) ||
        b.coveredSkills.length - a.coveredSkills.length
    )
    .slice(0, limit);
}
