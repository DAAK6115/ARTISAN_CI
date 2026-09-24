import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosInstance';
import AppIcon from '../../components/AppIcon';
import LogoutButton from '../../components/LogoutButton';

export default function ClientProfilePage() {
  const [profile, setProfile] = useState(null);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([axios.get('/accounts/profile/me/'), axios.get('/favoris/mes/')])
      .then(([profileResult, favoritesResult]) => {
        if (!mounted) return;
        if (profileResult.status === 'fulfilled') setProfile(profileResult.value.data);
        else setMessage('Impossible de charger votre profil.');
        if (favoritesResult.status === 'fulfilled') setFavoriteCount((favoritesResult.value.data || []).length);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="mx-auto h-72 max-w-4xl animate-pulse rounded-[30px] bg-white" />;

  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B6B50]">Compte</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Mon profil</h1>
      </div>
      {message && <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>}

      {profile && (
        <section className="mt-6 overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-[0_16px_45px_rgba(20,38,30,0.07)]">
          <div className="h-28 bg-gradient-to-r from-[#0B6B50] via-[#14785C] to-[#E07A32]" />
          <div className="px-5 pb-6 sm:px-8 sm:pb-8">
            <div className="-mt-10 flex items-end gap-4"><span className="grid h-20 w-20 place-items-center rounded-[24px] border-4 border-white bg-[#111815] text-xl font-black text-white shadow-lg">{String(profile.username || 'C').slice(0,2).toUpperCase()}</span><div className="pb-1"><h2 className="text-2xl font-black">{profile.username}</h2><p className="text-sm text-[#718078]">Compte client ARTISAN_CI</p></div></div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl bg-[#F7F9F7] p-4"><p className="text-xs font-bold text-[#829087]">Email</p><p className="mt-1 break-all text-sm font-black">{profile.email}</p></div>
              <div className="rounded-2xl bg-[#F7F9F7] p-4"><p className="text-xs font-bold text-[#829087]">Numéro Mobile Money</p><p className="mt-1 text-sm font-black">{profile.numero_momo || 'Non renseigné'}</p></div>
              <Link to="/client/favoris" className="rounded-2xl bg-[#FFF7F5] p-4"><p className="text-xs font-bold text-[#A75A50]">Favoris</p><p className="mt-1 text-2xl font-black text-[#C64A3F]">{favoriteCount}</p></Link>
            </div>

            {profile.qr_wave && <div className="mt-5 rounded-3xl border border-black/5 p-4"><p className="text-sm font-black">QR Wave enregistré</p><img src={profile.qr_wave} alt="QR Wave" className="mt-3 h-36 w-36 rounded-2xl border object-contain" /></div>}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row"><Link to="/client/profil/edit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0B6B50] px-5 py-3 text-sm font-black text-white"><AppIcon name="user" className="h-4 w-4" /> Modifier mes informations</Link><LogoutButton className="rounded-2xl bg-[#FFF0EE] px-5 py-3 text-sm font-black text-[#B74339] md:hidden" /></div>
          </div>
        </section>
      )}
    </div>
  );
}
