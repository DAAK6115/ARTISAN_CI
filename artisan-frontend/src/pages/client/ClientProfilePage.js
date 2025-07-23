import { useState, useEffect } from 'react';
import axios from '../../utils/axiosInstance';
import ClientNavbar from '../../components/ClientNavbar';

export default function ClientProfilePage() {
  const [profile, setProfile] = useState(null);
  const [favoris, setFavoris] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchProfile = async () => {
    try {
      const res = await axios.get('/accounts/profile/me/');
      setProfile(res.data);
    } catch (err) {
      console.error('Erreur lors du chargement du profil :', err);
      setMessage("❌ Impossible de récupérer le profil.");
    }
  };

  const fetchFavoris = async () => {
    try {
      const res = await axios.get('/favoris/mes/');
      setFavoris(res.data);
    } catch (err) {
      console.error('Erreur lors du chargement des favoris :', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchProfile(), fetchFavoris()]);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) return <p className="text-center mt-10">Chargement...</p>;

  return (
    <div className="min-h-screen bg-gray-100">

      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">👤 Mon Profil Client</h1>

        {message && <p className="text-red-500 mb-4 text-center">{message}</p>}

        {profile ? (
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 text-sm">Nom d’utilisateur :</p>
                <p className="font-semibold text-lg">{profile.username}</p>
              </div>

              <div>
                <p className="text-gray-600 text-sm">Email :</p>
                <p className="text-md">{profile.email}</p>
              </div>

              <div>
                <p className="text-gray-600 text-sm">Rôle :</p>
                <p className="capitalize text-md">{profile.role}</p>
              </div>

              <div>
                <p className="text-gray-600 text-sm">Numéro MoMo :</p>
                <p className="text-md">{profile.numero_momo || 'Non renseigné'}</p>
              </div>
            </div>

            {profile.qr_wave && (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 mb-1">QR Code Wave :</p>
                <img src={profile.qr_wave} alt="QR Code" className="mx-auto w-40 h-40 object-contain rounded border" />
              </div>
            )}

            <div className="text-center mt-6">
              <button
                onClick={() => window.location.href = '/client/profil/edit'}
                className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
              >
                ✏️ Modifier mes informations
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center">Aucune donnée de profil disponible.</p>
        )}

        {/* 🌟 Section Favoris */}
        <div className="mt-10">
          <h2 className="text-2xl font-semibold mb-4 text-blue-700">❤️ Mes Favoris</h2>
          {favoris.length === 0 ? (
            <p className="text-gray-500 italic">Vous n’avez pas encore ajouté de favoris.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {favoris.map((fav) => (
                <div key={fav.id} className="bg-white p-4 rounded shadow hover:shadow-md transition">
                  {fav.photo && (
                    <img
                      src={fav.photo}
                      alt="Image"
                      className="w-full h-40 object-cover rounded mb-3"
                    />
                  )}
                  <h3 className="text-lg font-bold">{fav.titre || fav.nom}</h3>
                  <p className="text-sm text-gray-500 italic">{fav.description || 'Service favori'}</p>
                  <p className="text-sm text-gray-600 mt-1">Artisan : <strong>{fav.artisan_nom}</strong></p>
                  <a
                    href={`/artisans/${fav.artisan_nom}`}
                    className="text-blue-600 text-sm underline hover:text-blue-800 mt-2 inline-block"
                  >
                    👁️ Voir l'artisan
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
