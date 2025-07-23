import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../../utils/axiosInstance';

export default function ServiceDetail() {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [note, setNote] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [rdvDate, setRdvDate] = useState('');
  const [message, setMessage] = useState('');
  const [isLoadingReservation, setIsLoadingReservation] = useState(false);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const [resService, resReviews] = await Promise.all([
          axios.get(`/services/${id}/`),
          axios.get(`/reviews/service/${id}/`)
        ]);
        setService(resService.data);
        setReviews(resReviews.data);
      } catch {
        setMessage("❌ Service introuvable ou erreur de chargement.");
      }
    };

    fetchService();
  }, [id]);

  const handleReservation = async () => {
    setIsLoadingReservation(true);
    setMessage('');
    try {
      await axios.post('/payments/create/', {
        service: id,
        montant: service.prix,
        date_rdv: rdvDate,
        commentaires: "Réservation via le profil"
      });
      setMessage("✅ Réservation réussie");
    } catch {
      setMessage("❌ Erreur lors de la réservation");
    } finally {
      setIsLoadingReservation(false);
    }
  };

  const handleReview = async () => {
    try {
      await axios.post('/reviews/create/', {
        service: id,
        note,
        commentaire
      });
      setMessage("✅ Avis enregistré");
    } catch {
      setMessage("❌ Erreur lors de l'envoi de l'avis.");
    }
  };

  const toggleLike = async () => {
    try {
      await axios.post(`/likes/toggle/${id}/`);
      setService(prev => ({ ...prev, is_liked: !prev.is_liked }));
    } catch {
      setMessage("❌ Erreur lors du like.");
    }
  };

  const toggleFavori = async () => {
    try {
      await axios.post(`/favoris/toggle/${id}/`);
      setService(prev => ({ ...prev, is_favori: !prev.is_favori }));
    } catch {
      setMessage("❌ Erreur lors du favori.");
    }
  };

  const renderStars = (note) => {
    return '★'.repeat(note) + '☆'.repeat(5 - note);
  };

  if (!service) return <p className="p-6">Chargement...</p>;

  return (
    <div className="flex">
      <div className="flex-1 p-6">
        {service.image && (
          <img src={service.image} alt={service.titre} className="w-full h-60 object-cover rounded mb-6" />
        )}
        <h1 className="text-2xl font-bold">{service.titre}</h1>
        <p className="text-gray-500 mt-1">Catégorie : {service.categorie}</p>
        <p className="mt-3 text-gray-800">{service.description}</p>
        <p className="text-green-700 font-semibold mt-2">Prix : {service.prix} FCFA</p>

        <div className="flex items-center space-x-4 mt-4">
          <button onClick={toggleLike} className="text-sm px-3 py-1 rounded border">
            {service.is_liked ? '💔 Retirer le like' : '❤️ Liker'}
          </button>
          <button onClick={toggleFavori} className="text-sm px-3 py-1 rounded border">
            {service.is_favori ? '📌 Retirer des favoris' : '🔖 Ajouter aux favoris'}
          </button>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">⭐ Avis des clients</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun avis pour cette prestation.</p>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="border p-3 rounded bg-white shadow-sm">
                  <p className="text-sm text-gray-700">{renderStars(r.note)}</p>
                  <p className="text-xs text-gray-500">{r.commentaire}</p>
                  <p className="text-xs text-gray-400 italic">Par {r.client}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8 space-y-2">
          <h2 className="text-lg font-semibold">📅 Réserver un rendez-vous</h2>
          <input
            type="datetime-local"
            value={rdvDate}
            onChange={(e) => setRdvDate(e.target.value)}
            className="border p-2 rounded w-full"
          />
          <button
            onClick={handleReservation}
            disabled={isLoadingReservation}
            className={`px-4 py-2 rounded text-white ${
              isLoadingReservation ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoadingReservation ? '⏳ Réservation...' : 'Réserver'}
          </button>
        </div>

        <div className="mt-8 space-y-2">
          <h2 className="text-lg font-semibold">📝 Laisser un avis</h2>
          <div className="flex space-x-1 mb-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`text-2xl ${n <= note ? 'text-yellow-500' : 'text-gray-300'}`}
                onClick={() => setNote(n)}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            placeholder="Commentaire"
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            className="border p-2 rounded w-full h-24"
          />
          <button onClick={handleReview} className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">
            Envoyer l'avis
          </button>
        </div>

        {message && <p className="text-blue-600 mt-4">{message}</p>}
      </div>
    </div>
  );
}
