import { useEffect, useState, useCallback } from 'react';
import axios from '../../utils/axiosInstance';
import ArtisanNavbar from '../../components/ArtisanNavbar';

export default function ArtisanPaiements() {
  const [paiements, setPaiements] = useState([]);
  const [filtreStatut, setFiltreStatut] = useState('valide'); // Affiche "valide" par défaut
  const [filtreDate, setFiltreDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchPaiements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/payments/reçus-artisan/', {
        params: {
          statut: filtreStatut,
          date: filtreDate,
        },
      });
      setPaiements(res.data);
      setMessage('');
    } catch (err) {
      console.error("Erreur de chargement des paiements :", err);
      setMessage("Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, [filtreStatut, filtreDate]);

  useEffect(() => {
    fetchPaiements();
  }, [fetchPaiements]);

  const handleDownload = async (id) => {
    try {
      const res = await axios.get(`/payments/${id}/receipt/`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `recu-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Erreur lors du téléchargement du PDF", err);
      setMessage("Impossible de télécharger le reçu.");
    }
  };

  return (
    <div>
      <ArtisanNavbar />
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">📄 Paiements reçus</h2>

        <div className="flex flex-wrap gap-4 mb-4">
          <select
            value={filtreStatut}
            onChange={(e) => setFiltreStatut(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">-- Statut --</option>
            <option value="valide">Validé</option>
            <option value="en_attente">En attente</option>
            <option value="echoue">Échoué</option>
          </select>

          <input
            type="date"
            value={filtreDate}
            onChange={(e) => setFiltreDate(e.target.value)}
            className="border p-2 rounded"
          />
        </div>

        {message && <p className="text-red-600 text-sm mb-3">{message}</p>}

        {loading ? (
          <p>Chargement...</p>
        ) : paiements.length === 0 ? (
          <p className="text-gray-500">Aucun paiement trouvé.</p>
        ) : (
          <div className="space-y-4">
            {paiements.map((p) => (
              <div key={p.id} className="p-4 border rounded bg-white shadow">
                <div className="flex justify-between items-center">
                  <p className="text-lg font-semibold">{p.montant} FCFA</p>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      p.statut === 'valide'
                        ? 'bg-green-100 text-green-800'
                        : p.statut === 'echoue'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {p.statut}
                  </span>
                </div>
                <p className="text-sm text-gray-600">🛠 Service : {p.service_titre}</p>
                <p className="text-sm text-gray-600">👤 Client : {p.client}</p>
                <p className="text-sm text-gray-400 italic">
                  📅 {new Date(p.date_paiement).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">Référence : {p.transaction_id}</p>
                <button
                  onClick={() => handleDownload(p.id)}
                  className="mt-2 text-blue-500 text-sm hover:underline"
                >
                  📥 Télécharger le reçu
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
