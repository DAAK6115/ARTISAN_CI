import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';
import useAutoRefresh from '../../hooks/useAutoRefresh';

const EMPTY_SERVICE = {
  titre: '',
  description: '',
  prix: '',
  categorie: '',
  image: null,
  duree_minutes: 60,
  delai_reservation_heures: 2,
  mode_intervention: 'chez_client',
  rayon_intervention_km: '',
  mode_tarification: 'fixe',
};

const CATEGORIES = [
  ['alimentation', 'Alimentation'],
  ['artisanat_d_art', 'Artisanat d’Art'],
  ['btp', 'Bâtiment et Travaux Publics'],
  ['bois', 'Bois et dérivés'],
  ['cuir', 'Cuir et Peaux'],
  ['coiffure_esthetique', 'Coiffure et Esthétique'],
  ['couture_habillement', 'Couture et Habillement'],
  ['electronique', 'Électronique et Électromécanique'],
  ['energie_renouvelable', 'Énergie Renouvelable'],
  ['mecanique_auto', 'Mécanique et Réparation Automobile'],
  ['metallurgie_soudure', 'Métallurgie et Soudure'],
  ['savonnerie', 'Production de savon et produits ménagers'],
  ['serigraphie', 'Sérigraphie et Impression'],
  ['services_numeriques', 'Services Numériques'],
  ['transport', 'Transport et Logistique Artisanale'],
];

function apiErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (data.error) return data.error;
  if (data.detail) return data.detail;
  const first = Object.values(data).flat()[0];
  return typeof first === 'string' ? first : fallback;
}

