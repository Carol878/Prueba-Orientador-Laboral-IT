/**
 * @file csv.ts
 * @description Exportación de candidaturas a CSV pensada para abrirse en Excel en español:
 * separador `;` y BOM UTF-8 para que los acentos se vean bien.
 *
 * Solo se exporta lo que la empresa puede ver en pantalla: sin contacto abierto, la fila es anónima.
 */

import type { Application, JobOffer } from '../../types';
import {
  APPLICATION_STATUS_LABELS,
  EXPERIENCE_MONTHS_LABELS,
  anonymousRef,
  companyFitLabel,
  experienceLine,
  formatDate,
  isContactOpen,
  summarizeFit
} from './companyUtils';

const SEPARATOR = ';';
const BOM = '﻿';

/** Escapa un valor: comillas dobles si contiene separador, comillas o saltos de línea. */
function cell(value: string | number | boolean): string {
  const text = typeof value === 'boolean' ? (value ? 'Sí' : 'No') : String(value);
  // Evita que Excel interprete el texto como fórmula (inyección CSV).
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const HEADERS = [
  'Referencia', 'Fecha de interés', 'Estado', 'Nombre', 'Email', 'Experiencia laboral', 'Tiempo en el sector',
  'Encaje orientativo', 'Lo tiene', 'Lo está aprendiendo', 'Por aprender (lo enseñáis)', 'Por aprender',
  'Condiciones a confirmar', 'Inglés', 'Portfolio', 'Proyecto principal', 'Ha practicado la entrevista',
  'Pide acompañamiento de Fad', 'Motivo de descarte'
];

export function applicationsToCsv(offer: JobOffer, applications: Application[]): string {
  const rows = applications.map(app => {
    const c = app.candidate;
    const open = isContactOpen(app);
    const summary = summarizeFit(offer, c);
    return [
      `Candidatura ${anonymousRef(app)}`,
      formatDate(app.createdAt),
      APPLICATION_STATUS_LABELS[app.status],
      open ? c.name : '',
      open ? c.email : '',
      experienceLine(c).join(' | '),
      EXPERIENCE_MONTHS_LABELS[c.experienceMonths] ?? c.experienceMonths,
      companyFitLabel(summary.fit),
      summary.have.join(', '),
      summary.learning.join(', '),
      summary.missingTrainable.join(', '),
      summary.missing.join(', '),
      summary.conditions.join(', '),
      c.englishLevel,
      c.portfolioUrl,
      c.mainProject,
      c.practicedInterview,
      app.wantsFadSupport,
      app.declineReason ?? ''
    ].map(cell).join(SEPARATOR);
  });
  return BOM + [HEADERS.map(cell).join(SEPARATOR), ...rows].join('\r\n');
}

/** Descarga el CSV en el navegador. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Nombre de archivo legible: "candidaturas-desarrollador-web-2026-10-30.csv". */
export function csvFilename(offer: JobOffer): string {
  const slug = offer.title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `candidaturas-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
}
