import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosInstance';
import ArtisanMap from '../../components/ArtisanMap';
import LocationActions from '../../components/LocationActions';
import AppIcon from '../../components/AppIcon';

export default function ArtisanProfilePage() {
  const [portfolio, setPortfolio] = useState(null);
  const [certifications, setCertifications] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [account, setAccount] = useState(null);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([axios.get('/portfolio/me/'), axios.get('/certifications/mes/'), axios.get('/reviews/artisan/'), axios.get('/accounts/me/')])
      .then(([p, c, r, a]) => { setPortfolio(p.data); setCertifications(c.data || []); setReviews(r.data || []); setAccount(a.data); })
      .catch(() => setError('Impossible de charger votre profil professionnel.'))
      .finally(() => setLoading(false));
  }, []);


  const requestVerification = async () => {
    try {
      const response = await axios.post('/accounts/artisan/verification/request/');
      setAccount((current) => ({ ...current, verification_status: response.data.verification_status }));
      setVerificationMessage('Demande de vérification envoyée à l’administration.');
    } catch (error) {
      setVerificationMessage(error?.response?.data?.detail || 'Impossible d’envoyer la demande.');
    }
  };

  if (loading) return <div className="p-6">Chargement...</div>;
  if (error || !portfolio) return <div className="p-6 text-red-700">{error || 'Profil indisponible.'}</div>;
  const average = reviews.length ? (reviews.reduce((sum, item) => sum + Number(item.note || 0), 0) / reviews.length).toFixed(1) : null;
  const hasCoordinates = Number.isFinite(Number(portfolio.latitude)) && Number.isFinite(Number(portfolio.longitude));

  return (
    <div className="mx-auto max-w-[1350px] space-y-6 p-4 pb-28 sm:p-6 lg:pb-8">
      <section className="overflow-hidden rounded-[30px] border border-black/5 bg-white shadow-[0_12px_36px_rgba(30,45,37,0.06)]">
        {portfolio.photo_couverture ? <img src={portfolio.photo_couverture} alt="Couverture" className="h-56 w-full object-cover sm:h-72" /> : <div className="h-48 bg-gradient-to-br from-[#DDECE6] to-[#F7E9D8]" />}
        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#0B6B50]">Profil professionnel</p><div className="mt-2 flex flex-wrap items-center gap-2"><h1 className="text-3xl font-black">{portfolio.artisan_nom}</h1><span className={`rounded-full px-3 py-1 text-xs font-black ${account?.verification_status === 'verified' ? 'bg-[#EAF4F0] text-[#0B6B50]' : account?.verification_status === 'rejected' ? 'bg-[#FFF0EE] text-[#B23A31]' : 'bg-[#FFF7DD] text-[#745B15]'}`}>{account?.verification_status === 'verified' ? 'Vérifié' : account?.verification_status === 'pending' ? 'En vérification' : account?.verification_status === 'rejected' ? 'Refusé' : 'Non vérifié'}</span></div><p className="mt-2 max-w-2xl text-sm leading-6 text-[#607067]">{portfolio.bio || 'Ajoutez une bio professionnelle pour expliquer clairement votre savoir-faire.'}</p>{portfolio.localisation && <p className="mt-3 text-sm font-bold text-[#435149]">📍 {portfolio.localisation}</p>}</div><Link to="/artisan/profil/edit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#10271F] px-5 py-3 text-sm font-black text-white"><AppIcon name="user" className="h-4 w-4" /> Modifier</Link></div>
          <div className="mt-6 grid grid-cols-3 gap-3 sm:max-w-xl"><div className="rounded-2xl bg-[#F7F8F6] p-3"><p className="text-xl font-black">{portfolio.realisations?.length || 0}</p><p className="text-xs text-[#718078]">Réalisations</p></div><div className="rounded-2xl bg-[#F7F8F6] p-3"><p className="text-xl font-black">{certifications.length}</p><p className="text-xs text-[#718078]">Certifications</p></div><div className="rounded-2xl bg-[#F7F8F6] p-3"><p className="text-xl font-black">{average || '—'}</p><p className="text-xs text-[#718078]">Note moyenne</p></div></div>
        </div>
      </section>

      {account?.verification_status !== 'verified' && <section className="rounded-[26px] border border-black/5 bg-white p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-black">Vérification ARTISAN_CI</h2><p className="mt-1 text-sm text-[#718078]">Demandez l’examen de votre identité professionnelle. Le badge public n’apparaît qu’après validation administrative.</p>{account?.verification_note && <p className="mt-2 text-xs font-semibold text-[#B23A31]">Note administration : {account.verification_note}</p>}{verificationMessage && <p className="mt-2 text-sm font-semibold text-[#3565A8]">{verificationMessage}</p>}</div><button disabled={account?.verification_status === 'pending'} onClick={requestVerification} className="rounded-2xl bg-[#0B6B50] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{account?.verification_status === 'pending' ? 'Demande en cours' : 'Demander la vérification'}</button></div></section>}

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <article className="rounded-[28px] border border-black/5 bg-white p-5">
          <h2 className="font-black">Localisation & contact</h2>
          {hasCoordinates ? <div className="mt-4 overflow-hidden rounded-[22px]"><ArtisanMap latitude={portfolio.latitude} longitude={portfolio.longitude} height={340} popupText={portfolio.localisation || 'Position de l’artisan'} /></div> : <p className="mt-4 rounded-2xl bg-[#FFF7DD] p-4 text-sm text-[#745B15]">Votre position n’est pas encore enregistrée.</p>}
          {hasCoordinates && <div className="mt-4"><LocationActions latitude={portfolio.latitude} longitude={portfolio.longitude} label={portfolio.localisation || portfolio.artisan_nom} /></div>}
          <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">{portfolio.whatsapp && <a href={`https://wa.me/${String(portfolio.whatsapp).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="rounded-xl bg-[#EAF4F0] px-3 py-2 text-[#0B6B50]">WhatsApp</a>}{portfolio.site_web && <a href={portfolio.site_web} target="_blank" rel="noreferrer" className="rounded-xl bg-[#EDF4FF] px-3 py-2 text-[#3565A8]">Site web</a>}{portfolio.facebook && <a href={portfolio.facebook} target="_blank" rel="noreferrer" className="rounded-xl bg-[#EDF4FF] px-3 py-2 text-[#3565A8]">Facebook</a>}</div>
        </article>
        <article className="rounded-[28px] border border-black/5 bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-black">Certifications</h2><Link to="/artisan/certifications" className="text-sm font-black text-[#0B6B50]">Gérer</Link></div><div className="mt-4 space-y-3">{certifications.slice(0,4).map((item) => <div key={item.id} className="flex items-start gap-3 rounded-2xl bg-[#F7F8F6] p-3"><AppIcon name="award" className="mt-0.5 h-5 w-5 text-[#8A6500]" /><div><p className="text-sm font-black">{item.nom}</p><p className="text-xs text-[#718078]">{item.organisme}</p></div></div>)}{certifications.length === 0 && <p className="text-sm text-[#718078]">Aucune certification ajoutée.</p>}</div></article>
      </section>

      <section className="rounded-[28px] border border-black/5 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="font-black">Derniers avis clients</h2><p className="text-sm text-[#718078]">{reviews.length} avis reçu{reviews.length > 1 ? 's' : ''}</p></div><AppIcon name="star" className="h-6 w-6 text-[#B98A00]" /></div><div className="mt-4 grid gap-3 md:grid-cols-2">{reviews.slice(0,6).map((review) => <article key={review.id} className="rounded-2xl bg-[#F7F8F6] p-4"><p className="text-sm font-black">{'★'.repeat(Number(review.note || 0))}<span className="text-[#A5AFA9]">{'☆'.repeat(Math.max(0,5-Number(review.note || 0)))}</span></p><p className="mt-2 text-sm text-[#526159]">{review.commentaire || 'Aucun commentaire.'}</p><p className="mt-2 text-xs text-[#829087]">{review.client}</p></article>)}{reviews.length === 0 && <p className="text-sm text-[#718078]">Pas encore d’avis.</p>}</div></section>
    </div>
  );
}
