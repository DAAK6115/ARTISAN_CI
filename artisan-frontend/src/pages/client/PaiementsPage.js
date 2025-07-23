import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';

export default function PaiementsPage() {
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios.get('/payments/mes/')
      .then(res => setPaiements(res.data))
      .catch(err => {
        console.error("Erreur lors du chargement des paiements :", err);
        setMessage("❌ Impossible de charger vos paiements.");
      })
      .finally(() => setLoading(false));
  }, []);

  const telechargerRecu = async (paiementId) => {
    try {
      const response = await axios.get(`/payments/${paiementId}/receipt/`, {
        responseType: 'blob', // On attend un fichier PDF
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `recu_paiement_${paiementId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Erreur téléchargement du reçu :", error);
      setMessage("❌ Échec du téléchargement du reçu.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">💳 Mes Paiements</h1>

      {message && <p className="text-red-600 mb-4">{message}</p>}

      {loading ? (
        <p>Chargement des paiements...</p>
      ) : paiements.length === 0 ? (
        <p className="text-gray-500">Aucun paiement effectué pour l'instant.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded shadow-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">Montant</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Reçu</th>
              </tr>
            </thead>
            <tbody>
              {paiements.map(p => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2">{p.service_titre}</td>
                  <td className="px-4 py-2">{p.montant} FCFA</td>
                  <td className="px-4 py-2">{new Date(p.date_paiement).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      p.statut === 'valide' ? 'bg-green-100 text-green-800' :
                      p.statut === 'echoue' ? 'bg-red-100 text-red-600' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {p.statut}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => telechargerRecu(p.id)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      📥 Télécharger
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
