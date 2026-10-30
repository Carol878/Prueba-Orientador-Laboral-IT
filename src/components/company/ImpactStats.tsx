/**
 * @file ImpactStats.tsx
 * @description Cifras agregadas de la cuenta de empresa. Sin datos personales.
 *
 * Cuatro cifras clave, el embudo de conversión (con el % entre etapas), el tiempo de respuesta frente
 * al compromiso y una tabla por vacante con mini barras. Gráficas con divs propios, sin librerías.
 *
 * El tiempo de respuesta se calcula desde que la persona muestra interés hasta la última respuesta
 * registrada de la empresa (abrir contacto o descartar), porque el contrato de candidaturas solo
 * guarda la fecha del último cambio.
 */

import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import type { Application, JobOffer } from '../../types';
import { isOfferActive } from '../../lib/offerMatch';
import { PageHeader } from '../common/AppShell';
import { daysBetween, isOverdue } from './companyUtils';
import FunnelBar from './FunnelBar';
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

const percent = (part: number, total: number): string =>
  total === 0 ? '—' : `${Math.round((part / total) * 100)} %`;

export default function ImpactStats({ offers, applicationsByOffer }: ImpactStatsProps) {
  const data = useMemo(() => {
    const offerById = new Map(offers.map(o => [o.id, o]));
    const all = offers.flatMap(o => applicationsByOffer[o.id] ?? []);
    const answered = all.filter(a => a.status === 'contact_open' || a.status === 'declined');
    const commitmentOf = (a: Application) => offerById.get(a.offerId)?.responseDays ?? 7;
    const avg = answered.length > 0
      ? answered.reduce((sum, a) => sum + daysBetween(a.createdAt, a.updatedAt), 0) / answered.length
      : null;
    // Compromiso medio de las respuestas medidas (cada vacante tiene el suyo).
    const commitment = answered.length > 0
      ? answered.reduce((sum, a) => sum + commitmentOf(a), 0) / answered.length
      : offers.length > 0 ? offers.reduce((sum, o) => sum + o.responseDays, 0) / offers.length : 7;
    const onTime = answered.filter(a => daysBetween(a.createdAt, a.updatedAt) <= commitmentOf(a)).length;
    const overdueNow = all.filter(a => {
      const offer = offerById.get(a.offerId);
      return offer ? isOverdue(a, offer) : false;
    }).length;
    return {
      totals: statsFor(all),
      openOffers: offers.filter(o => isOfferActive(o)).length,
      avgResponse: avg,
      commitment,
      answeredCount: answered.length,
      onTime,
      overdueNow,
      perOffer: offers.map(o => ({ offer: o, apps: applicationsByOffer[o.id] ?? [], stats: statsFor(applicationsByOffer[o.id] ?? []) }))
    };
  }, [offers, applicationsByOffer]);

  const { totals, openOffers, avgResponse, commitment, answeredCount, onTime, overdueNow, perOffer } = data;

  const tiles: { label: string; value: string; hint: string }[] = [
    { label: 'Vacantes abiertas', value: String(openOffers), hint: `de ${offers.length} publicadas` },
    { label: 'Personas interesadas', value: String(totals.interested), hint: totals.pending > 0 ? `${totals.pending} sin responder` : 'todas respondidas' },
    { label: 'Contrataciones', value: String(totals.hired), hint: `${percent(totals.hired, totals.interested)} de las interesadas` },
    {
      label: 'Tiempo medio de respuesta',
      value: avgResponse === null ? '—' : formatDays(avgResponse),
      hint: avgResponse === null ? 'aún sin respuestas' : `sobre ${answeredCount} ${answeredCount === 1 ? 'respuesta' : 'respuestas'}`
    }
  ];

  const funnel = [
    { label: 'Interesadas', value: totals.interested, fill: 'bg-stage-pending' },
    { label: 'Contacto abierto', value: totals.contacts, fill: 'bg-stage-contact' },
    { label: 'Entrevista', value: totals.interviews, fill: 'bg-stage-interview' },
    { label: 'Contratada', value: totals.hired, fill: 'bg-stage-hired' }
  ];
  const maxInterested = Math.max(1, ...perOffer.map(p => p.stats.interested));

  return (
    <div>
      <PageHeader
        eyebrow="Impacto"
        title="Lo que está pasando con tus vacantes"
        description="Cifras agregadas de tu cuenta, sin datos personales. Sirven para medir el impacto de la contratación de talento joven y de personas que cambian de sector."
      />

      {/* CIFRAS CLAVE (4 COMO MÁXIMO) */}
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(tile => (
          <div key={tile.label} className="card p-4 md:p-5 flex flex-col">
            <dt className="text-meta font-semibold text-fg-2 order-1">{tile.label}</dt>
            <dd className="nums font-bold text-title md:text-heading text-fg mt-2 order-2">{tile.value}</dd>
            <dd className="text-meta text-fg-3 mt-1 order-3">{tile.hint}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-3 mt-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* EMBUDO DE CONVERSIÓN */}
        <section className="card-technical p-5" aria-labelledby="impact-funnel-title">
          <h3 id="impact-funnel-title" className="font-display font-bold text-lead text-fg">Embudo de conversión</h3>
          <p className="text-meta text-fg-3 mt-0.5">Cada barra, en proporción a las personas interesadas. Entre etapas, el % que avanza.</p>

          {totals.interested === 0 ? (
            <p className="mt-4 text-body text-fg-2">Cuando alguien muestre interés en tus vacantes, verás aquí cómo avanza el proceso.</p>
          ) : (
            <ol className="mt-4">
              {funnel.map((stage, index) => {
                const prev = index > 0 ? funnel[index - 1].value : null;
                const width = (stage.value / totals.interested) * 100;
                return (
                  <li key={stage.label}>
                    {prev !== null && (
                      <p className="py-1 pl-[7.5rem] text-meta text-fg-3 sm:pl-[9.5rem]">
                        ↓ <span className="nums text-fg-2">{percent(stage.value, prev)}</span> avanza
                      </p>
                    )}
                    <div className="grid grid-cols-[7rem_minmax(0,1fr)_2.5rem] items-center gap-2 sm:grid-cols-[9rem_minmax(0,1fr)_3rem]">
                      <span className="text-body text-fg-2">{stage.label}</span>
                      <span className="h-5 rounded-sm bg-line/60" aria-hidden="true">
                        <span
                          className={`block h-full rounded-sm ${stage.fill}`}
                          style={{ width: `${Math.max(width, stage.value > 0 ? 2 : 0)}%` }}
                        />
                      </span>
                      <span className="nums text-right text-body font-semibold text-fg">{stage.value}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          {totals.interested > 0 && (
            <p className="mt-4 pt-3 border-t border-line text-meta text-fg-2">
              Descartadas: <span className="nums text-fg">{totals.declined}</span> · Sin responder: <span className="nums text-fg">{totals.pending}</span>
            </p>
          )}
        </section>

        {/* TIEMPO DE RESPUESTA FRENTE AL COMPROMISO */}
        <ResponseTime
          avg={avgResponse}
          commitment={commitment}
          answered={answeredCount}
          onTime={onTime}
          overdueNow={overdueNow}
        />
      </div>

      {/* POR VACANTE */}
      {perOffer.length > 0 && (
        <section className="card mt-3" aria-labelledby="impact-per-offer-title">
          <h3 id="impact-per-offer-title" className="px-5 pt-5 pb-3 font-display font-bold text-lead text-fg">Por vacante</h3>

          {/* Escritorio: tabla con mini barras. */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-body text-left">
              <caption className="sr-only">Candidaturas por vacante y etapa</caption>
              <thead className="border-y border-line-strong text-meta text-fg-2">
                <tr>
                  <th scope="col" className="px-5 py-2 font-semibold">Vacante</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Interesadas</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-right">Contacto</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-right">Entrevista</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-right">Contratadas</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-right">Descartadas</th>
                  <th scope="col" className="px-5 py-2 font-semibold w-[22%]">Reparto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {perOffer.map(({ offer, apps, stats }) => (
                  <tr key={offer.id}>
                    <th scope="row" className="px-5 py-3 font-medium text-fg min-w-[12rem]">{offer.title}</th>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2">
                        <span className="nums w-6 text-right">{stats.interested}</span>
                        <span className="h-1.5 w-20 rounded-sm bg-line" aria-hidden="true">
                          <span className="block h-full rounded-sm bg-fg-3" style={{ width: `${(stats.interested / maxInterested) * 100}%` }} />
                        </span>
                      </span>
                    </td>
                    <td className="nums px-3 py-3 text-right">{stats.contacts}</td>
                    <td className="nums px-3 py-3 text-right">{stats.interviews}</td>
                    <td className="nums px-3 py-3 text-right">{stats.hired}</td>
                    <td className="nums px-3 py-3 text-right">{stats.declined}</td>
                    <td className="px-5 py-3"><FunnelBar applications={apps} legend={false} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tablet y móvil: lista (sin scroll horizontal). */}
          <ul className="lg:hidden divide-y divide-line border-t border-line">
            {perOffer.map(({ offer, apps, stats }) => (
              <li key={offer.id} className="px-5 py-4">
                <p className="font-medium text-fg">{offer.title}</p>
                <p className="mt-0.5 mb-2 text-meta text-fg-2">
                  <span className="nums text-fg">{stats.interested}</span> interesadas · <span className="nums text-fg">{stats.hired}</span> contratadas
                </p>
                <FunnelBar applications={apps} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <PrivacyNote className="mt-6" />
    </div>
  );
}

interface ResponseTimeProps {
  avg: number | null;
  commitment: number;
  answered: number;
  onTime: number;
  overdueNow: number;
}

/** Barra del tiempo medio de respuesta con una marca en el compromiso (días). */
function ResponseTime({ avg, commitment, answered, onTime, overdueNow }: ResponseTimeProps) {
  const scale = Math.max(commitment, avg ?? 0) * 1.25 || 1;
  const late = avg !== null && avg > commitment;
  const markPos = (commitment / scale) * 100;
  // La etiqueta del compromiso se alinea para no salirse de la tarjeta.
  const markAlign = markPos > 60 ? '-translate-x-full' : markPos < 25 ? '' : '-translate-x-1/2';
  const commitmentLabel = `${commitment.toLocaleString('es-ES', { maximumFractionDigits: 1 })} ${commitment === 1 ? 'día' : 'días'}`;

  return (
    <section className="card p-5" aria-labelledby="impact-response-title">
      <h3 id="impact-response-title" className="font-display font-bold text-lead text-fg">Tiempo de respuesta</h3>
      <p className="text-meta text-fg-3 mt-0.5">Media frente al plazo que os comprometisteis a cumplir.</p>

      {avg === null ? (
        <p className="mt-4 text-body text-fg-2">Aún no has respondido a ninguna candidatura. Tu compromiso medio es de {commitmentLabel}.</p>
      ) : (
        <>
          <p className="mt-4 text-body text-fg-2">
            <span className={`nums text-title font-bold ${late ? 'text-danger' : 'text-fg'}`}>{formatDays(avg)}</span>
            <span className="ml-2">de media</span>
          </p>
          <div
            className="relative mt-3 h-3 rounded-sm bg-line"
            role="img"
            aria-label={`Tiempo medio de respuesta: ${formatDays(avg)}. Compromiso: ${commitmentLabel}.`}
          >
            <span
              className={`block h-full rounded-sm ${late ? 'bg-danger' : 'bg-ok'}`}
              style={{ width: `${Math.max((avg / scale) * 100, 1.5)}%` }}
            />
            {/* Marca del compromiso. */}
            <span className="absolute -top-1 -bottom-1 w-0.5 bg-fg" style={{ left: `${markPos}%` }} aria-hidden="true" />
          </div>
          <div className="relative mt-1 h-5 text-meta text-fg-2" aria-hidden="true">
            <span className={`absolute whitespace-nowrap ${markAlign}`} style={{ left: `${markPos}%` }}>
              Compromiso: <span className="nums">{commitmentLabel}</span>
            </span>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-meta text-fg-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-ok" aria-hidden="true" />
            <span><span className="nums text-fg">{onTime}</span> de <span className="nums text-fg">{answered}</span> respuestas dentro de plazo</span>
          </p>
        </>
      )}
      {overdueNow > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-meta font-semibold text-danger">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span><span className="nums">{overdueNow}</span> sin responder fuera de plazo ahora mismo</span>
        </p>
      )}
    </section>
  );
}
