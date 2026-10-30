/**
 * @file VacancyPreview.tsx
 * @description Vista previa (en `<dialog>`) de cómo verá la vacante la persona joven, con el borrador
 * tal y como está, aunque aún falten campos. Imita la estructura de `offers/OfferCard.tsx` sin importarla:
 * aquella necesita el encaje de un perfil concreto, y la empresa no tiene uno.
 */

import { useEffect, useRef } from 'react';
import { CalendarClock, Clock, MapPin, Sprout, X } from 'lucide-react';

import type { OfferRequirement, WorkModality, Workday } from '../../types';
import { formatDate, formatSalary } from './companyUtils';

/** Lo que hace falta para pintar la oferta (los campos del borrador ya interpretados). */
export interface PreviewOffer {
  companyName: string;
  title: string;
  sector: string;
  city: string;
  commute: string;
  modality: WorkModality;
  workday: Workday;
  contract: string;
  /** NaN si aún no se ha escrito. */
  salaryMin: number;
  salaryMax: number;
  description: string;
  requirements: Pick<OfferRequirement, 'label' | 'kind' | 'essential' | 'trainable'>[];
  openToNewcomers: boolean;
  closesAt: string;
  responseDays: number;
}

interface VacancyPreviewProps {
  offer: PreviewOffer;
  onClose: () => void;
}

/** Texto en gris para lo que falta por rellenar. */
const Missing = ({ children }: { children: string }) => <span className="italic text-fg-3">{children}</span>;

export default function VacancyPreview({ offer, onClose }: VacancyPreviewProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      opener?.focus();
    };
  }, []);

  const requirements = offer.requirements.filter(r => r.label.trim());
  const essentials = requirements.filter(r => r.kind === 'knowledge' && r.essential);
  const desirables = requirements.filter(r => r.kind === 'knowledge' && !r.essential);
  const conditions = requirements.filter(r => r.kind === 'condition');
  const hasSalary = Number.isFinite(offer.salaryMin) && offer.salaryMin > 0;
  const salary = hasSalary
    ? formatSalary({ salaryMin: offer.salaryMin, salaryMax: Number.isFinite(offer.salaryMax) && offer.salaryMax > 0 ? offer.salaryMax : offer.salaryMin })
    : '';

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="vacancy-preview-title"
      onCancel={e => { e.preventDefault(); onClose(); }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="m-auto w-[min(36rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] p-0 bg-canvas text-fg border border-line-strong rounded-dialog"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface px-5 py-3">
        <div>
          <p id="vacancy-preview-title" className="font-display font-bold text-lead text-fg">Vista previa</p>
          <p className="text-meta text-fg-3">Así verá la oferta la persona joven.</p>
        </div>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Cerrar la vista previa" title="Cerrar" autoFocus>
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="p-4 sm:p-5">
        <article className="card-technical p-5">
          {offer.openToNewcomers && (
            <p className="badge-technical mb-3 text-accent-strong border-accent/50">
              <Sprout className="w-3.5 h-3.5" aria-hidden="true" />
              Abierta a perfiles que empiezan o cambian de sector
            </p>
          )}
          <p className="text-body text-fg-2">
            {offer.companyName} · {offer.sector.trim() || <Missing>sector</Missing>}
          </p>
          <h3 className="font-display font-bold text-title tracking-[-0.015em] text-fg mt-1">
            {offer.title.trim() || <Missing>Nombre del puesto</Missing>}
          </h3>

          <p className="mt-3 font-semibold text-fg">
            {hasSalary ? <span className="nums">{salary}</span> : <Missing>Salario (obligatorio)</Missing>}
          </p>
          <p className="mt-1 text-body text-fg-2 flex items-start gap-1.5">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-fg-3" aria-hidden="true" />
            <span>
              {offer.city.trim() || <Missing>Ciudad</Missing>} · {offer.modality} · Jornada {offer.workday.toLowerCase()}
            </span>
          </p>

          <p className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded border border-line-strong bg-raised text-body text-fg-2">
            Aquí cada persona verá cuántos imprescindibles cumple según su perfil.
          </p>

          <PreviewList title="Lo que piden" items={essentials} />
          <PreviewList title="Condiciones del puesto" items={conditions} />
          <PreviewList title="También valoran (no es obligatorio)" items={desirables} />
          {requirements.length === 0 && <p className="mt-5 text-body"><Missing>Aún no hay requisitos.</Missing></p>}

          <div className="mt-5 border-t border-line pt-4 space-y-4 text-body">
            <p className="text-fg-2 whitespace-pre-line">{offer.description.trim() || <Missing>Descripción del puesto</Missing>}</p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="label-tech mb-0.5">Contrato</dt>
                <dd className="text-fg">{offer.contract.trim() || <Missing>Sin indicar</Missing>}</dd>
              </div>
              <div>
                <dt className="label-tech mb-0.5">Cómo llegar</dt>
                <dd className="text-fg">{offer.commute.trim() || <Missing>Sin indicar</Missing>}</dd>
              </div>
              <div>
                <dt className="label-tech mb-0.5">Cierra</dt>
                <dd className="text-fg flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4 text-fg-3" aria-hidden="true" />
                  {offer.closesAt ? <span className="nums">{formatDate(offer.closesAt)}</span> : <Missing>Sin fecha</Missing>}
                </dd>
              </div>
              <div>
                <dt className="label-tech mb-0.5">Respuesta</dt>
                <dd className="text-fg flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-fg-3" aria-hidden="true" />
                  {Number.isFinite(offer.responseDays) && offer.responseDays > 0
                    ? <span>Suele responder en <span className="nums">{offer.responseDays}</span> {offer.responseDays === 1 ? 'día' : 'días'}</span>
                    : <Missing>Sin indicar</Missing>}
                </dd>
              </div>
            </dl>
          </div>
        </article>
      </div>
    </dialog>
  );
}

function PreviewList({ title, items }: { title: string; items: PreviewOffer['requirements'] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-5">
      <h4 className="label-tech">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((req, index) => (
          <li key={`${req.label}-${index}`} className="flex items-start gap-2 rounded border border-line px-3 py-2 text-body text-fg">
            <span className="dot mt-[0.45rem]" aria-hidden="true" />
            <span className="min-w-0">
              {req.label}
              {req.trainable && <span className="text-fg-3"> · lo enseñan en la empresa</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
