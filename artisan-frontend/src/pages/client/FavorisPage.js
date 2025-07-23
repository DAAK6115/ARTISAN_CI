import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosInstance';

export default function FavorisPage() {
  const [favoris, setFavoris] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Fonction pour récupérer les favoris
  const fetchFavoris = async () => {
    try {
      const res = await axios.get('/favoris/mes/');
      const favorisBruts = res.data;
  
      // Charger les détails pour chaque service
      const favorisDetails = await Promise.all(
        favorisBruts.map(async (fav) => {
          const serviceRes = await axios.get(`/services/${fav.service}/`);
          return serviceRes.data;
        })
      );
  
      console.log("Détails des services :", favorisDetails);
      setFavoris(favorisDetails);
    } catch (err) {
      console.error("Erreur de chargement des favoris :", err);
      setMessage("❌ Impossible de charger vos favoris.");
    } finally {
      setLoading(false);
    }
  };
  

  useEffect(() => {
    fetchFavoris();
  }, []);

  // Toggle like
  const toggleLike = (serviceId) => {
    axios.post(`/likes/toggle/${serviceId}/`)
      .then(() => {
        setFavoris(prev => prev.map(service =>
          service.id === serviceId ? { ...service, is_liked: !service.is_liked } : service
        ));
      })
      .catch(err => {
        console.error("Erreur lors du like/dislike :", err);
        setMessage("⚠️ Action impossible. Veuillez réessayer.");
      });
  };

  // Retirer des favoris
  const toggleFavori = (serviceId) => {
    axios.post(`/favoris/toggle/${serviceId}/`)
      .then(() => {
        setFavoris(prev => prev.filter(s => s.id !== serviceId));
      })
      .catch(err => {
        console.error("Erreur lors du retrait du favori :", err);
        setMessage("⚠️ Impossible de modifier les favoris.");
      });
  };

  return (
    <div className="flex">
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-4">📌 Mes Favoris</h1>

        {message && <p className="text-red-600 mb-4">{message}</p>}

        {loading ? (
          <p>Chargement en cours...</p>
        ) : favoris.length === 0 ? (
          <p className="text-gray-500">Aucun service enregistré dans vos favoris.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoris.map(service => {
              console.log("Service complet :", JSON.stringify(service, null, 2));  // 👉 Debug pour chaque item

              return (
                <div key={service.id} className="border rounded shadow bg-white overflow-hidden flex flex-col h-full">
                  {/* Affichage de l'image ou d'un placeholder */}
                  {service.image ? (
                    <img src={service.image} alt={service.titre || 'Service'} className="w-full h-48 object-cover" />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400">
                      Pas d'image disponible
                    </div>
                  )}

                  <div className="p-4 flex flex-col flex-1">
                    <h2 className="font-semibold text-lg mb-1">{service.titre || 'Titre non fourni'}</h2>
                    <p className="text-sm text-gray-600 mb-2">{service.categorie || 'Catégorie non renseignée'}</p>
                    <p className="text-sm text-gray-700 mb-2">{service.description || 'Aucune description disponible.'}</p>
                    <p className="text-gray-800 font-bold mb-2">{service.prix ? `${service.prix} FCFA` : 'Prix non spécifié'}</p>

                    {service.moyenne_avis && (
                      <p className="text-sm text-yellow-600 mb-2">⭐ {service.moyenne_avis} / 5</p>
                    )}

                    {service.artisan_nom && (
                      <Link to={`/artisans/${service.artisan_nom}`} className="text-blue-600 text-xs mb-2 hover:underline">
                        👤 Voir le profil de {service.artisan_nom}
                      </Link>
                    )}

                    <div className="mt-auto flex justify-between items-center">
                      <Link
                        to={`/client/services/${service.id}`}
                        className="text-blue-500 hover:underline text-sm"
                      >
                        🔍 Voir les détails
                      </Link>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => toggleLike(service.id)}
                          className={`text-sm px-2 py-1 rounded ${service.is_liked ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}
                        >
                          {service.is_liked ? '❤️' : '🤍'}
                        </button>

                        <button
                          onClick={() => toggleFavori(service.id)}
                          className="text-sm px-2 py-1 rounded bg-yellow-100 text-yellow-700"
                        >
                          📌 Retirer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
