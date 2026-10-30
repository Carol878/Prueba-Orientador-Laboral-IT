/**
 * @file ImpactStats.tsx
 * @description Cifras agregadas de la cuenta de empresa. Sin datos personales.
 *
 * El tiempo de respuesta se calcula desde que la persona muestra interés hasta la última respuesta
 * registrada de la empresa (abrir contacto o descartar), porque el contrato de candidaturas solo
 * guarda la fecha del último cambio.
 */

import { useMemo } from 'react';

import type { Application, JobOffer } from '../../types';
import { isOfferActive } from '../../lib/offerMatch';
import { PageHeader } from '../common/AppShell';
import { daysBetween } from './companyUtils';
import PrivacyNote from './PrivacyNote';

interface ImpactStatsProps {
  offers: JobOffer[];
  applicationsByOffer: Record<string, Application[]>;
}

interface OfferStats {
  interested: number;
  contacts: number;
  interviews: number;
  hired: number;
  declined: number;
  pending: number;
}

function statsFor(apps: Application[]): OfferStats {
  return {
    interested: apps.length,
    // Un contacto abierto sigue contando aunque luego pase a entrevista o contratación.
    contacts: apps.filter(a => a.status === 'contact_open' || a.status === 'interview' || a.status === 'hired').length,
    interviews: apps.filter(a => a.status === 'interview' || a.status === 'hired').length,
    hired: apps.filter(a => a.status === 'hired').length,
    declined: apps.filter(a => a.status === 'declined').length,
    pending: apps.filter(a => a.status === 'pending').length
  };
}

const formatDays = (days: number): string =>
  days < 1 ? 'menos de 1 día' : `${days.toLocaleString('es-ES', { maximumFractionDigits: 1 })} ${days < 1.05 ? 'día' : 'días'}`;

export default function ImpactStats({ offers, applicationsByOffer }: ImpactStatsProps) {
  const { totals, openOffers, avgResponse, answeredCount, perOffer } = useMemo(() => {
    const all = offers.flatMap(o => applicationsByOffer[o.id] ?? []);
    const answered = all.filter(a => a.status === 'contact_open' || a.status === 'declined');
    const avg = answered.length > 0
      ? answered.reduce((sum, a) => sum + daysBetween(a.createdAt, a.updatedAt), 0) / answered.length
      : null;
    return {
      totals: statsFor(all),
      openOffers: offers.filter(o => isOfferActive(o)).length,
      avgResponse: avg,
      answeredCount: answered.length,
      perOffer: offers.map(o => ({ offer: o, stats: statsFor(applicationsByOffer[o.id] ?? []) }))
    };
  }, [offers, applicationsByOffer]);

  const tiles: { label: string; value: string; hint?: string }[] = [
    { label: 'Vacantes abiertas', value: String(openOffers), hint: `de ${offers.length} publicadas` },
    { label: 'Personas interesadas', value: String(totals.interested), hint: totals.pending > 0 ? `${totals.pending} sin responder` : 'todas respondidas' },
    { label: 'Contactos abiertos', value: String(totals.contacts) },
    { label: 'Entrevistas', value: String(totals.interviews) },
    { label: 'Contrataciones', value: String(totals.hired) },
    {
      label: 'Tiempo medio de respuesta',
      value: avgResponse === null ? '—' : formatDays(avgResponse),
      hint: avgResponse === null ? 'aún sin respuestas' : `sobre ${answeredCount} ${answeredCount === 1 ? 'respuesta' : 'respuestas'}`
    }
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Impacto"
        title="Lo que está pasando con tus vacantes"
        description="Cifras agregadas de tu cuenta, sin datos personales. Sirven para medir el impacto de la contratación de talento joven y de personas que cambian de sector."
      />

      <dl className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map(tile => (
          <div key={tile.label} className="card-technical p-5">
            <dt className="text-xs font-semibold text-fg-2">{tile.label}</dt>
            <dd className="font-display font-bold text-3xl text-fg mt-2 tabular-nums">{tile.value}</dd>
            {tile.hint && <dd className="text-xs text-fg-3 mt-1">{tile.hint}</dd>}
          </div>
        ))}
      </dl>

      {perOffer.length > 0 && (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <caption className="text-left px-4 pt-4 pb-2 label-tech mb-0">Por vacante</caption>
            <thead className="border-b border-line-strong text-fg-2">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">Vacante</th>
                <th scope="col" className="px-4 py-2 font-semibold text-right">Interesadas</th>
                <th scope="col" className="px-4 py-2 font-semibold text-right">Contactos</th>
                <th scope="col" className="px-4 py-2 font-semibold text-right">Entrevistas</th>
                <th scope="col" className="px-4 py-2 font-semibold text-right">Contratadas</th>
                <th scope="col" className="px-4 py-2 font-semibold text-right">Descartadas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {perOffer.map(({ offer, stats }) => (
                <tr key={offer.id}>
                  <th scope="row" className="px-4 py-2 font-medium text-fg min-w-[12rem]">{offer.title}</th>
                  <td className="px-4 py-2 text-right">{stats.interested}</td>
                  <td className="px-4 py-2 text-right">{stats.contacts}</td>
                  <td className="px-4 py-2 text-right">{stats.interviews}</td>
                  <td className="px-4 py-2 text-right">{stats.hired}</td>
                  <td className="px-4 py-2 text-right">{stats.declined}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PrivacyNote className="mt-6" />
    </div>
  );
}
