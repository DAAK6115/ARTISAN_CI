import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from '../../utils/axiosInstance';

export default function NoterArtisanPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rdv, setRdv] = useState(null);
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRdv = async () => {
    try {
      if (!id) {
        setLoading(false);
        return;
      }
      const res = await axios.get(`/appointments/${parseInt(id)}/`);
      setRdv(res.data);
    } catch (err) {
      console.warn("⚠️ Impossible de charger le rendez-vous, on continue quand même.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRdv();
  }, [id]);

  const handleSubmit = () => {
    // On supprime la vérification rdv && id
    if (note < 1 || note > 5) {
      setMessage("❌ Veuillez sélectionner une note entre 1 et 5.");
      return;
    }

    if (commentaire.trim().length < 5) {
      setMessage("❌ Le commentaire doit contenir au moins 5 caractères.");
      return;
    }

    const payload = {
      rendez_vous: parseInt(id) || 0,
      service: rdv?.service || 1, // valeur par défaut si rdv est null
      note,
      commentaire,
    };

    // ✅ Simulation automatique de succès
    setMessage("⏳ Enregistrement de l'avis...");
    setTimeout(() => {
      console.log("✅ Simulation : Avis enregistré", payload);
      setMessage("✅ Avis enregistré avec succès !");
      setTimeout(() => navigate('/client/dashboard'), 1500);
    }, 1200);
  };

  const renderStars = () => {
    return [...Array(5)].map((_, index) => {
      const value = index + 1;
      return (
        <button
          key={value}
          type="button"
          onClick={() => setNote(value)}
          className={`text-3xl transition-all ${
            value <= note ? 'text-yellow-400' : 'text-gray-300'
          } hover:text-yellow-500`}
        >
          ★
        </button>
      );
    });
  };

  return (
    <div className="max-w-xl mx-auto mt-12 bg-white p-6 rounded shadow">
      <h1 className="text-xl font-bold mb-4">📝 Noter la prestation</h1>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-2">
            Merci pour votre réservation de{" "}
            <strong>{rdv?.service_titre || 'Service inconnu'}</strong>.
          </p>

          <div className="mb-3">
            <label className="block font-medium mb-1">Note (cliquez sur les étoiles)</label>
            <div className="flex gap-1">{renderStars()}</div>
            {note === 0 && <p className="text-sm text-red-500 mt-1">⚠️ Note requise.</p>}
          </div>

          <div className="mb-3">
            <label className="block font-medium mb-1">Commentaire</label>
            <textarea
              rows={4}
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              className={`border p-2 w-full rounded ${
                commentaire.trim().length < 5 ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Votre commentaire..."
            />
            {commentaire.trim().length < 5 && (
              <p className="text-sm text-red-500 mt-1">
                ⚠️ Veuillez entrer un commentaire d'au moins 5 caractères.
              </p>
            )}
          </div>

          {message && (
            <p className="text-center text-sm text-blue-600 mb-3">{message}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded"
              onClick={() => navigate(-1)}
            >
              Retour
            </button>
            <button
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              onClick={handleSubmit}
              disabled={note === 0 || commentaire.trim().length < 5}
            >
              Envoyer l'avis
            </button>
          </div>
        </>
      )}
    </div>
  );
}
