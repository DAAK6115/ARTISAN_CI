import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, ChevronRight, CircleDollarSign, Star, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/http';
import { MobileTopBar } from '../components/MobileTopBar';
import { useAuthStore } from '../features/auth/auth.store';

interface DashboardData {
  artisan: { username: string; profile_completion: number };
  metrics: {
    revenue_month: number | string;
    pending_requests: number;
    active_jobs: number;
    appointments_today?: number;
    rating_average: number | null;
    reviews_count: number;
  };
  upcoming_appointments: Array<{
    id: number;
    client_nom: string;
    service_titre: string;
    statut_label: string;
    date_rdv: string;
  }>;
}

const formatMoney = (value: number | string) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value) || 0)} F`;

export function ArtisanHomePage() {
  const user = useAuthStore((state) => state.user);
  const dashboard = useQuery({
    queryKey: ['artisan-dashboard'],
    queryFn: () => apiRequest<DashboardData>('/appointments/artisan-dashboard/')
  });

  const metrics = dashboard.data?.metrics;

  return (
    <div>
      <MobileTopBar />

      <section>
        <p className="text-sm font-semibold text-[var(--artisan-muted)]">Bonjour {user?.username ?? ''} 👋🏾</p>
        <h1 className="mt-1 text-[32px] font-black leading-[1.04] tracking-[-0.05em] text-[var(--artisan-ink)]">
          Pilotez votre activité,
          <span className="block text-[var(--artisan-green)]">simplement.</span>
        </h1>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-[var(--artisan-green)] p-4 text-white shadow-[0_18px_45px_rgba(11,107,80,0.20)]">
          <CircleDollarSign size={21} />
          <p className="mt-6 text-[22px] font-black tracking-[-0.04em]">{formatMoney(metrics?.revenue_month ?? 0)}</p>
          <p className="mt-1 text-xs font-semibold text-white/70">Revenus ce mois</p>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-4 shadow-[var(--artisan-shadow-card)]">
          <span className="grid size-10 place-items-center rounded-2xl bg-[var(--artisan-orange-soft)] text-[var(--artisan-orange)]"><Wrench size={19} /></span>
          <p className="mt-4 text-[22px] font-black tracking-[-0.04em] text-[var(--artisan-ink)]">{metrics?.pending_requests ?? 0}</p>
          <p className="mt-1 text-xs font-semibold text-[var(--artisan-muted)]">Demandes à traiter</p>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-4 shadow-[var(--artisan-shadow-card)]">
          <span className="grid size-10 place-items-center rounded-2xl bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]"><CalendarCheck size={19} /></span>
          <p className="mt-4 text-[22px] font-black tracking-[-0.04em] text-[var(--artisan-ink)]">{metrics?.appointments_today ?? metrics?.active_jobs ?? 0}</p>
          <p className="mt-1 text-xs font-semibold text-[var(--artisan-muted)]">Rendez-vous aujourd’hui</p>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-4 shadow-[var(--artisan-shadow-card)]">
          <span className="grid size-10 place-items-center rounded-2xl bg-[var(--artisan-gold-soft)] text-[#9A6B00]"><Star size={19} fill="currentColor" /></span>
          <p className="mt-4 text-[22px] font-black tracking-[-0.04em] text-[var(--artisan-ink)]">{metrics?.rating_average?.toFixed(1) ?? '—'}</p>
          <p className="mt-1 text-xs font-semibold text-[var(--artisan-muted)]">{metrics?.reviews_count ?? 0} avis</p>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Agenda</p>
            <h2 className="mt-1.5 text-xl font-black tracking-[-0.035em] text-[var(--artisan-ink)]">Prochains rendez-vous</h2>
          </div>
          <Link to="/artisan/agenda" className="text-xs font-black text-[var(--artisan-green)]">Tout voir</Link>
        </div>

        <div className="mt-4 space-y-3">
          {dashboard.isPending && [1, 2].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-3xl bg-white" />
          ))}

          {dashboard.data?.upcoming_appointments?.length ? dashboard.data.upcoming_appointments.map((item) => (
            <Link key={item.id} to={`/artisan/agenda?rdv=${item.id}`} className="flex items-center gap-3 rounded-3xl border border-black/5 bg-white p-4 shadow-[var(--artisan-shadow-card)]">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--artisan-orange-soft)] text-[var(--artisan-orange)]">
                <Wrench size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-[var(--artisan-ink)]">{item.service_titre}</p>
                <p className="mt-1 truncate text-xs font-semibold text-[var(--artisan-muted)]">
                  {item.client_nom} · {new Date(item.date_rdv).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="mt-1 text-[11px] font-black text-[var(--artisan-green)]">{item.statut_label}</p>
              </div>
              <ChevronRight size={18} className="text-[#A0AAA5]" />
            </Link>
          )) : !dashboard.isPending ? (
            <div className="rounded-3xl border border-dashed border-[#CDD8D2] bg-white/70 p-6 text-center text-sm font-semibold text-[var(--artisan-muted)]">
              Aucun rendez-vous à venir.
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-8 rounded-3xl bg-[#111815] p-5 text-white shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-gold)]">Profil professionnel</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <p className="text-2xl font-black">{dashboard.data?.artisan.profile_completion ?? 0}%</p>
            <p className="mt-1 text-xs leading-5 text-white/65">Complétez votre profil pour rassurer davantage les clients.</p>
          </div>
          <Link to="/artisan/profil" className="shrink-0 rounded-2xl bg-white px-3 py-2 text-xs font-black text-[var(--artisan-ink)]">Améliorer</Link>
        </div>
      </section>
    </div>
  );
}
