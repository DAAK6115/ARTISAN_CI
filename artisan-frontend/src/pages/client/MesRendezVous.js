import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';

export default function MesRendezVous() {
  const [rdvs, setRdvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchRdv = () => {
    axios.get('/appointments/mes/')
      .then(res => setRdvs(res.data))
      .catch(err => {
        console.error("Erreur de chargement des rendez-vous :", err);
        setMessage("❌ Impossible de charger vos rendez-vous.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRdv();
  }, []);

  const renderStatut = (statut) => {
    switch (statut) {
      case 'confirme': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">Confirmé</span>;
      case 'en_attente': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">En attente</span>;
      case 'effectue': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">Effectué</span>;
      case 'annule': return <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-sm">Annulé</span>;
      default: return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">Inconnu</span>;
    }
  };

  const annulerRdv = async (rdvId) => {
    try {
      await axios.patch(`/appointments/${rdvId}/changer-statut/`, { statut: 'annule' });
      setMessage('✅ Rendez-vous annulé avec succès.');
      fetchRdv();
    } catch (err) {
      console.error("Erreur lors de l'annulation :", err);
      setMessage("❌ Une erreur est survenue lors de l'annulation.");
    }
  };

  const peutAnnuler = (date_rdv) => {
    const now = new Date();
    const rdvDate = new Date(date_rdv);
    const diffTime = rdvDate.getTime() - now.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= 3;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">🗓️ Mes Rendez-vous</h1>

      {message && <p className="text-blue-600 mb-4">{message}</p>}

      {loading ? (
        <p>Chargement...</p>
      ) : rdvs.length === 0 ? (
        <p className="text-gray-500">Aucun rendez-vous trouvé.</p>
      ) : (
        <div className="space-y-4">
          {rdvs.map(rdv => (
            <div key={rdv.id} className="border rounded shadow bg-white p-4">
              <h2 className="text-lg font-semibold">{rdv.service_titre}</h2>
              <p className="text-sm text-gray-600">Artisan : {rdv.artisan_nom}</p>
              <p className="text-sm text-gray-500">Date : {new Date(rdv.date_rdv).toLocaleString()}</p>
              <div className="mt-2">
                {renderStatut(rdv.statut)}
              </div>
              {rdv.commentaires && (
                <p className="mt-2 text-sm italic text-gray-700">💬 {rdv.commentaires}</p>
              )}

              {rdv.statut === 'confirme' && peutAnnuler(rdv.date_rdv) && (
                <button
                  onClick={() => annulerRdv(rdv.id)}
                  className="mt-3 text-sm text-white bg-red-600 px-3 py-1 rounded hover:bg-red-700"
                >
                  ❌ Annuler ce rendez-vous
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
