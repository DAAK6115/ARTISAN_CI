import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from '../utils/axiosInstance';
import ArtisanMap from '../components/ArtisanMap';
import AppIcon from '../components/AppIcon';
import PublicHeader from '../components/PublicHeader';
import { getUserRole, isAuthenticated } from '../utils/auth';

const formatPrice = (value) => new Intl.NumberFormat('fr-FR').format(Number(value || 0));

export default function ArtisanPublicProfilePage() {
  const { username } = useParams();
  const [portfolio, setPortfolio] = useState(null);
  const [certifications, setCertifications] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [services, setServices] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const clientConnected = isAuthenticated() && getUserRole() === 'client';

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      axios.get(`/portfolio/artisans/${username}/`),
      axios.get(`/certifications/artisan/${username}/`),
      axios.get(`/reviews/artisan/${username}/`),
      axios.get('/services/', { params: { artisan: username } }),
    ]).then(([portfolioResult, certificationsResult, reviewsResult, servicesResult]) => {
      if (!mounted) return;
      if (portfolioResult.status === 'fulfilled') setPortfolio(portfolioResult.value.data);
      else setMessage('Ce profil artisan est indisponible.');
      setCertifications(certificationsResult.status === 'fulfilled' ? certificationsResult.value.data : []);
      setReviews(reviewsResult.status === 'fulfilled' ? reviewsResult.value.data : []);
      setServices(servicesResult.status === 'fulfilled' ? servicesResult.value.data : []);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [username]);

  const averageRating = useMemo(() => reviews.length ? (reviews.reduce((sum, review) => sum + Number(review.note || 0), 0) / reviews.length).toFixed(1) : null, [reviews]);

  if (loading) {
    return <div className="min-h-screen bg-[#FAF9F6]"><PublicHeader /><div className="mx-auto max-w-6xl space-y-5 px-4 py-8"><div className="h-80 animate-pulse rounded-[32px] bg-white" /><div className="h-64 animate-pulse rounded-[32px] bg-white" /></div></div>;
  }

  if (!portfolio) {
    return <div className="min-h-screen bg-[#FAF9F6]"><PublicHeader /><div className="mx-auto max-w-5xl px-4 py-16 text-center"><p className="text-lg font-black">Profil indisponible</p><p className="mt-2 text-sm text-[#718078]">{message || 'Ce profil ne peut pas être affiché.'}</p><Link to="/prestations" className="mt-5 inline-flex rounded-xl bg-[#0B6B50] px-4 py-2.5 text-sm font-bold text-white">Explorer les prestations</Link></div></div>;
  }

  const initials = String(portfolio.artisan_nom || username).slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[34px] border border-black/5 bg-white shadow-[0_20px_55px_rgba(20,38,30,0.08)]">
          <div className="relative h-52 bg-gradient-to-br from-[#CFE4DB] via-[#EEF4F0] to-[#FFE9D6] sm:h-64">
            {portfolio.photo_couverture && <img src={portfolio.photo_couverture} alt="" className="h-full w-full object-cover" />}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/35 to-transparent" />
          </div>

          <div className="relative px-5 pb-6 sm:px-8 sm:pb-8">
            <div className="-mt-12 flex flex-col gap-5 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <span className="grid h-24 w-24 shrink-0 place-items-center rounded-[28px] border-[6px] border-white bg-[#0B6B50] text-2xl font-black text-white shadow-lg">{initials}</span>
                <div className="pb-1">
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{portfolio.artisan_nom}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-[#66736D]">
                    {portfolio.localisation && <span className="inline-flex items-center gap-1.5"><AppIcon name="pin" className="h-4 w-4 text-[#0B6B50]" />{portfolio.localisation}</span>}
                    {averageRating && <span className="rounded-full bg-[#FFF7DD] px-2.5 py-1 text-xs font-black text-[#926800]">★ {averageRating} · {reviews.length} avis</span>}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {clientConnected ? <Link to={`/client/messagerie/${username}`} className="inline-flex items-center gap-2 rounded-2xl bg-[#111815] px-4 py-2.5 text-sm font-black text-white"><AppIcon name="chat" className="h-4 w-4" /> Message</Link> : <Link to="/login" className="rounded-2xl bg-[#111815] px-4 py-2.5 text-sm font-black text-white">Se connecter pour contacter</Link>}
                {portfolio.whatsapp && <a href={`https://wa.me/${String(portfolio.whatsapp).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="rounded-2xl bg-[#EAF4F0] px-4 py-2.5 text-sm font-black text-[#0B6B50]">WhatsApp</a>}
              </div>
            </div>

            <p className="mt-6 max-w-3xl text-sm leading-7 text-[#596760]">{portfolio.bio || 'Cet artisan n’a pas encore ajouté de présentation.'}</p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
              {portfolio.site_web && <a href={portfolio.site_web} target="_blank" rel="noreferrer" className="text-[#0B6B50]">Site web ↗</a>}
              {portfolio.facebook && <a href={portfolio.facebook} target="_blank" rel="noreferrer" className="text-[#0B6B50]">Facebook ↗</a>}
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-[0_12px_35px_rgba(20,38,30,0.05)] sm:p-6">
              <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B6B50]">Prestations</p><h2 className="mt-1 text-xl font-black">Ce que propose {portfolio.artisan_nom}</h2></div><span className="text-sm font-bold text-[#718078]">{services.length}</span></div>
              {services.length === 0 ? <p className="mt-5 rounded-2xl bg-[#F8F9F7] p-4 text-sm text-[#718078]">Aucune prestation active publiée pour le moment.</p> : <div className="mt-5 grid gap-4 sm:grid-cols-2">{services.map((service) => <Link key={service.id} to={clientConnected ? `/client/services/${service.id}` : `/prestations/${service.id}`} className="group rounded-3xl border border-black/5 bg-[#FBFCFB] p-4 hover:border-[#0B6B50]/20 hover:bg-white hover:shadow-lg"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-[#829087]">{service.categorie_label || service.categorie}</p><h3 className="mt-1 font-black group-hover:text-[#0B6B50]">{service.titre}</h3></div>{service.moyenne_avis && <span className="text-xs font-black text-[#9A6B00]">★ {service.moyenne_avis}</span>}</div><p className="mt-3 line-clamp-2 text-sm leading-5 text-[#66736D]">{service.description}</p><p className="mt-4 font-black text-[#0B6B50]">{service.mode_tarification === 'sur_devis' ? 'Sur devis' : `${service.mode_tarification === 'a_partir_de' ? 'Dès ' : ''}${formatPrice(service.prix)} FCFA`}</p></Link>)}</div>}
            </section>

            <section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-[0_12px_35px_rgba(20,38,30,0.05)] sm:p-6">
              <div className="flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#E07A32]">Portfolio</p><h2 className="mt-1 text-xl font-black">Réalisations</h2></div><span className="text-sm font-bold text-[#718078]">{portfolio.realisations?.length || 0}</span></div>
              {!portfolio.realisations?.length ? <p className="mt-5 rounded-2xl bg-[#F8F9F7] p-4 text-sm text-[#718078]">Aucune réalisation publiée.</p> : <div className="mt-5 grid gap-4 sm:grid-cols-2">{portfolio.realisations.map((item) => <article key={item.id} className="overflow-hidden rounded-3xl bg-[#F8F9F7]">{item.image && <img src={item.image} alt="" className="h-48 w-full object-cover" />}<div className="p-4"><h3 className="font-black">{item.titre || 'Réalisation'}</h3><p className="mt-1 text-sm leading-5 text-[#66736D]">{item.description}</p></div></article>)}</div>}
            </section>

            <section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-[0_12px_35px_rgba(20,38,30,0.05)] sm:p-6">
              <div className="flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B6B50]">Retours clients</p><h2 className="mt-1 text-xl font-black">Avis</h2></div>{averageRating && <span className="rounded-full bg-[#FFF7DD] px-3 py-1 text-sm font-black text-[#926800]">★ {averageRating}/5</span>}</div>
              {reviews.length === 0 ? <p className="mt-5 rounded-2xl bg-[#F8F9F7] p-4 text-sm text-[#718078]">Pas encore d’avis.</p> : <div className="mt-5 grid gap-3">{reviews.slice(0, 8).map((review) => <article key={review.id} className="rounded-2xl bg-[#F8F9F7] p-4"><div className="flex items-center justify-between"><p className="text-sm font-black">{review.client}</p><span className="text-xs font-black text-[#9A6B00]">★ {review.note}/5</span></div><p className="mt-2 text-sm leading-6 text-[#66736D]">{review.commentaire || 'Aucun commentaire.'}</p></article>)}</div>}
            </section>
          </div>

          <aside className="space-y-6">
            {(portfolio.latitude && portfolio.longitude) && <section className="overflow-hidden rounded-[30px] border border-black/5 bg-white p-3 shadow-[0_12px_35px_rgba(20,38,30,0.05)]"><div className="px-2 pb-3"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B6B50]">Zone</p><h2 className="mt-1 font-black">Localisation de l’artisan</h2></div><div className="overflow-hidden rounded-[22px]"><ArtisanMap latitude={portfolio.latitude} longitude={portfolio.longitude} /></div></section>}

            <section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-[0_12px_35px_rgba(20,38,30,0.05)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#66736D]">Documents déclarés</p>
              <h2 className="mt-1 font-black">Certifications</h2>
              <p className="mt-2 text-xs leading-5 text-[#8A958F]">Ces documents sont affichés comme informations déclarées. Leur vérification par la plateforme sera ajoutée au sprint de modération.</p>
              {certifications.length === 0 ? <p className="mt-4 text-sm text-[#718078]">Aucune certification publiée.</p> : <div className="mt-4 space-y-3">{certifications.map((certification) => <div key={certification.id} className="rounded-2xl bg-[#F8F9F7] p-3"><p className="text-sm font-black">{certification.nom}</p><p className="mt-1 text-xs text-[#718078]">{certification.organisme}</p>{certification.fichier && <a href={certification.fichier} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-[#0B6B50]">Voir le document ↗</a>}</div>)}</div>}
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
