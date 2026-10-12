import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosInstance';
import AppIcon from '../../components/AppIcon';
import LogoutButton from '../../components/LogoutButton';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { countryDisplayName, countryFlag } from '../../utils/country';

function listFromResponse(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function displayName(profile) {
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  return fullName || profile?.username || 'Client';
}

function completion(profile) {
  if (!profile) return 0;
  const fields = [
    profile.first_name,
    profile.last_name,
    profile.profile_photo,
    profile.country_code,
    profile.city,
    profile.phone_number,
    profile.primary_address,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

const CONTACT_LABELS = {
  chat: 'Messagerie ARTISAN_CI',
  whatsapp: 'WhatsApp',
  phone: 'Téléphone',
  email: 'Email',
};

const PLACE_LABELS = {
  no_preference: 'Aucune préférence',
  home: 'Chez moi',
  workshop: "Chez l’artisan",
};

export default function ClientProfilePage() {
  const [profile, setProfile] = useState(null);
  const [activity, setActivity] = useState({ favorites: 0, upcoming: 0, completed: 0, reviews: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    const [profileResult, favoritesResult, appointmentsResult, reviewsResult, unreadResult] = await Promise.allSettled([
      axios.get('/accounts/profile/me/'),
      axios.get('/favoris/mes/'),
      axios.get('/appointments/mes/'),
      axios.get('/reviews/mes/'),
      axios.get('/notifications/unread-count/'),
    ]);

    if (profileResult.status === 'fulfilled') {
      setProfile(profileResult.value.data);
      setMessage('');
    } else if (!silent) {
      setMessage('Impossible de charger votre profil.');
    }

    const favorites = favoritesResult.status === 'fulfilled' ? listFromResponse(favoritesResult.value.data).length : 0;
    const appointments = appointmentsResult.status === 'fulfilled' ? listFromResponse(appointmentsResult.value.data) : [];
    const reviews = reviewsResult.status === 'fulfilled' ? listFromResponse(reviewsResult.value.data).length : 0;
    const unread = unreadResult.status === 'fulfilled' ? Number(unreadResult.value.data?.unread_count || 0) : 0;

    const activeStatuses = new Set(['en_attente', 'accepte', 'confirme', 'en_route', 'en_cours', 'termine']);
    const completedStatuses = new Set(['effectue']);
    setActivity({
      favorites,
      upcoming: appointments.filter((item) => activeStatuses.has(item.statut)).length,
      completed: appointments.filter((item) => completedStatuses.has(item.statut)).length,
      reviews,
      unread,
    });

    if (!silent) setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useAutoRefresh(() => load(true), { intervalMs: 30000 });

  const profileCompletion = useMemo(() => completion(profile), [profile]);

  if (loading) return <div className="mx-auto h-72 max-w-5xl animate-pulse rounded-[30px] bg-white" />;

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B6B50]">Compte</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Mon profil</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718078]">Gérez vos informations, préférences et raccourcis personnels ARTISAN_CI.</p>
        </div>
        <Link to="/client/profil/edit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0B6B50] px-5 py-3 text-sm font-black text-white shadow-sm">
          <AppIcon name="user" className="h-4 w-4" /> Modifier mon profil
        </Link>
      </div>

      {message && <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>}

      {profile && (
        <>
          <section className="mt-6 overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-[0_16px_45px_rgba(20,38,30,0.07)]">
            <div className="h-28 bg-gradient-to-r from-[#0B6B50] via-[#14785C] to-[#E07A32]" />
            <div className="px-5 pb-7 sm:px-8 sm:pb-8">
              <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-4">
                  <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[24px] border-4 border-white bg-[#111815] text-xl font-black text-white shadow-lg">
                    {profile.profile_photo ? (
                      <img src={profile.profile_photo} alt={displayName(profile)} className="h-full w-full object-cover" />
                    ) : (
                      String(profile.first_name || profile.username || 'C').slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="pb-1">
                    <h2 className="text-2xl font-black">{displayName(profile)}</h2>
                    <p className="text-sm text-[#718078]">@{profile.username} · Compte client ARTISAN_CI</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between gap-6 text-xs font-bold text-[#718078]"><span>Profil complété</span><span>{profileCompletion}%</span></div>
                  <div className="mt-2 h-2 w-48 overflow-hidden rounded-full bg-[#E9EFEB]"><div className="h-full rounded-full bg-[#0B6B50] transition-all" style={{ width: `${profileCompletion}%` }} /></div>
                </div>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl bg-[#F7F9F7] p-4"><p className="text-xs font-bold text-[#829087]">Email</p><p className="mt-1 break-all text-sm font-black">{profile.email}</p></div>
                <div className="rounded-2xl bg-[#F7F9F7] p-4"><p className="text-xs font-bold text-[#829087]">Pays</p><p className="mt-1 text-sm font-black">{countryFlag(profile.country_code)} {countryDisplayName(profile.country_code)}</p><p className="mt-1 text-xs text-[#718078]">{profile.country_calling_code} · {profile.currency_code}</p></div>
                <div className="rounded-2xl bg-[#F7F9F7] p-4"><p className="text-xs font-bold text-[#829087]">Ville / commune</p><p className="mt-1 text-sm font-black">{profile.city || 'Non renseignée'}</p></div>
                <div className="rounded-2xl bg-[#F7F9F7] p-4"><p className="text-xs font-bold text-[#829087]">Téléphone</p><p className="mt-1 text-sm font-black">{profile.phone_number_national || profile.phone_number || 'Non renseigné'}</p></div>
                <div className="rounded-2xl bg-[#F7F9F7] p-4"><p className="text-xs font-bold text-[#829087]">Mobile Money</p><p className="mt-1 text-sm font-black">{profile.numero_momo_national || profile.numero_momo || 'Non renseigné'}</p></div>
                <div className="rounded-2xl bg-[#F7F9F7] p-4"><p className="text-xs font-bold text-[#829087]">Adresse principale</p><p className="mt-1 line-clamp-2 text-sm font-black">{profile.primary_address || 'Non renseignée'}</p></div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Link to="/client/rdvs" className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-0.5"><AppIcon name="calendar" className="h-5 w-5 text-[#0B6B50]" /><p className="mt-4 text-3xl font-black">{activity.upcoming}</p><p className="mt-1 text-xs font-bold text-[#718078]">Rendez-vous en suivi</p></Link>
            <Link to="/client/rdvs" className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-0.5"><AppIcon name="check" className="h-5 w-5 text-[#0B6B50]" /><p className="mt-4 text-3xl font-black">{activity.completed}</p><p className="mt-1 text-xs font-bold text-[#718078]">Prestations clôturées</p></Link>
            <Link to="/client/favoris" className="rounded-[24px] border border-black/5 bg-[#FFF8F5] p-5 shadow-sm transition hover:-translate-y-0.5"><AppIcon name="heart" className="h-5 w-5 text-[#D86640]" /><p className="mt-4 text-3xl font-black text-[#C64A3F]">{activity.favorites}</p><p className="mt-1 text-xs font-bold text-[#9B6254]">Favoris</p></Link>
            <Link to="/client/avis" className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-0.5"><AppIcon name="star" className="h-5 w-5 text-[#E7A82E]" /><p className="mt-4 text-3xl font-black">{activity.reviews}</p><p className="mt-1 text-xs font-bold text-[#718078]">Avis publiés</p></Link>
            <Link to="/client/notifications" className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-0.5"><AppIcon name="bell" className="h-5 w-5 text-[#0B6B50]" /><p className="mt-4 text-3xl font-black">{activity.unread}</p><p className="mt-1 text-xs font-bold text-[#718078]">Notifications non lues</p></Link>
          </section>

          <section className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B6B50]">Préférences</p>
              <h3 className="mt-2 text-xl font-black">Comment vous servir au mieux</h3>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#F7F9F7] p-4"><p className="text-xs font-bold text-[#829087]">Contact préféré</p><p className="mt-1 text-sm font-black">{CONTACT_LABELS[profile.preferred_contact_method] || 'Messagerie ARTISAN_CI'}</p></div>
                <div className="rounded-2xl bg-[#F7F9F7] p-4"><p className="text-xs font-bold text-[#829087]">Lieu préféré</p><p className="mt-1 text-sm font-black">{PLACE_LABELS[profile.preferred_service_location] || 'Aucune préférence'}</p></div>
              </div>
              <Link to="/client/profil/edit" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#0B6B50]">Modifier mes préférences <AppIcon name="arrow" className="h-4 w-4" /></Link>
            </div>

            <div className="rounded-[28px] border border-black/5 bg-[#10271F] p-6 text-white shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9AC5B6]">Accès rapides</p>
              <h3 className="mt-2 text-xl font-black">Votre espace client</h3>
              <div className="mt-5 grid gap-2">
                <Link to="/client/artisans" className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm font-black"><span>Trouver un artisan</span><AppIcon name="arrow" className="h-4 w-4" /></Link>
                <Link to="/client/paiements" className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm font-black"><span>Mes paiements</span><AppIcon name="arrow" className="h-4 w-4" /></Link>
                <Link to="/client/support" className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm font-black"><span>Support</span><AppIcon name="arrow" className="h-4 w-4" /></Link>
              </div>
            </div>
          </section>

          <div className="mt-6 md:hidden"><LogoutButton className="w-full rounded-2xl bg-[#FFF0EE] px-5 py-3 text-sm font-black text-[#B74339]" /></div>
        </>
      )}
    </div>
  );
}
