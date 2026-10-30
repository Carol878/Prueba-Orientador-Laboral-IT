/**
 * @file CompanyPanel.tsx
 * @description Panel de empresas: publicar vacantes, revisar candidaturas e impacto.
 *
 * Pensado para revisarse una vez por semana: listados y tablas, nada de deslizar tarjetas.
 * Todos los datos pasan por `offersService`; el panel se refresca con `OFFERS_CHANGED_EVENT`
 * (y con el evento `storage` cuando el cambio llega desde otra pestaña).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Building2, FilePlus2, Inbox } from 'lucide-react';

import type { Application, JobOffer, UserSession } from '../../types';
import { OFFERS_CHANGED_EVENT, offersService } from '../../services/offersService';
import { scrollToTop } from '../../lib/smoothScroll';
import AmbientBackground from '../common/AmbientBackground';
import { MobileHeader, Sidebar } from '../common/AppShell';
import type { NavItem } from '../common/AppShell';
import VacancyForm from './VacancyForm';
import VacanciesList from './VacanciesList';
import ApplicantsBoard from './ApplicantsBoard';
import ImpactStats from './ImpactStats';

type CompanyTab = 'publish' | 'vacancies' | 'impact';

interface CompanyPanelProps {
  user: UserSession;
  onLogout: () => void;
}

export default function CompanyPanel({ user, onLogout }: CompanyPanelProps) {
  const [tab, setTab] = useState<CompanyTab>('vacancies');
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [applicationsByOffer, setApplicationsByOffer] = useState<Record<string, Application[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>('');
  /** Vacante abierta en la vista de candidaturas. */
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  /** Vacante en edición (en la pestaña "Publicar vacante"). */
  const [editingOffer, setEditingOffer] = useState<JobOffer | null>(null);
  const [notice, setNotice] = useState<string>('');

  const reload = useCallback(async () => {
    try {
      const list = await offersService.listCompanyOffers(user.email);
      const entries = await Promise.all(list.map(async o => [o.id, await offersService.listApplicants(o.id)] as const));
      setOffers(list);
      setApplicationsByOffer(Object.fromEntries(entries));
      setLoadError('');
    } catch (error) {
      console.error('[empresas] No se han podido cargar las vacantes:', error);
      setLoadError('No se han podido cargar tus vacantes. Comprueba la conexión y vuelve a intentarlo.');
    } finally {
      setLoading(false);
    }
  }, [user.email]);

  useEffect(() => {
    reload();
    const onChange = () => { reload(); };
    const onStorage = (event: StorageEvent) => { if (event.key === null || event.key === 'offers_store_v1') reload(); };
    window.addEventListener(OFFERS_CHANGED_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(OFFERS_CHANGED_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [reload]);

  // Cada pestaña o vista nueva empieza arriba.
  useEffect(() => {
    scrollToTop();
  }, [tab, selectedOfferId, editingOffer]);

  const unseenTotal = useMemo(
    () => Object.values(applicationsByOffer).flat().filter(a => a.unseenByCompany).length,
    [applicationsByOffer]
  );

  const goTo = (next: CompanyTab) => {
    setTab(next);
    setSelectedOfferId(null);
    setEditingOffer(null);
    setNotice('');
  };

  // `NavItem` no admite insignias: el contador de nuevas va en la etiqueta, corto ("Vacantes · 2").
  const unseenSuffix = unseenTotal > 0 ? ` · ${unseenTotal}` : '';
  const navItems: NavItem[] = [
    { id: 'publish', label: 'Publicar vacante', shortLabel: 'Publicar', icon: FilePlus2 },
    { id: 'vacancies', label: `Vacantes y candidaturas${unseenSuffix}`, shortLabel: `Vacantes${unseenSuffix}`, icon: Inbox },
    { id: 'impact', label: 'Impacto', shortLabel: 'Impacto', icon: BarChart3 }
  ];

  const shell = {
    panelName: 'Portal de empresas',
    brandIcon: Building2,
    userName: user.name,
    userEmail: user.email,
    roleLabel: 'Organización',
    items: navItems,
    activeId: tab,
    onSelect: (id: string) => goTo(id as CompanyTab),
    onLogout,
    // El portal de empresa es una herramienta de trabajo: sin selector de fondo animado.
    showBackdropToggle: false
  };

  const selectedOffer = selectedOfferId ? offers.find(o => o.id === selectedOfferId) : undefined;

  const handleSaved = (saved: JobOffer, isNew: boolean) => {
    setEditingOffer(null);
    setTab('vacancies');
    setNotice(isNew ? `Vacante publicada: "${saved.title}". Ya pueden verla las personas candidatas.` : `Cambios guardados en "${saved.title}".`);
  };

  return (
    <div className="flex min-h-dvh bg-ambient text-fg">
      <AmbientBackground />
      <Sidebar {...shell} />

      <main className="flex-1 flex flex-col min-w-0">
        <MobileHeader {...shell} />

        <div className="page flex-1 animate-enter" key={`${tab}-${selectedOfferId ?? ''}-${editingOffer?.id ?? ''}`}>
          {loadError && (
            <div role="alert" className="alert alert-danger mb-4 items-center">
              <AlertTriangle aria-hidden="true" />
              <p className="flex-1">{loadError}</p>
              <button type="button" onClick={() => reload()} className="btn btn-secondary">Reintentar</button>
            </div>
          )}

          {tab === 'publish' && (
            <VacancyForm
              companyEmail={user.email}
              companyName={user.name}
              offer={editingOffer ?? undefined}
              onSaved={handleSaved}
              onCancel={editingOffer ? () => goTo('vacancies') : undefined}
            />
          )}

          {tab === 'vacancies' && selectedOffer && (
            <ApplicantsBoard
              offer={selectedOffer}
              applications={applicationsByOffer[selectedOffer.id] ?? []}
              onBack={() => setSelectedOfferId(null)}
            />
          )}

          {tab === 'vacancies' && !selectedOffer && (
            <VacanciesList
              offers={offers}
              applicationsByOffer={applicationsByOffer}
              loading={loading}
              notice={notice}
              onOpen={offer => { setNotice(''); setSelectedOfferId(offer.id); }}
              onEdit={offer => { setNotice(''); setEditingOffer(offer); setTab('publish'); }}
              onCreate={() => goTo('publish')}
            />
          )}

          {tab === 'impact' && <ImpactStats offers={offers} applicationsByOffer={applicationsByOffer} />}
        </div>
      </main>
    </div>
  );
}
