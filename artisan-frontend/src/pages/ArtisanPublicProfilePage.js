import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../utils/axiosInstance';
import ArtisanMap from '../components/ArtisanMap';

export default function ArtisanPublicProfilePage() {
  const { username } = useParams();
  const [portfolio, setPortfolio] = useState(null);
  const [certifications, setCertifications] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAllInfos = async () => {
    try {
      const resPortfolio = await axios.get(`/portfolio/artisans/${username}/`);
      const resCertifs = await axios.get(`/certifications/artisan/${username}/`);
      const resReviews = await axios.get(`/reviews/artisan/${username}/`);
      setPortfolio(resPortfolio.data);
      setCertifications(resCertifs.data);
      setReviews(resReviews.data);

      if (resReviews.data.length > 0) {
        const total = resReviews.data.reduce((sum, review) => sum + review.note, 0);
        setAverageRating((total / resReviews.data.length).toFixed(1));
      } else {
        setAverageRating(0);
      }
    } catch (err) {
      console.error("Erreur de chargement du profil :", err);
      setMessage("Impossible de charger le profil.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllInfos();
  }, [username]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Profil de {username}</h1>

      {message && <p className="text-red-500 mb-4">{message}</p>}

      {loading ? (
        <p>Chargement...</p>
      ) : portfolio ? (
        <div className="space-y-6">
          {/* Profil */}
          <div className="bg-white rounded shadow p-4">
            {portfolio.photo_couverture && (
              <img src={portfolio.photo_couverture} alt="Couverture" className="w-full h-60 object-cover rounded mb-3" />
            )}
            <h2 className="text-xl font-bold">{portfolio.artisan_nom}</h2>
            <p className="text-sm italic text-gray-600">{portfolio.bio}</p>

            {portfolio.localisation && <p className="text-sm text-gray-500 mt-2">📍 {portfolio.localisation}</p>}

            {portfolio.latitude && portfolio.longitude && (
              <div className="my-3">
                <ArtisanMap latitude={portfolio.latitude} longitude={portfolio.longitude} />
              </div>
            )}

            <div className="text-sm text-blue-600 space-x-4 mt-2">
              {portfolio.site_web && <a href={portfolio.site_web} target="_blank" rel="noreferrer">🌐 Site web</a>}
              {portfolio.facebook && <a href={portfolio.facebook} target="_blank" rel="noreferrer">📘 Facebook</a>}
              {portfolio.whatsapp && (
                <a href={`https://wa.me/${portfolio.whatsapp}`} target="_blank" rel="noreferrer" className="bg-green-500 text-white text-xs px-3 py-1 rounded inline-block">
                  💬 WhatsApp
                </a>
              )}
              {/* ✅ Bouton Discuter */}
              <button
                onClick={() => window.location.href = `/messagerie/${username}`}
                className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700"
              >
                💬 Discuter avec {portfolio.artisan_nom}
              </button>
            </div>
          </div>

          {/* Certifications */}
          <div className="bg-white rounded shadow p-4">
            <h3 className="text-lg font-semibold mb-3">📜 Certifications</h3>
            {certifications.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune certification.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {certifications.map(c => (
                  <li key={c.id}>
                    <strong>{c.nom}</strong> – {c.organisme}
                    {c.valide_jusquau && (
                      <span className="text-xs text-gray-500"> (jusqu’au {c.valide_jusquau})</span>
                    )}
                    {c.fichier && (
                      <a href={c.fichier} target="_blank" rel="noreferrer" className="ml-2 text-blue-500 underline">
                        📄 Voir le fichier
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Réalisations */}
          <div className="bg-white rounded shadow p-4">
            <h3 className="text-lg font-semibold mb-3">🎨 Réalisations</h3>
            {portfolio.realisations.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune réalisation.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {portfolio.realisations.map(r => (
                  <div key={r.id} className="border rounded p-2 bg-gray-50 shadow-sm">
                    <img src={r.image} alt={r.titre} className="w-full h-40 object-cover rounded mb-2" />
                    <h4 className="font-semibold text-sm">{r.titre}</h4>
                    <p className="text-xs text-gray-500">{r.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Avis */}
          <div className="bg-white rounded shadow p-4">
            <h3 className="text-lg font-semibold mb-3">⭐ Avis clients</h3>
            {reviews.length === 0 ? (
              <p className="text-sm text-gray-500">Pas encore d’avis.</p>
            ) : (
              <>
                <p className="text-sm text-yellow-600 font-semibold mb-3">Note moyenne : {averageRating} / 5</p>
                <ul className="space-y-4">
                  {reviews.map(r => (
                    <li key={r.id} className="border rounded p-3 bg-gray-50">
                      <p className="text-sm"><strong>{r.client}</strong> : {r.commentaire}</p>
                      <p className="text-xs text-yellow-600">Note : {r.note} / 5</p>
                      <p className="text-xs text-gray-400">{new Date(r.date_creation).toLocaleDateString()}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      ) : (
        <p>Profil indisponible.</p>
      )}
    </div>
  );
}
