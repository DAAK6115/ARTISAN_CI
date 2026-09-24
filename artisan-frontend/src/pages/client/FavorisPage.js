import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosInstance';
import AppIcon from '../../components/AppIcon';

const formatPrice = (value) => new Intl.NumberFormat('fr-FR').format(Number(value || 0));

export default function FavorisPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    axios.get('/favoris/mes/')
      .then((response) => mounted && setFavorites(response.data || []))
      .catch(() => mounted && setMessage('Impossible de charger vos favoris.'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const removeFavorite = async (favorite) => {
    try {
      await axios.post(`/favoris/toggle/${favorite.service.id}/`);
      setFavorites((current) => current.filter((item) => item.id !== favorite.id));
    } catch {
      setMessage('Impossible de retirer ce favori.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B6B50]">Enregistrés</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Mes favoris</h1>
        <p className="mt-2 text-sm text-[#66736D]">Retrouvez rapidement les prestations que vous souhaitez garder sous la main.</p>
      </div>

      {message && <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>}

      {loading ? <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[1,2,3].map((item) => <div key={item} className="h-72 animate-pulse rounded-3xl bg-white" />)}</div> : favorites.length === 0 ? (
        <div className="mt-8 rounded-[30px] border border-dashed border-[#CAD5CF] bg-white p-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#FFF0EE] text-[#C64A3F]"><AppIcon name="heart" className="h-5 w-5" /></span>
          <h2 className="mt-4 font-black">Aucun favori pour le moment</h2>
          <p className="mt-1 text-sm text-[#718078]">Enregistrez une prestation pour la retrouver ici.</p>
          <Link to="/client/services" className="mt-5 inline-flex rounded-xl bg-[#0B6B50] px-4 py-2.5 text-sm font-bold text-white">Explorer les prestations</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {favorites.map((favorite) => {
            const service = favorite.service;
            return (
              <article key={favorite.id} className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_12px_35px_rgba(20,38,30,0.06)]">
                {service.image ? <img src={service.image} alt="" className="h-44 w-full object-cover" /> : <div className="grid h-44 place-items-center bg-gradient-to-br from-[#EAF4F0] to-[#FFF4E8] text-[#0B6B50]"><AppIcon name="tools" className="h-10 w-10" /></div>}
                <div className="p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#829087]">{service.categorie_label || service.categorie}</p>
                  <h2 className="mt-1 text-lg font-black">{service.titre}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#66736D]">{service.description}</p>
                  <div className="mt-4 flex items-end justify-between gap-3"><div><Link to={`/artisans/${service.artisan_username}`} className="text-xs font-bold text-[#66736D]">{service.artisan_username}</Link><p className="mt-1 font-black text-[#0B6B50]">{service.mode_tarification === 'sur_devis' ? 'Sur devis' : `${service.mode_tarification === 'a_partir_de' ? 'Dès ' : ''}${formatPrice(service.prix)} FCFA`}</p></div>{service.moyenne_avis && <span className="rounded-full bg-[#FFF7DD] px-2.5 py-1 text-xs font-black text-[#926800]">★ {service.moyenne_avis}</span>}</div>
                  <div className="mt-5 flex gap-2 border-t border-black/5 pt-4"><Link to={`/client/services/${service.id}`} className="flex-1 rounded-xl bg-[#0B6B50] px-4 py-2.5 text-center text-sm font-black text-white">Voir</Link><button onClick={() => removeFavorite(favorite)} className="grid h-10 w-11 place-items-center rounded-xl bg-[#FFF0EE] text-[#C64A3F]" aria-label="Retirer des favoris"><AppIcon name="heart" className="h-5 w-5" /></button></div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
