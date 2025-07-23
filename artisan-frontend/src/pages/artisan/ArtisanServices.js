import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';
import ArtisanNavbar from '../../components/ArtisanNavbar';

export default function ArtisanServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newService, setNewService] = useState({ titre: '', description: '', prix: '', categorie: '', image: null });
  const [message, setMessage] = useState('');
  const [editingService, setEditingService] = useState(null);

  // Liste des catégories prédéfinies
  const categoriesOptions = [
    { value: 'alimentation', label: 'Alimentation' },
    { value: 'artisanat_d_art', label: 'Artisanat d’Art' },
    { value: 'btp', label: 'Bâtiment et Travaux Publics' },
    { value: 'bois', label: 'Bois et dérivés' },
    { value: 'cuir', label: 'Cuir et Peaux' },
    { value: 'coiffure_esthetique', label: 'Coiffure et Esthétique' },
    { value: 'couture_habillement', label: 'Couture et Habillement' },
    { value: 'electronique', label: 'Électronique et Électromécanique' },
    { value: 'energie_renouvelable', label: 'Énergie Renouvelable' },
    { value: 'mecanique_auto', label: 'Mécanique et Réparation Automobile' },
    { value: 'metallurgie_soudure', label: 'Métallurgie et Soudure' },
    { value: 'savonnerie', label: 'Production de savon et produits ménagers' },
    { value: 'serigraphie', label: 'Sérigraphie et Impression' },
    { value: 'services_numeriques', label: 'Services Numériques' },
    { value: 'transport', label: 'Transport et Logistique Artisanale' },
  ];

  const fetchServices = async () => {
    try {
      const res = await axios.get('/services/mes-prestations/');
      setServices(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const generateDescription = async (titre) => {
    if (!titre || newService.description) return;
    try {
      const res = await axios.post('/services/generer-description/', { titre });
      if (res.data.description) {
        setNewService((prev) => ({ ...prev, description: res.data.description }));
        setMessage("✅ Description générée automatiquement");
      }
    } catch (err) {
      console.error("Erreur IA:", err);
      setMessage("❌ Impossible de générer la description.");
    }
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('titre', newService.titre);
    formData.append('description', newService.description);
    formData.append('prix', newService.prix);
    formData.append('categorie', newService.categorie);
    if (newService.image) {
      formData.append('image', newService.image);
    }

    try {
      if (editingService) {
        await axios.put(`/services/${editingService.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage("✅ Prestation mise à jour");
      } else {
        await axios.post('/services/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage("✅ Prestation ajoutée");
      }

      setNewService({ titre: '', description: '', prix: '', categorie: '', image: null });
      setEditingService(null);
      fetchServices();
    } catch (err) {
      console.error(err);
      setMessage("❌ Erreur lors de l’enregistrement.");
    }
  };

  const handleEdit = (service) => {
    setNewService({
      titre: service.titre,
      description: service.description,
      prix: service.prix,
      categorie: service.categorie,
      image: null,
    });
    setEditingService(service);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer cette prestation ?")) {
      try {
        await axios.delete(`/services/${id}/`);
        fetchServices();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div>
      <ArtisanNavbar />
      <div className="pt-24 p-6">
        <h2 className="text-xl font-bold mb-4">🛠 Mes Prestations</h2>

        <form onSubmit={handleCreateOrUpdate} className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Titre"
            className="border p-2 rounded"
            value={newService.titre}
            onChange={(e) => {
              const titre = e.target.value;
              setNewService({ ...newService, titre });
              generateDescription(titre);
            }}
            required
          />
          <input
            type="text"
            placeholder="Description"
            className="border p-2 rounded"
            value={newService.description}
            onChange={(e) => setNewService({ ...newService, description: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Prix"
            className="border p-2 rounded"
            value={newService.prix}
            onChange={(e) => setNewService({ ...newService, prix: e.target.value })}
            required
          />

          {/* ✅ Menu déroulant des catégories */}
          <select
            className="border p-2 rounded col-span-full"
            value={newService.categorie}
            onChange={(e) => setNewService({ ...newService, categorie: e.target.value })}
            required
          >
            <option value="">-- Sélectionnez une catégorie --</option>
            {categoriesOptions.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <input
            type="file"
            accept="image/*"
            className="border p-2 rounded col-span-full"
            onChange={(e) => setNewService({ ...newService, image: e.target.files[0] })}
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded col-span-full hover:bg-blue-700">
            {editingService ? 'Mettre à jour' : 'Ajouter'}
          </button>
        </form>

        {message && <p className="text-sm mb-4 text-center text-blue-600">{message}</p>}

        {loading ? (
          <p>Chargement des prestations...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <div key={service.id} className="border rounded p-4 shadow bg-white">
                <h3 className="font-bold text-lg">{service.titre}</h3>
                <p className="text-sm text-gray-600">{service.description}</p>
                <p className="text-green-700 font-semibold mt-2">{service.prix} FCFA</p>
                <p className="text-sm italic text-gray-400">Catégorie : {service.categorie}</p>
                {service.image && (
                  <img src={service.image} alt={service.titre} className="mt-2 rounded max-h-40 object-cover w-full" />
                )}
                <div className="mt-3 flex justify-end space-x-2">
                  <button onClick={() => handleEdit(service)} className="text-blue-600 text-sm hover:underline">Modifier</button>
                  <button onClick={() => handleDelete(service.id)} className="text-red-500 text-sm hover:underline">Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
