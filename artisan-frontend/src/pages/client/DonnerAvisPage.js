import { useState, useEffect } from 'react';
import axios from '../../utils/axiosInstance';

export default function AvisPage() {
  const [avisList, setAvisList] = useState([]);
  const [avisClients, setAvisClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Avis donnés par le client sur les prestations
  const fetchAvis = async () => {
    try {
      const res = await axios.get('/reviews/mes/');
      setAvisList(res.data);
    } catch (err) {
      console.error("Erreur lors du chargement des avis :", err);
    }
  };

  // Avis donnés par l'artisan sur ses clients
  const fetchAvisClients = async () => {
    try {
      const res = await axios.get('/reviews/artisan/clients/');  // Endpoint à créer côté backend si pas encore fait
      setAvisClients(res.data);
    } catch (err) {
      console.error("Erreur lors du chargement des avis sur les clients :", err);
    }
  };

  useEffect(() => {
    fetchAvis();
    fetchAvisClients();
    setLoading(false);
  }, []);

  return (
    <div className="flex">
      <div className="flex-1 p-6 bg-gray-50 min-h-screen">
        <h1 className="text-2xl font-bold mb-6">⭐ Mes Avis</h1>

        {/* Avis donnés par le client */}
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">📝 Avis donnés sur les prestations</h2>
          {loading ? (
            <p>Chargement...</p>
          ) : avisList.length === 0 ? (
            <p className="text-gray-500">Vous n'avez pas encore donné d'avis sur des prestations.</p>
          ) : (
            <div className="space-y-4">
              {avisList.map((avis) => (
                <div key={avis.id} className="bg-white p-4 rounded shadow">
                  <h3 className="font-semibold text-lg">{avis.artisan_nom || 'Artisan inconnu'}</h3>
                  <p className="text-sm text-gray-600 mb-2">🛠 Prestation : {avis.service_titre || 'Titre non disponible'}</p>
                  <div className="flex space-x-1 text-yellow-500 mt-1">
                    {[...Array(avis.note)].map((_, i) => <span key={i}>★</span>)}
                    {[...Array(5 - avis.note)].map((_, i) => <span key={i} className="text-gray-300">★</span>)}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{avis.commentaire || "Pas de commentaire."}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Donné le {new Date(avis.date_creation).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Avis donnés par l'artisan sur les clients */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-2">🧑‍💼 Avis donnés sur les clients</h2>
          {loading ? (
            <p>Chargement...</p>
          ) : avisClients.length === 0 ? (
            <p className="text-gray-500">Vous n'avez pas encore donné d'avis sur vos clients.</p>
          ) : (
            <div className="space-y-4">
              {avisClients.map((avis) => (
                <div key={avis.id} className="bg-white p-4 rounded shadow">
                  <h3 className="font-semibold text-lg">{avis.client_nom || 'Client inconnu'}</h3>
                  <div className="flex space-x-1 text-yellow-500 mt-1">
                    {[...Array(avis.rating)].map((_, i) => <span key={i}>★</span>)}
                    {[...Array(5 - avis.rating)].map((_, i) => <span key={i} className="text-gray-300">★</span>)}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{avis.note_client || "Pas de commentaire."}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Rendez-vous du {new Date(avis.date_rdv).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}