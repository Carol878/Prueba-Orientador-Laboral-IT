/**
 * @file MyApplications.tsx
 * @description "Mis candidaturas": Esperando respuesta · Contacto abierto · Guardadas · Cerradas.
 *
 * Al entrar, las candidaturas con novedades se marcan como vistas (`markSeen`) pero se siguen
 * señalando como "Novedad" mientras la persona esté en esta vista.
 */

import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Bell, Check, Copy, Mail, MessageSquare, Terminal, Undo2 } from 'lucide-react';

import type { Application, CandidateProfile, JobOffer, OfferDecision } from '../../types';
import { offersService } from '../../services/offersService';
import { evaluateOffer, isOfferActive, similarOffers } from '../../lib/offerMatch';
import type { FitProfile } from '../../lib/offerMatch';
import { formatDay, formatSalary, introMessage } from './offerText';

interface MyApplicationsProps {
  applications: Application[];
  decisions: Record<string, OfferDecision>;
  openOffers: JobOffer[];
  /** Ofertas de candidaturas y guardadas que ya no están abiertas. */
  pastOffers: Record<string, JobOffer>;
  candidate: CandidateProfile;
  fitProfile: FitProfile;
  busy: boolean;
  /** Lleva a la pestaña "Ofertas" con esa oferta la primera. */
  onShowOffer: (offerId: string) => void;
  onInterested: (offer: JobOffer) => void;
  /** Quita una oferta guardada o retira una candidatura que aún no tiene respuesta. */
  onUndo: (offerId: string) => void;
  onPracticeInterview: (offer: JobOffer) => void;
}

const CONTACT_STATUSES = new Set(['contact_open', 'interview', 'hired']);

/** Situación de la oferta para el joven. `missing`: la empresa la ha borrado. */
type OfferState = 'active' | 'paused' | 'expired' | 'closed' | 'missing';

function offerState(offer: JobOffer | undefined): OfferState {
  if (!offer) return 'missing';
  if (offer.status === 'closed') return 'closed';
  if (offer.status === 'paused') return 'paused';
  return isOfferActive(offer) ? 'active' : 'expired';
}

const STATE_BADGE: Partial<Record<OfferState, string>> = {
  paused: 'En pausa',
  expired: 'Plazo terminado',
  closed: 'Oferta cerrada'
};

const CONTACT_LABEL: Record<string, string> = {
  contact_open: 'Contacto abierto',
  interview: 'En proceso de entrevista',
  hired: '¡Te han contratado!'
};

function Section({ title, count, empty, children }: { title: string; count: number; empty: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="mb-8">
      <h3 id={id} className="label-tech flex items-center gap-2 mb-3">
        {title}
        <span className="badge-technical">{count}</span>
      </h3>
      {count === 0 ? <p className="text-sm text-fg-2 card p-4">{empty}</p> : <ul className="space-y-3">{children}</ul>}
    </section>
  );
}

function OfferSummary({ offer, fresh }: { offer: JobOffer | undefined; fresh?: boolean }) {
  const badge = STATE_BADGE[offerState(offer)];
  return (
    <div>
      {(fresh || badge) && (
        <div className="flex flex-wrap gap-2 mb-2">
          {fresh && (
            <p className="badge-technical text-gap border-gap/60">
              <Bell className="w-3.5 h-3.5" aria-hidden="true" />
              Novedad
            </p>
          )}
          {badge && <p className="badge-technical text-fg-2">{badge}</p>}
        </div>
      )}
      {offer ? (
        <>
          <p className="text-sm text-fg-2">{offer.companyName}</p>
          <p className="font-display font-semibold text-lg leading-snug text-fg">{offer.title}</p>
          <p className="text-sm text-fg-2 mt-0.5">
            {formatSalary(offer)} · {offer.city} · {offer.modality}
          </p>
        </>
      ) : (
        <p className="font-semibold text-fg">Oferta que ya no está publicada</p>
      )}
    </div>
  );
}

