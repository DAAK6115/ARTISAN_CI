import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Link, useNavigate } from 'react-router-dom';

// Corriger les icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// 🔴 Icône rouge pour la position utilisateur
const redIcon = new L.Icon({
  iconUrl: '/icons/marker-icon-red.png',  // depuis public/
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  shadowSize: [41, 41],
});


// 📏 Fonction Haversine pour calcul de distance en km
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2);
}

export default function ArtisansList() {
  const [artisans, setArtisans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [position, setPosition] = useState(null);
  const navigate = useNavigate();

  const artisansManuels = [
    {
      id: 'manuel1',
      artisan_nom: 'Fatou',
      bio: 'Coiffeuse spécialisée en tresses africaines',
      latitude: 5.3795052,
      longitude: -3.9357957,
    },
    {
      id: 'manuel2',
      artisan_nom: 'Mamadou',
      bio: 'Menuisier expérimenté',
      latitude: 5.3787895,
      longitude: -3.9375445,
    },
    {
      id: 'manuel3',
      artisan_nom: 'Koffi',
      bio: 'Mécanicien auto et moto',
      latitude: 5.2232097,
      longitude: -3.7344628,
    },
    {
      id: 'manuel4',
      artisan_nom: 'Aïcha',
      bio: 'Couturière de tenues traditionnelles',
      latitude: 5.2227693,
      longitude: -3.7282347,
    },
    {
      id: 'manuel5',
      artisan_nom: 'Serge',
      bio: 'Plombier certifié',
      latitude: 5.3680932,
      longitude: -3.9462030,
    },
    {
      id: 'manuel6',
      artisan_nom: 'Marius',
      bio: 'Électricien bâtiment',
      latitude: 5.3682360,
      longitude: -3.9470735,
    },
    {
      id: 'manuel7',
      artisan_nom: 'Nadia',
      bio: 'Esthéticienne et maquilleuse professionnelle',
      latitude: 5.3792023,
      longitude: -3.9360001,
    },
  ];

  const allArtisans = [...artisans, ...artisansManuels];

  const fetchArtisans = () => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const userPos = [coords.latitude, coords.longitude];
        setPosition(userPos);
        try {
          const res = await axios.get('/portfolio/map/', {
            params: { lat: coords.latitude, lng: coords.longitude, radius: 1000 }
          });
          setArtisans(res.data);
        } catch (err) {
          console.error("Erreur lors du chargement des artisans :", err);
          setMessage("Impossible de récupérer les artisans.");
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Erreur de géolocalisation :", error);
        setMessage("Autorisez la géolocalisation pour voir les artisans proches.");
        setLoading(false);
      }
    );
  };

  const handleContact = (artisanId) => {
    navigate(`/client/chat/${artisanId}`);
  };

  useEffect(() => {
    fetchArtisans();
  }, []);

  return (
    <div className="flex flex-col p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">🔍 Artisans proches de vous</h1>

      {message && <p className="text-red-500 mb-4">{message}</p>}

      {position && (
        <MapContainer center={position} zoom={13} style={{ height: '400px', marginBottom: '30px', borderRadius: '10px' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* 📍 Ta position (en rouge) */}
          <Marker position={position} icon={redIcon}>
            <Popup>
              <strong>📍 Vous êtes ici</strong><br />
              {position[0].toFixed(5)}, {position[1].toFixed(5)}<br />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${position[0]},${position[1]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                🌍 Voir dans Google Maps
              </a>
            </Popup>
          </Marker>

          {/* 🧑 Artisans */}
          {allArtisans.map((artisan) => {
            const distanceKm = getDistanceKm(position[0], position[1], artisan.latitude, artisan.longitude);
            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${position[0]},${position[1]}&destination=${artisan.latitude},${artisan.longitude}`;

            return (
              <Marker key={artisan.id} position={[artisan.latitude, artisan.longitude]}>
                <Popup>
                  <strong>{artisan.artisan_nom}</strong><br />
                  {artisan.bio}<br />
                  📏 {distanceKm} km<br />
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline block mt-1"
                  >
                    🗺️ Itinéraire
                  </a>
                  {artisan.artisan_id && (
                    <button
                      onClick={() => handleContact(artisan.artisan_id)}
                      className="text-blue-600 underline mt-1 block"
                    >
                      💬 Contacter
                    </button>
                  )}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      )}

      {/* Liste des artisans */}
      {!loading && allArtisans.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mb-4">🧑‍🔧 Liste des artisans</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {allArtisans.map((artisan) => {
              const distanceKm = position
                ? getDistanceKm(position[0], position[1], artisan.latitude, artisan.longitude)
                : null;

              const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${artisan.latitude},${artisan.longitude}`;

              return (
                <div key={artisan.id} className="bg-white shadow-md rounded-lg p-4">
                  <h3 className="font-semibold text-lg">{artisan.artisan_nom}</h3>
                  <p className="text-sm text-gray-600 mb-1 italic">{artisan.bio}</p>
                  <p className="text-sm text-gray-500 mb-2">
                    📍
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline ml-1"
                    >
                      {artisan.latitude.toFixed(4)}, {artisan.longitude.toFixed(4)}
                    </a>
                  </p>
                  {distanceKm && (
                    <p className="text-sm text-green-600">📏 À {distanceKm} km</p>
                  )}
                  {artisan.artisan_id && (
                    <div className="flex justify-between items-center mt-2">
                      <Link
                        to={`/artisans/${artisan.artisan_nom}`}
                        className="text-blue-600 text-sm underline hover:text-blue-800"
                      >
                        👁️ Voir le profil
                      </Link>
                      <button
                        onClick={() => handleContact(artisan.artisan_id)}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        💬 Contacter
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
