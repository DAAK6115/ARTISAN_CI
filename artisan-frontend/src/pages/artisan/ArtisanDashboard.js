import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosInstance';
import AppIcon from '../../components/AppIcon';

const STATUS_LABELS = {
  en_attente: 'Demandes reçues',
  accepte: 'Acceptés',
  confirme: 'Confirmés',
  en_route: 'En route',
  en_cours: 'En cours',
  termine: 'Terminés',
  effectue: 'Clôturés',
  refuse: 'Refusés',
  annule_client: 'Annulés client',
  annule_artisan: 'Annulés artisan',
};

function money(value) {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value || 0))} FCFA`;
}

function formatResponseTime(minutes) {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} h`;
}

function MetricCard({ icon, label, value, detail, tone = 'green' }) {
  const tones = {
    green: 'bg-[#EAF4F0] text-[#0B6B50]',
    orange: 'bg-[#FFF1E6] text-[#B85D1C]',
    gold: 'bg-[#FFF7DD] text-[#8A6500]',
    blue: 'bg-[#EDF4FF] text-[#3565A8]',
  };
  return (
    <article className="rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_8px_28px_rgba(30,45,37,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#718078]">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-[#111815]">{value}</p>
          {detail && <p className="mt-1 text-xs font-medium text-[#829087]">{detail}</p>}
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tones[tone] || tones.green}`}>
          <AppIcon name={icon} className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}

export default function ArtisanDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    axios.get('/appointments/artisan-dashboard/')
      .then((response) => active && setData(response.data))
      .catch(() => active && setError('Impossible de charger votre tableau de bord pour le moment.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const maxRevenue = useMemo(() => {
    const values = data?.revenue_series?.map((row) => Number(row.amount || 0)) || [];
    return Math.max(...values, 1);
  }, [data]);

  const speakSummary = () => {
    if (!data || !window.speechSynthesis) return;
    const m = data.metrics;
    const sentence = `Bonjour ${data.artisan.username}. Vous avez ${m.pending_requests} demandes à traiter, ${m.appointments_today} rendez-vous aujourd'hui et ${money(m.revenue_month)} de revenus déclarés payés ce mois.`;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(sentence));
  };

  if (loading) {
    return <div className="mx-auto max-w-[1450px] p-4 sm:p-6"><div className="h-40 animate-pulse rounded-[28px] bg-white" /></div>;
  }

  if (error || !data) {
    return <div className="mx-auto max-w-[1450px] p-4 sm:p-6"><p className="rounded-2xl bg-red-50 p-4 text-red-700">{error || 'Données indisponibles.'}</p></div>;
  }

  const m = data.metrics;
  const profileChecks = data.artisan.profile_checks || {};
  const checkLabels = {
    bio: 'Bio professionnelle', localisation: 'Localisation', photo: 'Photo de couverture',
    contact: 'Contact WhatsApp', position: 'Position sur la carte', service: 'Au moins une prestation',
    portfolio: 'Une réalisation', certification: 'Une certification', availability: 'Horaires disponibles',
  };

  return (
    <div className="mx-auto max-w-[1450px] space-y-6 p-4 pb-28 sm:p-6 lg:pb-8">
      <section className="overflow-hidden rounded-[30px] bg-[#10271F] p-6 text-white shadow-[0_18px_50px_rgba(16,39,31,0.17)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#A8C8BC]">Votre activité aujourd’hui</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Bonjour {data.artisan.username}.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#C9D9D3]">Suivez vos demandes, prestations et règlements depuis un seul espace. Les revenus affichés correspondent uniquement aux règlements que vous avez déclarés comme reçus.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={speakSummary} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/15">🔊 Lire le résumé</button>
            <Link to="/artisan/rdv" className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#10271F]">Ouvrir l’agenda</Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon="wallet" label="Revenus ce mois" value={money(m.revenue_month)} detail={m.revenue_month_delta == null ? 'Première période comparable' : `${m.revenue_month_delta >= 0 ? '+' : ''}${m.revenue_month_delta}% vs mois précédent`} />
        <MetricCard icon="calendar" label="Rendez-vous aujourd’hui" value={m.appointments_today} detail={`${m.appointments_week} cette semaine`} tone="blue" />
        <MetricCard icon="bell" label="Demandes à traiter" value={m.pending_requests} detail={`${m.active_jobs} prestations actives`} tone="orange" />
        <MetricCard icon="star" label="Note moyenne" value={m.rating_average == null ? '—' : `${Number(m.rating_average).toFixed(1)} / 5`} detail={`${m.reviews_count} avis`} tone="gold" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <article className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_8px_28px_rgba(30,45,37,0.05)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#111815]">Revenus déclarés payés</h2>
              <p className="text-sm text-[#718078]">Évolution sur les six derniers mois</p>
            </div>
            <p className="text-sm font-black text-[#0B6B50]">Total : {money(m.revenue_total)}</p>
          </div>
          <div className="mt-7 flex h-52 items-end gap-3 sm:gap-5">
            {data.revenue_series.map((row) => {
              const amount = Number(row.amount || 0);
              const height = Math.max(5, Math.round((amount / maxRevenue) * 100));
              const label = new Date(`${row.month}T00:00:00`).toLocaleDateString('fr-FR', { month: 'short' });
              return (
                <div key={row.month} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <span className="text-[10px] font-bold text-[#829087]">{amount ? new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(amount) : '0'}</span>
                  <div className="flex h-36 w-full items-end rounded-[16px] bg-[#F4F6F4] p-1">
                    <div className="w-full rounded-[12px] bg-[#0B6B50]" style={{ height: `${height}%` }} />
                  </div>
                  <span className="truncate text-xs font-bold capitalize text-[#607067]">{label}</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_8px_28px_rgba(30,45,37,0.05)] sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">Santé de l’activité</h2>
              <p className="text-sm text-[#718078]">Indicateurs rapides</p>
            </div>
            <AppIcon name="chart" className="h-6 w-6 text-[#0B6B50]" />
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3">
            {[
              ['Clients', m.clients],
              ['Prestations actives', m.active_services],
              ['À encaisser', m.unpaid_completed],
              ['Terminées ce mois', m.completed_month],
              ['Taux d’acceptation', m.acceptance_rate == null ? '—' : `${m.acceptance_rate}%`],
              ['Temps de réponse', formatResponseTime(m.average_response_minutes)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#F7F8F6] p-3">
                <dt className="text-[11px] font-bold text-[#718078]">{label}</dt>
                <dd className="mt-1 text-lg font-black text-[#17211D]">{value}</dd>
              </div>
            ))}
          </dl>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <article className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_8px_28px_rgba(30,45,37,0.05)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Prochains rendez-vous</h2>
              <p className="text-sm text-[#718078]">Ce qui demande votre attention</p>
            </div>
            <Link to="/artisan/rdv" className="text-sm font-black text-[#0B6B50]">Voir tout</Link>
          </div>
          <div className="mt-4 space-y-3">
            {data.upcoming_appointments.length === 0 ? (
              <div className="rounded-2xl bg-[#F7F8F6] p-5 text-sm text-[#718078]">Aucun rendez-vous à venir pour le moment.</div>
            ) : data.upcoming_appointments.map((appointment) => (
              <div key={appointment.id} className="flex flex-col gap-3 rounded-2xl border border-black/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-black text-[#17211D]">{appointment.service_titre}</p>
                  <p className="mt-1 text-sm text-[#607067]">{appointment.client_nom} · {new Date(appointment.date_rdv).toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className="w-fit rounded-full bg-[#EAF4F0] px-3 py-1 text-xs font-black text-[#0B6B50]">{appointment.statut_label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_8px_28px_rgba(30,45,37,0.05)] sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">Profil professionnel</h2>
              <p className="text-sm text-[#718078]">Plus il est complet, plus il inspire confiance</p>
            </div>
            <span className="text-2xl font-black text-[#0B6B50]">{data.artisan.profile_completion}%</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#E7ECE8]"><div className="h-full rounded-full bg-[#0B6B50]" style={{ width: `${data.artisan.profile_completion}%` }} /></div>
          <div className="mt-5 space-y-2">
            {Object.entries(profileChecks).slice(0, 6).map(([key, done]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-black ${done ? 'bg-[#EAF4F0] text-[#0B6B50]' : 'bg-[#F1F2EF] text-[#8B968F]'}`}>{done ? '✓' : '•'}</span>
                <span className={done ? 'text-[#526159]' : 'font-semibold text-[#26332D]'}>{checkLabels[key] || key}</span>
              </div>
            ))}
          </div>
          <Link to="/artisan/profil/edit" className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-[#10271F] px-4 py-3 text-sm font-black text-white">Compléter mon profil</Link>
        </article>
      </section>

      <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_8px_28px_rgba(30,45,37,0.05)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-black">Répartition des rendez-vous</h2><p className="text-sm text-[#718078]">Vue d’ensemble de votre activité</p></div>
          <div className="flex gap-2">
            <Link to="/artisan/clients" className="rounded-xl bg-[#F4F6F4] px-3 py-2 text-xs font-black text-[#435149]">Mes clients</Link>
            <Link to="/artisan/services" className="rounded-xl bg-[#EAF4F0] px-3 py-2 text-xs font-black text-[#0B6B50]">Mes prestations</Link>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(data.appointment_statuses).filter(([, count]) => count > 0).map(([status, count]) => (
            <div key={status} className="rounded-2xl bg-[#F7F8F6] p-3">
              <p className="text-2xl font-black text-[#17211D]">{count}</p>
              <p className="mt-1 text-xs font-semibold text-[#718078]">{STATUS_LABELS[status] || status}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