/** Mensaje de presentación con botón de copiar y enlace para abrirlo en el correo. */
function IntroMessage({ offer, candidate, contactEmail }: { offer: JobOffer; candidate: CandidateProfile; contactEmail?: string }) {
  // La API envía el email de contacto de la empresa al abrir el contacto; en local se usa el de la oferta.
  const companyEmail = contactEmail || offer.companyEmail;
  const draft = introMessage(offer, candidate);
  const subject = draft.subject;
  const [body, setBody] = useState(draft.body);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
    } catch {
      // Sin permiso para el portapapeles: se selecciona el texto para copiarlo a mano.
      textareaRef.current?.select();
      document.execCommand?.('copy');
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  const mailto = `mailto:${companyEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="mt-4">
      <p className="text-sm text-fg">
        Email de la empresa:{' '}
        <a href={`mailto:${companyEmail}`} className="font-semibold text-accent-strong underline underline-offset-2 break-all">
          {companyEmail}
        </a>
      </p>
      <label htmlFor={fieldId} className="label-tech mt-3">
        Tu mensaje de presentación (ya redactado; cámbialo si quieres)
      </label>
      <textarea
        id={fieldId}
        ref={textareaRef}
        rows={8}
        value={body}
        onChange={event => setBody(event.target.value)}
        className="input-technical resize-y leading-relaxed text-sm"
        data-lenis-prevent
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="btn btn-secondary">
          {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
          <span aria-live="polite">{copied ? 'Copiado' : 'Copiar mensaje'}</span>
        </button>
        <a href={mailto} className="btn btn-primary">
          <Mail className="w-4 h-4" aria-hidden="true" />
          Abrirlo en mi correo
        </a>
      </div>
    </div>
  );
}

export default function MyApplications({
  applications,
  decisions,
  openOffers,
  pastOffers,
  candidate,
  fitProfile,
  busy,
  onShowOffer,
  onInterested,
  onUndo,
  onPracticeInterview
}: MyApplicationsProps) {
  // Candidaturas que tenían novedades al verlas aquí (se marcan como vistas, pero se siguen señalando).
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const unseen = applications.filter(a => a.unseenByCandidate);
    if (unseen.length === 0) return;
    setFresh(prev => new Set([...prev, ...unseen.map(a => a.id)]));
    unseen.forEach(a =>
      offersService.markSeen(a.id, 'candidate').catch(error => console.error('[ofertas] No se ha podido marcar como vista:', error))
    );
  }, [applications]);

  const openById = new Map(openOffers.map(o => [o.id, o]));
  const findOffer = (id: string): JobOffer | undefined => openById.get(id) ?? pastOffers[id];
  const undecidedPool = openOffers.filter(o => !decisions[o.id]);
  // Una candidatura sin respuesta sigue viva mientras la oferta exista y no esté cerrada:
  // en pausa o con el plazo terminado la empresa todavía puede contestar.
  const isDeadOffer = (id: string): boolean => ['closed', 'missing'].includes(offerState(findOffer(id)));

  const contact = applications.filter(a => CONTACT_STATUSES.has(a.status));
  const waiting = applications.filter(a => a.status === 'pending' && !isDeadOffer(a.offerId));
  const closed = applications.filter(a => a.status === 'declined' || (a.status === 'pending' && isDeadOffer(a.offerId)));
  const saved = Object.entries(decisions)
    .filter(([id, decision]) => decision === 'saved' && findOffer(id))
    .map(([id]) => findOffer(id) as JobOffer);

  return (
    <div>
      <Section title="Esperando respuesta" count={waiting.length} empty="Cuando digas «Me interesa» a una oferta, la verás aquí.">
        {waiting.map(app => {
          const offer = findOffer(app.offerId);
          return (
            <li key={app.id} className="card p-4">
              <OfferSummary offer={offer} fresh={fresh.has(app.id)} />
              <p className="text-sm text-fg-2 mt-2">
                Enviada el {formatDay(app.createdAt)}.
                {offer && ` Suele responder en ${offer.responseDays} ${offer.responseDays === 1 ? 'día' : 'días'}.`}
                {app.wantsFadSupport && ' Una orientadora de Fad te acompañará.'}
              </p>
              {offerState(offer) === 'paused' && (
                <p className="text-sm text-fg mt-2">La empresa ha pausado la oferta. Tu candidatura sigue en pie y todavía pueden responderte.</p>
              )}
              {offer && offerState(offer) === 'expired' && (
                <p className="text-sm text-fg mt-2">
                  El plazo terminó el {formatDay(offer.closesAt)}: ya no entran candidaturas nuevas, pero la empresa todavía puede responderte.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {offer && (
                  <button type="button" onClick={() => onPracticeInterview(offer)} className="btn btn-secondary">
                    <Terminal className="w-4 h-4" aria-hidden="true" />
                    Prepararme la entrevista
                  </button>
                )}
                <button type="button" onClick={() => onUndo(app.offerId)} disabled={busy} className="btn btn-secondary text-fg-2">
                  <Undo2 className="w-4 h-4" aria-hidden="true" />
                  Retirar candidatura
                </button>
              </div>
            </li>
          );
        })}
      </Section>

      <Section title="Contacto abierto" count={contact.length} empty="Cuando una empresa quiera hablar contigo, aparecerá aquí con su email.">
        {contact.map(app => {
          const offer = findOffer(app.offerId);
          return (
            <li key={app.id} className="card-technical p-4 md:p-5">
              <OfferSummary offer={offer} fresh={fresh.has(app.id)} />
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-ok">
                <Check className="w-4 h-4" aria-hidden="true" />
                {CONTACT_LABEL[app.status]}
              </p>
              <p className="text-sm text-fg-2 mt-1">
                La empresa ya puede ver tu nombre y tu email. Escríbeles tú también: así demuestras interés.
                {app.wantsFadSupport && ' Tu orientadora de Fad se pondrá en contacto contigo.'}
              </p>
              {offer && <IntroMessage offer={offer} candidate={candidate} contactEmail={app.companyContactEmail} />}
              {offer && (
                <button type="button" onClick={() => onPracticeInterview(offer)} className="btn btn-secondary mt-3">
                  <MessageSquare className="w-4 h-4" aria-hidden="true" />
                  Practicar la entrevista de este puesto
                </button>
              )}
            </li>
          );
        })}
      </Section>

      <Section title="Guardadas" count={saved.length} empty="Las ofertas que guardes para pensarlas con calma aparecerán aquí.">
        {saved.map(offer =>
          isOfferActive(offer) ? (
            <li key={offer.id} className="card p-4">
              <OfferSummary offer={offer} />
              <p className="text-sm text-fg-2 mt-2">Cierra el {formatDay(offer.closesAt)}.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => onInterested(offer)} disabled={busy} className="btn btn-primary">
                  Me interesa
                </button>
                <button type="button" onClick={() => onUndo(offer.id)} disabled={busy} className="btn btn-secondary">
                  Volver a verla entre las ofertas
                </button>
              </div>
            </li>
          ) : (
            <li key={offer.id} className="card p-4">
              <OfferSummary offer={offer} />
              <p className="text-sm text-fg-2 mt-2">Esta oferta ya no admite candidaturas.</p>
              <button type="button" onClick={() => onUndo(offer.id)} disabled={busy} className="btn btn-secondary mt-3">
                Quitar de guardadas
              </button>
            </li>
          )
        )}
      </Section>

      <Section title="Cerradas" count={closed.length} empty="Aquí verás las candidaturas que se cierren, con el motivo y otras ofertas parecidas.">
        {closed.map(app => {
          const offer = findOffer(app.offerId);
          const missing = offer
            ? evaluateOffer(offer, fitProfile).checks.filter(c => c.state === 'missing' && c.requirement.essential).map(c => c.requirement.label)
            : [];
          const similar = offer ? similarOffers(offer, undecidedPool) : [];
          return (
            <li key={app.id} className="card p-4 md:p-5">
              <OfferSummary offer={offer} fresh={fresh.has(app.id)} />
              <div className="mt-3 p-3 bg-raised border-l-2 border-line-strong text-sm text-fg leading-relaxed">
                {app.status === 'declined' ? (
                  <>
                    <p>Esta vez la empresa ha seguido con otra persona. Gracias por presentarte: cada candidatura te acerca.</p>
                    {app.declineReason && <p className="mt-1 text-fg-2">Lo que nos cuentan: «{app.declineReason}».</p>}
                  </>
                ) : (
                  <p>
                    {offer
                      ? 'La empresa ha cerrado la oferta sin llegar a responder a tu candidatura. No es una valoración de tu perfil: suele pasar cuando el puesto se cubre o se cancela.'
                      : 'La empresa ha retirado esta oferta antes de responder. No es una valoración de tu perfil.'}
                  </p>
                )}
              </div>

              {missing.length > 0 && (
                <p className="mt-3 text-sm text-fg-2">
                  <span className="font-semibold text-fg">Te faltaba: </span>
                  {missing.join(', ')}. Puedes empezar por ahí en «Formación recomendada».
                </p>
              )}

              {similar.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-fg mb-2">Ofertas parecidas que aún no has visto</p>
                  <ul className="space-y-1.5">
                    {similar.map(other => (
                      <li key={other.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border border-line rounded">
                        <span className="text-sm text-fg">
                          {other.title} <span className="text-fg-2">· {other.companyName}</span>
                        </span>
                        <button type="button" onClick={() => onShowOffer(other.id)} className="btn btn-secondary min-h-9 px-3">
                          Ver oferta
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </Section>
    </div>
  );
}