export default function ArtisanServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newService, setNewService] = useState(EMPTY_SERVICE);
  const [message, setMessage] = useState('');
  const [editingService, setEditingService] = useState(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);

  const fetchServices = async (silent = false) => {
    try {
      const response = await axios.get('/services/mes-prestations/');
      setServices(response.data);
    } catch (error) {
      setMessage(`❌ ${apiErrorMessage(error, 'Impossible de charger les prestations.')}`);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);
  useAutoRefresh(() => fetchServices(true), { intervalMs: 20000 });

  const generateDescription = async () => {
    if (!newService.titre.trim()) {
      setMessage('❌ Saisissez d’abord un titre.');
      return;
    }
    setGeneratingDescription(true);
    try {
      const response = await axios.post('/services/generer-description/', {
        titre: newService.titre.trim(),
      });
      if (response.data.description) {
        setNewService((previous) => ({
          ...previous,
          description: response.data.description,
        }));
        setMessage('✅ Description générée automatiquement.');
      }
    } catch (error) {
      setMessage(`❌ ${apiErrorMessage(error, 'Impossible de générer la description.')}`);
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleCreateOrUpdate = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('titre', newService.titre.trim());
    formData.append('description', newService.description.trim());
    formData.append('prix', newService.prix);
    formData.append('categorie', newService.categorie);
    formData.append('duree_minutes', newService.duree_minutes);
    formData.append('delai_reservation_heures', newService.delai_reservation_heures);
    formData.append('mode_intervention', newService.mode_intervention);
    formData.append('mode_tarification', newService.mode_tarification);
    if (newService.rayon_intervention_km !== '') {
      formData.append('rayon_intervention_km', newService.rayon_intervention_km);
    }
    if (newService.image) formData.append('image', newService.image);

    try {
      if (editingService) {
        await axios.patch(`/services/${editingService.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage('✅ Prestation mise à jour.');
      } else {
        await axios.post('/services/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage('✅ Prestation ajoutée.');
      }

      setNewService(EMPTY_SERVICE);
      setEditingService(null);
      await fetchServices();
    } catch (error) {
      setMessage(`❌ ${apiErrorMessage(error, "Erreur lors de l'enregistrement.")}`);
    }
  };

  const handleEdit = (service) => {
    setNewService({
      titre: service.titre,
      description: service.description,
      prix: service.prix,
      categorie: service.categorie,
      image: null,
      duree_minutes: service.duree_minutes || 60,
      delai_reservation_heures: service.delai_reservation_heures ?? 2,
      mode_intervention: service.mode_intervention || 'chez_client',
      rayon_intervention_km: service.rayon_intervention_km || '',
      mode_tarification: service.mode_tarification || 'fixe',
    });
    setEditingService(service);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette prestation ?')) return;
    try {
      await axios.delete(`/services/${id}/`);
      setMessage('✅ Prestation supprimée.');
      await fetchServices();
    } catch (error) {
      setMessage(`❌ ${apiErrorMessage(error, 'Suppression impossible.')}`);
    }
  };

  return (
    <div className="mx-auto max-w-[1350px] p-4 pb-28 sm:p-6 lg:pb-8">
      <div className="mb-6"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#0B6B50]">Catalogue professionnel</p><h2 className="mt-2 text-3xl font-black tracking-tight">Mes prestations</h2><p className="mt-2 text-sm text-[#718078]">Définissez clairement vos services, tarifs, durée et zone d’intervention.</p></div>

      <form onSubmit={handleCreateOrUpdate} className="mb-8 grid grid-cols-1 gap-4 rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_8px_28px_rgba(30,45,37,0.05)] sm:grid-cols-2 sm:p-6">
        <div>
          <label className="block text-sm font-medium mb-1">Titre</label>
          <input
            type="text"
            className="border p-2 rounded w-full"
            value={newService.titre}
            onChange={(event) => setNewService({ ...newService, titre: event.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{newService.mode_tarification === 'sur_devis' ? 'Prix indicatif (FCFA, 0 autorisé)' : 'Prix (FCFA)'}</label>
          <input
            type="number"
            min={newService.mode_tarification === 'sur_devis' ? '0' : '1'}
            className="border p-2 rounded w-full"
            value={newService.prix}
            onChange={(event) => setNewService({ ...newService, prix: event.target.value })}
            required
          />
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium">Description</label>
            <button
              type="button"
              onClick={generateDescription}
              disabled={generatingDescription}
              className="text-sm text-blue-600 hover:underline disabled:text-gray-400"
            >
              {generatingDescription ? 'Génération...' : '✨ Générer avec IA'}
            </button>
          </div>
          <textarea
            className="border p-2 rounded w-full min-h-24"
            value={newService.description}
            onChange={(event) => setNewService({ ...newService, description: event.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Catégorie</label>
          <select
            className="border p-2 rounded w-full"
            value={newService.categorie}
            onChange={(event) => setNewService({ ...newService, categorie: event.target.value })}
            required
          >
            <option value="">-- Sélectionner --</option>
            {CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Durée estimée (minutes)</label>
          <input
            type="number"
            min="15"
            max="720"
            step="15"
            className="border p-2 rounded w-full"
            value={newService.duree_minutes}
            onChange={(event) => setNewService({ ...newService, duree_minutes: event.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Réservation au moins X heures avant</label>
          <input
            type="number"
            min="0"
            max="720"
            className="border p-2 rounded w-full"
            value={newService.delai_reservation_heures}
            onChange={(event) => setNewService({ ...newService, delai_reservation_heures: event.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Lieu de la prestation</label>
          <select
            className="border p-2 rounded w-full"
            value={newService.mode_intervention}
            onChange={(event) => setNewService({ ...newService, mode_intervention: event.target.value })}
          >
            <option value="chez_client">Chez le client</option>
            <option value="atelier">Dans mon atelier</option>
            <option value="les_deux">Chez le client ou en atelier</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Rayon de déplacement (km, facultatif)</label>
          <input
            type="number"
            min="1"
            max="500"
            className="border p-2 rounded w-full"
            value={newService.rayon_intervention_km}
            onChange={(event) => setNewService({ ...newService, rayon_intervention_km: event.target.value })}
          />
        </div>

        <div className="sm:col-span-2 grid grid-cols-1 gap-4">
          <label className="text-sm">Mode de tarification
            <select
              value={newService.mode_tarification}
              onChange={(e) => setNewService({ ...newService, mode_tarification: e.target.value })}
              className="mt-1 border p-2 rounded w-full"
            >
              <option value="fixe">Prix fixe</option>
              <option value="a_partir_de">À partir de</option>
              <option value="sur_devis">Sur devis</option>
            </select>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Image</label>
          <input
            type="file"
            accept="image/*"
            className="border p-2 rounded w-full"
            onChange={(event) => setNewService({ ...newService, image: event.target.files?.[0] || null })}
          />
        </div>

        <div className="sm:col-span-2 flex gap-2">
          <button className="rounded-2xl bg-[#0B6B50] px-5 py-3 text-sm font-black text-white hover:bg-[#095C45]">
            {editingService ? 'Mettre à jour' : 'Ajouter la prestation'}
          </button>
          {editingService && (
            <button
              type="button"
              onClick={() => {
                setEditingService(null);
                setNewService(EMPTY_SERVICE);
              }}
              className="border px-4 py-2 rounded hover:bg-gray-50"
            >
              Annuler la modification
            </button>
          )}
        </div>
      </form>

      {message && <p className="text-sm mb-4 text-blue-600">{message}</p>}

      {loading ? (
        <p>Chargement des prestations...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div key={service.id} className="rounded-[26px] border border-black/5 bg-white p-5 shadow-[0_8px_26px_rgba(30,45,37,0.05)]">
              <h3 className="font-bold text-lg">{service.titre}</h3>
              <p className="text-sm text-gray-600 mt-1">{service.description}</p>
              <p className="text-green-700 font-semibold mt-2">{service.mode_tarification === 'sur_devis' ? 'Sur devis' : `${service.mode_tarification === 'a_partir_de' ? 'À partir de ' : ''}${service.prix} FCFA`}</p>
              <div className="text-sm text-gray-500 mt-2 space-y-1">
                <p>⏱ {service.duree_minutes} min</p>
                <p>📍 {service.mode_intervention_label}</p>
                <p>🕒 Délai minimum : {service.delai_reservation_heures} h</p>
                {service.rayon_intervention_km && <p>🚗 Rayon : {service.rayon_intervention_km} km</p>}
              </div>
              {service.image && (
                <img src={service.image} alt={service.titre} className="mt-3 rounded h-40 object-cover w-full" />
              )}
              <div className="mt-3 flex justify-end gap-3">
                <button onClick={() => handleEdit(service)} className="text-blue-600 text-sm hover:underline">
                  Modifier
                </button>
                <button onClick={() => handleDelete(service.id)} className="text-red-500 text-sm hover:underline">
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
