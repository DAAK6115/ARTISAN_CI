import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosInstance';

export default function ServicesList() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState('');
  const [minPrix, setMinPrix] = useState('');
  const [maxPrix, setMaxPrix] = useState('');

  const fetchServices = () => {
    axios.get('/services/')
      .then(res => setServices(res.data))
      .catch(err => {
        console.error("Erreur de chargement :", err);
        setMessage("❌ Impossible de charger les prestations.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const toggleLike = (serviceId) => {
    axios.post(`/likes/toggle/${serviceId}/`)
      .then(() => {
        setServices(prev =>
          prev.map(s =>
            s.id === serviceId ? { ...s, is_liked: !s.is_liked } : s
          )
        );
      })
      .catch(err => {
        console.error("Erreur lors du like/dislike :", err);
        setMessage("⚠️ Action impossible. Veuillez réessayer.");
      });
  };

  const toggleFavori = (serviceId) => {
    axios.post(`/favoris/toggle/${serviceId}/`)
      .then(() => {
        setServices(prev =>
          prev.map(s =>
            s.id === serviceId ? { ...s, is_favori: !s.is_favori } : s
          )
        );
      })
      .catch(err => {
        console.error("Erreur lors du favori :", err);
        setMessage("⚠️ Impossible d’ajouter aux favoris.");
      });
  };

  // 🔍 Filtrage combiné (catégorie + prix)
  const filteredServices = services.filter(service => {
    const matchCategorie = selectedCategorie ? service.categorie === selectedCategorie : true;
    const matchPrixMin = minPrix ? service.prix >= parseFloat(minPrix) : true;
    const matchPrixMax = maxPrix ? service.prix <= parseFloat(maxPrix) : true;
    return matchCategorie && matchPrixMin && matchPrixMax;
  });

  return (
    <div className="flex">
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-4">🎯 Prestations disponibles</h1>

        {message && <p className="text-red-600 mb-4">{message}</p>}

        {/* 🔍 Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Filtre par catégorie */}
          <div>
            <label htmlFor="categorie" className="block mb-1 font-medium">Catégorie</label>
            <select
              id="categorie"
              className="w-full border rounded p-2"
              value={selectedCategorie}
              onChange={e => setSelectedCategorie(e.target.value)}
            >
              <option value="">Toutes</option>
              <option value="alimentation">Alimentation</option>
              <option value="artisanat_d_art">Artisanat d’Art</option>
              <option value="btp">Bâtiment et Travaux Publics</option>
              <option value="bois">Bois et dérivés</option>
              <option value="cuir">Cuir et Peaux</option>
              <option value="coiffure_esthetique">Coiffure et Esthétique</option>
              <option value="couture_habillement">Couture et Habillement</option>
              <option value="electronique">Électronique et Électromécanique</option>
              <option value="energie_renouvelable">Énergie Renouvelable</option>
              <option value="mecanique_auto">Mécanique et Réparation Automobile</option>
              <option value="metallurgie_soudure">Métallurgie et Soudure</option>
              <option value="savonnerie">Savonnerie</option>
              <option value="serigraphie">Sérigraphie et Impression</option>
              <option value="services_numeriques">Services Numériques</option>
              <option value="transport">Transport et Logistique Artisanale</option>
            </select>
          </div>

          {/* Fourchette de prix */}
          <div className="flex space-x-2">
            <div className="flex-1">
              <label htmlFor="minPrix" className="block mb-1 font-medium">Prix min</label>
              <input
                type="number"
                id="minPrix"
                value={minPrix}
                onChange={e => setMinPrix(e.target.value)}
                className="w-full border rounded p-2"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="maxPrix" className="block mb-1 font-medium">Prix max</label>
              <input
                type="number"
                id="maxPrix"
                value={maxPrix}
                onChange={e => setMaxPrix(e.target.value)}
                className="w-full border rounded p-2"
              />
            </div>
          </div>
        </div>

        {/* Résultats */}
        {loading ? (
          <p>Chargement...</p>
        ) : filteredServices.length === 0 ? (
          <p className="text-gray-500">Aucune prestation ne correspond à vos critères.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map(service => (
              <div key={service.id} className="border p-4 rounded shadow bg-white relative">
                {service.image && (
                  <img
                    src={service.image}
                    alt={service.titre}
                    className="w-full h-40 object-cover rounded mb-3"
                  />
                )}
                <h2 className="font-semibold text-lg">{service.titre}</h2>
                <p className="text-sm text-gray-600">{service.categorie}</p>
                <p className="text-gray-800 font-bold mt-1">{service.prix} FCFA</p>

                {service.moyenne_avis && (
                  <p className="text-sm text-yellow-600 mt-1">⭐ {service.moyenne_avis} / 5</p>
                )}

                <p className="text-sm mt-1">
                  Artisan :{' '}
                  <Link
                    to={`/artisans/${service.artisan_username}`}
                    className="text-blue-500 hover:underline"
                  >
                    Voir le profil
                  </Link>
                </p>

                <div className="flex justify-between items-center mt-3">
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
                      className={`text-sm px-2 py-1 rounded ${service.is_favori ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {service.is_favori ? '🔖 Retirer' : '📌 Favori'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
