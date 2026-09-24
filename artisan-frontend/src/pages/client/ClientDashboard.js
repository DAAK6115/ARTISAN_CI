import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosInstance';
import AppIcon from '../../components/AppIcon';

const statusLabels = {
  en_attente: 'Demande envoyée',
  accepte: 'Accepté',
  confirme: 'Confirmé',
  en_route: 'Artisan en route',
  en_cours: 'En cours',
  termine: 'Terminé',
  cloture: 'Clôturé',
  refuse: 'Refusé',
  annule: 'Annulé',
};

const statusStyles = {
  en_attente: 'bg-amber-50 text-amber-700',
  accepte: 'bg-blue-50 text-blue-700',
  confirme: 'bg-emerald-50 text-emerald-700',
  en_route: 'bg-indigo-50 text-indigo-700',
  en_cours: 'bg-violet-50 text-violet-700',
  termine: 'bg-slate-100 text-slate-700',
  cloture: 'bg-slate-100 text-slate-700',
  refuse: 'bg-red-50 text-red-700',
  annule: 'bg-red-50 text-red-700',
};

const formatDate = (value) => new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
}).format(new Date(value));

export default function ClientDashboard() {
  const [data, setData] = useState({
    profile: null,
    appointments: [],
    payments: [],
    notifications: [],
    favorites: [],
    quotes: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      const requests = [
        axios.get('/accounts/profile/me/'),
        axios.get('/appointments/mes/'),
        axios.get('/payments/mes/'),
        axios.get('/notifications/'),
        axios.get('/favoris/mes/'),
        axios.get('/payments/quotes/client/'),
      ];

      const [profile, appointments, payments, notifications, favorites, quotes] = await Promise.allSettled(requests);
      if (!mounted) return;

      setData({
        profile: profile.status === 'fulfilled' ? profile.value.data : null,
        appointments: appointments.status === 'fulfilled' ? appointments.value.data : [],
        payments: payments.status === 'fulfilled' ? payments.value.data : [],
        notifications: notifications.status === 'fulfilled' ? notifications.value.data : [],
        favorites: favorites.status === 'fulfilled' ? favorites.value.data : [],
        quotes: quotes.status === 'fulfilled' ? quotes.value.data : [],
      });

      if ([profile, appointments].some((result) => result.status === 'rejected')) {
        setError('Certaines informations n’ont pas pu être chargées. Vous pouvez réessayer en actualisant la page.');
      }
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  const activeAppointments = useMemo(() => data.appointments.filter((item) => !['termine', 'cloture', 'annule', 'refuse'].includes(item.statut)), [data.appointments]);
  const upcoming = useMemo(() => [...activeAppointments]
    .filter((item) => new Date(item.date_rdv) >= new Date())
    .sort((a, b) => new Date(a.date_rdv) - new Date(b.date_rdv))[0], [activeAppointments]);
  const unread = data.notifications.filter((item) => !item.lu).length;
  const paid = data.payments.filter((item) => item.statut === 'paid').length;
  const pendingQuotes = data.quotes.filter((item) => item.status === 'sent').length;

  const cards = [
    ['calendar', 'Rendez-vous actifs', activeAppointments.length, '/client/rdvs'],
    ['file', 'Devis à consulter', pendingQuotes, '/client/devis'],
    ['heart', 'Favoris', data.favorites.length, '/client/favoris'],
    ['receipt', 'Prestations payées', paid, '/client/paiements'],
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-32 animate-pulse rounded-[30px] bg-white" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-3xl bg-white" />)}
        </div>
        <div className="h-72 animate-pulse rounded-3xl bg-white" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <section className="relative overflow-hidden rounded-[32px] border border-black/5 bg-[#111815] p-6 text-white shadow-[0_20px_55px_rgba(20,38,30,0.14)] sm:p-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#0B6B50]/55 blur-3xl" />
        <div className="absolute bottom-[-120px] right-32 h-64 w-64 rounded-full bg-[#E07A32]/30 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A8D7C7]">Espace client</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Bonjour {data.profile?.username || 'Client'}.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Retrouvez vos demandes, devis, rendez-vous et règlements au même endroit.</p>
          </div>
          <Link to="/client/services" className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#0B6B50] shadow-sm transition hover:-translate-y-0.5">
            <AppIcon name="search" className="h-4 w-4" />
            Trouver un artisan
          </Link>
        </div>
      </section>

      {error && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([icon, label, value, href]) => (
          <Link key={label} to={href} className="group rounded-3xl border border-black/5 bg-white p-5 shadow-[0_10px_30px_rgba(20,38,30,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(20,38,30,0.08)]">
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EAF4F0] text-[#0B6B50]"><AppIcon name={icon} className="h-5 w-5" /></span>
              <AppIcon name="arrow" className="h-4 w-4 text-[#A5AFA9] transition group-hover:translate-x-1 group-hover:text-[#0B6B50]" />
            </div>
            <p className="mt-5 text-3xl font-black tracking-tight text-[#111815]">{value}</p>
            <p className="mt-1 text-sm font-semibold text-[#66736D]">{label}</p>
          </Link>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-[30px] border border-black/5 bg-white p-5 shadow-[0_12px_35px_rgba(20,38,30,0.05)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0B6B50]">À venir</p>
              <h2 className="mt-1 text-xl font-black">Votre prochain rendez-vous</h2>
            </div>
            <Link to="/client/rdvs" className="text-sm font-bold text-[#0B6B50]">Tout voir</Link>
          </div>

          {upcoming ? (
            <div className="mt-5 rounded-3xl bg-[#F6F8F6] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusStyles[upcoming.statut] || 'bg-slate-100 text-slate-700'}`}>{statusLabels[upcoming.statut] || upcoming.statut}</span>
                  <h3 className="mt-3 text-xl font-black">{upcoming.service_titre}</h3>
                  <p className="mt-1 text-sm text-[#66736D]">avec {upcoming.artisan_nom}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#34423B] shadow-sm">
                  <div className="flex items-center gap-2"><AppIcon name="calendar" className="h-4 w-4 text-[#0B6B50]" />{formatDate(upcoming.date_rdv)}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-[#CED8D2] bg-[#FBFCFB] p-8 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#EAF4F0] text-[#0B6B50]"><AppIcon name="calendar" className="h-5 w-5" /></span>
              <p className="mt-4 font-black">Aucun rendez-vous à venir</p>
              <p className="mt-1 text-sm text-[#718078]">Recherchez une prestation et choisissez un créneau disponible.</p>
              <Link to="/client/services" className="mt-4 inline-flex rounded-xl bg-[#0B6B50] px-4 py-2 text-sm font-bold text-white">Explorer les prestations</Link>
            </div>
          )}
        </div>

        <div className="rounded-[30px] border border-black/5 bg-white p-5 shadow-[0_12px_35px_rgba(20,38,30,0.05)] sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E07A32]">Activité</p>
              <h2 className="mt-1 text-xl font-black">À ne pas manquer</h2>
            </div>
            <Link to="/client/notifications" className="relative grid h-10 w-10 place-items-center rounded-xl bg-[#FFF4E8] text-[#D46B24]">
              <AppIcon name="bell" className="h-5 w-5" />
              {unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#D84A3A] px-1 text-center text-[10px] font-black leading-5 text-white">{unread}</span>}
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {data.notifications.slice(0, 4).map((notification) => (
              <Link key={notification.id} to={notification.lien_redirection || '/client/notifications'} className="flex gap-3 rounded-2xl bg-[#F8F9F7] p-4 hover:bg-[#F1F4F2]">
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${notification.lu ? 'bg-[#C7D0CB]' : 'bg-[#E07A32]'}`} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{notification.titre || 'Notification'}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#718078]">{notification.message}</p>
                </div>
              </Link>
            ))}
            {data.notifications.length === 0 && <p className="rounded-2xl bg-[#F8F9F7] p-5 text-sm text-[#718078]">Aucune notification pour le moment.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
