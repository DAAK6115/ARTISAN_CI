import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';
import ArtisanNavbar from '../../components/ArtisanNavbar';
import ArtisanMap from '../../components/ArtisanMap';

export default function ArtisanPortfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [items, setItems] = useState([]);
  const [image, setImage] = useState(null);
  const [description, setDescription] = useState('');
  const [titre, setTitre] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPortfolio = async () => {
    try {
      const res = await axios.get('/portfolio/me/');
      setPortfolio(res.data);
      setItems(res.data.realisations);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updatePosition = async (latitude, longitude) => {
    try {
      await axios.patch('/portfolio/me/', {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      });
      fetchPortfolio();
    } catch (err) {
      console.error("❌ Erreur enregistrement position:", err);
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          updatePosition(latitude, longitude);
        },
        (err) => {
          console.error("⛔ Accès refusé ou indisponible:", err);
        }
      );
    } else {
      console.error("🌐 La géolocalisation n'est pas supportée par ce navigateur.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    if (image) formData.append('image', image);
    formData.append('description', description);
    formData.append('titre', titre);

    try {
      if (editingId) {
        await axios.put(`/portfolio/realisation/${editingId}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage("Mise à jour réussie ✅");
      } else {
        await axios.post('/portfolio/realisation/add/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage("Ajouté avec succès ✅");
      }
      setImage(null);
      setDescription('');
      setTitre('');
      setEditingId(null);
      fetchPortfolio();
    } catch (err) {
      console.error(err);
      setMessage("Erreur lors de la sauvegarde ❌");
    }
  };

  const handleEdit = (item) => {
    setTitre(item.titre);
    setDescription(item.description);
    setEditingId(item.id);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer cette réalisation ?")) {
      try {
        await axios.delete(`/portfolio/realisation/${id}/`);
        fetchPortfolio();
      } catch (err) {
        console.error(err);
        setMessage("Erreur lors de la suppression ❌");
      }
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  return (
    <div>
      <ArtisanNavbar />
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Mon Portfolio</h2>

        {portfolio && (
          <div className="mb-6 bg-gray-100 p-4 rounded">
            {portfolio.photo_couverture && (
              <img
                src={portfolio.photo_couverture}
                alt="Couverture"
                className="w-full max-h-60 object-cover rounded mb-3"
              />
            )}
            <p className="text-lg font-semibold mb-1">{portfolio.bio}</p>
            <p className="text-sm text-gray-600">📍 {portfolio.localisation}</p>
            <div className="text-sm text-blue-600 space-x-4 mt-2">
              {portfolio.site_web && <a href={portfolio.site_web} target="_blank" rel="noreferrer">🌐 Site</a>}
              {portfolio.facebook && <a href={portfolio.facebook} target="_blank" rel="noreferrer">📘 Facebook</a>}
              {portfolio.whatsapp && <a href={`https://wa.me/${portfolio.whatsapp}`} target="_blank" rel="noreferrer">💬 WhatsApp</a>}
            </div>
            {portfolio.latitude && portfolio.longitude && (
              <div className="my-4">
                <ArtisanMap latitude={portfolio.latitude} longitude={portfolio.longitude} />
              </div>
            )}
            <p className="text-xs mt-2 italic">{portfolio.visible ? "Visible publiquement" : "Portfolio privé"}</p>
            <button onClick={getLocation} className="mt-3 text-sm text-indigo-600 hover:underline">
              📍 Mettre à jour ma position actuelle
            </button>
          </div>
        )}

        {message && <p className="text-center text-blue-600 mb-4">{message}</p>}

        <form onSubmit={handleSubmit} className="grid gap-4 mb-6">
          <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} className="border p-2 rounded" />
          <input type="text" placeholder="Titre" value={titre} onChange={(e) => setTitre(e.target.value)} className="border p-2 rounded" />
          <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="border p-2 rounded" />
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            {editingId ? 'Mettre à jour' : 'Ajouter'}
          </button>
        </form>

        {loading ? (
          <p>Chargement des réalisations...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.id} className="border rounded p-4 shadow bg-white">
                {item.image && (
                  <img src={item.image} alt="Réalisation" className="w-full h-48 object-cover rounded mb-2" />
                )}
                <h4 className="text-md font-semibold">{item.titre}</h4>
                <p className="text-sm text-gray-600">{item.description}</p>
                <div className="flex justify-end gap-4 mt-2">
                  <button onClick={() => handleEdit(item)} className="text-blue-600 text-sm hover:underline">Modifier</button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-500 text-sm hover:underline">Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
