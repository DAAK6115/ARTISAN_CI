import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';
import ArtisanNavbar from '../../components/ArtisanNavbar';

export default function ArtisanAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [methode, setMethode] = useState('');
  const [reduction, setReduction] = useState(0); // État pour la réduction
  const [prixFinal, setPrixFinal] = useState(0); // État pour le prix final
  const [noteClient, setNoteClient] = useState(''); // État pour le commentaire
  const [rating, setRating] = useState(0); // État pour la note par étoiles
  const [showModal, setShowModal] = useState(false);

  const fetchAppointments = async () => {
    try {
      const res = await axios.get('/appointments/mes-rendezvous-artisan/');
      setAppointments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.patch(`/appointments/${id}/changer-statut/`, { statut: newStatus });
      setMessage(`✅ Rendez-vous ${newStatus}`);
      fetchAppointments();
    } catch (err) {
      console.error(err);
      setMessage("❌ Erreur lors de la mise à jour");
    }
  };
  const envoyerNotificationAuClient = async (appointment) => {
    try {
      await axios.post('/notifications/creer/', {
        rendez_vous_id: appointment.id,
        titre: "📝 Notez votre prestation",
        message: `Merci d'avoir réservé ${appointment.service_titre}. Partagez votre avis avec une note et un commentaire !`,
        lien_redirection: `/client/avis/ajouter/${appointment.id}/`
      });
      console.log("✅ Notification envoyée au client.");
    } catch (err) {
      console.error("❌ Erreur lors de l'envoi de la notification :", err.response?.data || err.message);
    }
  };
  

  const handleConfirmerPaiement = (appointment) => {
    setSelectedAppointment(appointment);
    setMethode('');
    setReduction(0); // Réinitialise la réduction
    setPrixFinal(appointment.service_prix); // Initialise le prix final avec le prix initial
    setNoteClient(''); // Réinitialise le commentaire
    setRating(0); // Réinitialise la note par étoiles
    setShowModal(true);
  };

  const handleReductionChange = (value) => {
    const reductionValue = Number(value);
    setReduction(reductionValue);
    setPrixFinal(selectedAppointment.service_prix - reductionValue); // Recalcule le prix final
  };

  const handleRatingChange = (value) => {
    setRating(value); // Met à jour la note par étoiles
  };

  const confirmerPaiement = async () => {
    if (!selectedAppointment) return;
    try {
      await axios.patch(`/appointments/${selectedAppointment.id}/changer-statut/`, {
        statut: 'effectue',
        methode_paiement: methode,
        montant: prixFinal,
        reduction: reduction,
        note_client: noteClient,
        rating: rating,
      });
  
      // ✅ Envoi automatique de la notification après validation
      await envoyerNotificationAuClient(selectedAppointment);
  
      setMessage("✅ Paiement confirmé avec succès.");
      setShowModal(false);
      fetchAppointments();
    } catch (err) {
      console.error("Erreur confirmation :", err);
      setMessage("❌ Erreur lors de la confirmation.");
    }
  };
  

  useEffect(() => {
    fetchAppointments();
  }, []);

  return (
    <div>
      <ArtisanNavbar />
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">📋 Mes rendez-vous reçus</h2>
        {message && <p className="text-sm mb-4 text-center text-blue-600">{message}</p>}
        {loading ? (
          <p>Chargement...</p>
        ) : appointments.length === 0 ? (
          <p>Aucun rendez-vous pour l’instant.</p>
        ) : (
          <div className="grid gap-4">
            {appointments.map((a) => (
              <div key={a.id} className="p-4 border rounded bg-white shadow">
                <p><strong>👤 Client :</strong> {a.client_nom}</p>
                <p><strong>🛠 Prestation :</strong> {a.service_titre}</p>
                <p><strong>📅 Date :</strong> {new Date(a.date_rdv).toLocaleString()}</p>
                <p><strong>📌 Statut :</strong> <span className="uppercase text-blue-700 font-medium">{a.statut}</span></p>

                {a.statut === 'en_attente' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => updateStatus(a.id, 'confirme')}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-sm rounded"
                    >
                      ✅ Confirmer
                    </button>
                    <button
                      onClick={() => updateStatus(a.id, 'annule')}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 text-sm rounded"
                    >
                      ❌ Refuser
                    </button>
                  </div>
                )}

                {a.statut === 'confirme' && (
                  <div className="mt-2">
                    <button
                      onClick={() => handleConfirmerPaiement(a)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm rounded"
                    >
                      💳 Confirmer le paiement
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && selectedAppointment && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
    <div className="bg-white p-4 rounded-lg shadow-md w-full max-w-2xl">
      <h3 className="text-base font-semibold mb-3">💰 Détails du paiement</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-700"><strong>👤 Client :</strong> {selectedAppointment.client_nom}</p>
          <p className="text-gray-700"><strong>🛠 Prestation :</strong> {selectedAppointment.service_titre}</p>
        </div>

        <div>
          <label className="block mb-1">Méthode de paiement</label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={methode}
            onChange={(e) => setMethode(e.target.value)}
          >
            <option value="">-- Sélectionner --</option>
            <option value="wave">Wave</option>
            <option value="orange_money">Orange Money</option>
            <option value="moov_money">Moov Money</option>
            <option value="mtn_money">MTN Money</option>
            <option value="espèces">Espèces</option>
            <option value="autre">Autre</option>
          </select>
        </div>

        <div>
          <label className="block mb-1">Prix initial</label>
          <input
            type="number"
            value={selectedAppointment.service_prix}
            readOnly
            className="w-full border rounded px-2 py-1 bg-gray-100"
          />
        </div>

        <div>
          <label className="block mb-1">Réduction (FCFA)</label>
          <input
            type="number"
            value={reduction}
            onChange={(e) => handleReductionChange(e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
        </div>

        <div>
          <label className="block mb-1">Prix final</label>
          <input
            type="number"
            value={prixFinal}
            readOnly
            className="w-full border rounded px-2 py-1 bg-gray-100"
          />
        </div>

        <div>
          <label className="block mb-1">Note par étoiles</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleRatingChange(star)}
                className={`text-xl ${star <= rating ? 'text-yellow-500' : 'text-gray-400'}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block mb-1">Commentaire</label>
          <textarea
            value={noteClient}
            onChange={(e) => setNoteClient(e.target.value)}
            rows={2}
            className="w-full border rounded px-2 py-1"
            placeholder="Ajoutez un commentaire sur le client..."
          />
        </div>
      </div>

      <div className="flex justify-end mt-4 gap-2 text-sm">
        <button
          onClick={() => setShowModal(false)}
          className="text-gray-500 hover:underline"
        >
          Annuler
        </button>
        <button
          onClick={confirmerPaiement}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          ✅ Confirmer
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}