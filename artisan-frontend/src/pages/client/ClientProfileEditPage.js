import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';
import { useNavigate } from 'react-router-dom';

export default function ClientProfileEditPage() {
  const [formData, setFormData] = useState({
    username: '',
    numero_momo: '',
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const fetchClientProfile = async () => {
    try {
      const res = await axios.get('/accounts/profile/me/');
      setFormData({
        username: res.data.username,
        numero_momo: res.data.numero_momo || '',
      });
    } catch (err) {
      console.error('Erreur chargement profil :', err);
      setMessage("❌ Impossible de charger votre profil.");
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put('/accounts/profile/update/', formData);
      setMessage("✅ Profil mis à jour avec succès !");
      setTimeout(() => {
        navigate('/client/profil');
      }, 2000);
    } catch (err) {
      console.error('Erreur mise à jour :', err);
      setMessage("❌ Une erreur est survenue.");
    }
  };

  useEffect(() => {
    fetchClientProfile();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-xl mx-auto bg-white rounded shadow p-6">
        <h1 className="text-2xl font-bold mb-4">✏️ Modifier mon profil</h1>

        {message && <p className="text-center text-blue-600 mb-4">{message}</p>}

        {loading ? (
          <p>Chargement...</p>
        ) : (
          <form onSubmit={updateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom d’utilisateur
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro MoMo
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={formData.numero_momo}
                onChange={(e) => setFormData({ ...formData, numero_momo: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
            >
              💾 Enregistrer les modifications
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
