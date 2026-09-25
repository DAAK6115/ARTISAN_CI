import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';
import useAutoRefresh from '../../hooks/useAutoRefresh';

const STATUS_STYLES = {
  en_attente: ['Demande envoyée', 'bg-yellow-100 text-yellow-800'],
  accepte: ['Accepté', 'bg-emerald-100 text-emerald-700'],
  confirme: ['Confirmé', 'bg-green-100 text-green-700'],
  en_route: ['Artisan en route', 'bg-sky-100 text-sky-700'],
  en_cours: ['En cours', 'bg-indigo-100 text-indigo-700'],
  termine: ['À confirmer', 'bg-purple-100 text-purple-700'],
  effectue: ['Clôturé', 'bg-blue-100 text-blue-700'],
  refuse: ['Refusé', 'bg-red-100 text-red-700'],
  annule_client: ['Annulé', 'bg-red-100 text-red-700'],
  annule_artisan: ['Annulé par l’artisan', 'bg-red-100 text-red-700'],
  annule: ['Annulé', 'bg-red-100 text-red-700'],
};

function apiErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (data?.error) return data.error;
  if (data?.detail) return data.detail;
  if (Array.isArray(data)) return data[0] || fallback;
  return fallback;
}

export default function MesRendezVous() {
  const [rdvs, setRdvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchRdv = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await axios.get('/appointments/mes/');
      setRdvs(response.data);
    } catch (error) {
      setMessage(`❌ ${apiErrorMessage(error, 'Impossible de charger vos rendez-vous.')}`);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRdv();
  }, []);

  useAutoRefresh(() => fetchRdv(true), { intervalMs: 15000 });

  const renderStatut = (statut) => {
    const [label, style] = STATUS_STYLES[statut] || ['Inconnu', 'bg-gray-100 text-gray-600'];
    return <span className={`${style} px-2 py-1 rounded text-sm`}>{label}</span>;
  };

  const annulerRdv = async (rdv) => {
    if (!window.confirm('Voulez-vous vraiment annuler ce rendez-vous ?')) return;
    try {
      await axios.patch(`/appointments/${rdv.id}/changer-statut/`, {
        statut: 'annule_client',
        motif: 'Annulation demandée par le client',
      });
      setMessage('✅ Rendez-vous annulé.');
      fetchRdv();
    } catch (error) {
      setMessage(`❌ ${apiErrorMessage(error, "Impossible d'annuler ce rendez-vous.")}`);
    }
  };

  const confirmerFin = async (rdv) => {
    if (!window.confirm('Confirmez-vous que la prestation est bien terminée ?')) return;
    try {
      await axios.post(`/appointments/confirmer/${rdv.id}/`);
      setMessage('✅ Prestation confirmée et rendez-vous clôturé.');
      fetchRdv();
    } catch (error) {
      setMessage(`❌ ${apiErrorMessage(error, 'Confirmation impossible.')}`);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">🗓️ Mes rendez-vous</h1>

      {message && <p className="text-blue-600 mb-4">{message}</p>}

      {loading ? (
        <p>Chargement...</p>
      ) : rdvs.length === 0 ? (
        <p className="text-gray-500">Aucun rendez-vous trouvé.</p>
      ) : (
        <div className="space-y-4">
          {rdvs.map((rdv) => (
            <div key={rdv.id} className="border rounded shadow bg-white p-4">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{rdv.service_titre}</h2>
                  <p className="text-sm text-gray-600">Artisan : {rdv.artisan_nom}</p>
                  <p className="text-sm text-gray-500">
                    Début : {new Date(rdv.date_rdv).toLocaleString('fr-FR')}
                  </p>
                  <p className="text-sm text-gray-500">
                    Fin prévue : {new Date(rdv.date_fin).toLocaleString('fr-FR')}
                  </p>
                </div>
                <div>{renderStatut(rdv.statut)}</div>
              </div>

              {rdv.commentaires && (
                <p className="mt-2 text-sm italic text-gray-700">💬 {rdv.commentaires}</p>
              )}
              {rdv.motif_annulation && (
                <p className="mt-2 text-sm text-red-600">Motif : {rdv.motif_annulation}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {rdv.peut_annuler && (
                  <button
                    onClick={() => annulerRdv(rdv)}
                    className="text-sm text-white bg-red-600 px-3 py-2 rounded hover:bg-red-700"
                  >
                    Annuler le rendez-vous
                  </button>
                )}

                {rdv.transitions_autorisees?.includes('effectue') && (
                  <button
                    onClick={() => confirmerFin(rdv)}
                    className="text-sm text-white bg-green-600 px-3 py-2 rounded hover:bg-green-700"
                  >
                    ✅ Confirmer la fin de la prestation
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
