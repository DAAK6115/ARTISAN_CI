import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../../utils/axiosInstance';

function apiErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;
  if (Array.isArray(data.non_field_errors)) return data.non_field_errors[0];
  const first = Object.values(data).flat()[0];
  return typeof first === 'string' ? first : fallback;
}

export default function ServiceDetail() {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [note, setNote] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [reservationComment, setReservationComment] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoadingReservation, setIsLoadingReservation] = useState(false);

  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const [resService, resReviews] = await Promise.all([
          axios.get(`/services/${id}/`),
          axios.get(`/reviews/service/${id}/`),
        ]);
        setService(resService.data);
        setReviews(resReviews.data);
      } catch {
        setMessage('❌ Service introuvable ou erreur de chargement.');
      }
    };
    fetchService();
  }, [id]);

  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }

    let cancelled = false;
    const fetchSlots = async () => {
      setSlotsLoading(true);
      setSelectedSlot(null);
      setMessage('');
      try {
        const response = await axios.get(`/appointments/creneaux/${id}/`, {
          params: { date: selectedDate },
        });
        if (!cancelled) setSlots(response.data.slots || []);
      } catch (error) {
        if (!cancelled) {
          setSlots([]);
          setMessage(`❌ ${apiErrorMessage(error, 'Impossible de charger les créneaux.')}`);
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    };

    fetchSlots();
    return () => {
      cancelled = true;
    };
  }, [id, selectedDate]);

  const handleReservation = async () => {
    if (!selectedSlot) {
      setMessage('❌ Choisissez d’abord un créneau disponible.');
      return;
    }

    setIsLoadingReservation(true);
    setMessage('');
    try {
      await axios.post('/appointments/create/', {
        service: Number(id),
        date_rdv: selectedSlot.start,
        commentaires: reservationComment.trim(),
      });
      setMessage('✅ Demande de rendez-vous envoyée à l’artisan.');
      setSelectedSlot(null);
      setReservationComment('');

      const response = await axios.get(`/appointments/creneaux/${id}/`, {
        params: { date: selectedDate },
      });
      setSlots(response.data.slots || []);
    } catch (error) {
      setMessage(`❌ ${apiErrorMessage(error, 'Erreur lors de la réservation.')}`);
    } finally {
      setIsLoadingReservation(false);
    }
  };

  const handleReview = async () => {
    try {
      await axios.post('/reviews/create/', {
        service: id,
        note,
        commentaire,
      });
      setMessage('✅ Avis enregistré');
    } catch (error) {
      setMessage(`❌ ${apiErrorMessage(error, "Erreur lors de l'envoi de l'avis.")}`);
    }
  };

  const toggleLike = async () => {
    try {
      await axios.post(`/likes/toggle/${id}/`);
      setService((prev) => ({ ...prev, is_liked: !prev.is_liked }));
    } catch {
      setMessage('❌ Erreur lors du like.');
    }
  };

  const toggleFavori = async () => {
    try {
      await axios.post(`/favoris/toggle/${id}/`);
      setService((prev) => ({ ...prev, is_favori: !prev.is_favori }));
    } catch {
      setMessage('❌ Erreur lors du favori.');
    }
  };

  const renderStars = (rating) => '★'.repeat(rating) + '☆'.repeat(5 - rating);

  if (!service) return <p className="p-6">Chargement...</p>;

  return (
    <div className="flex">
      <div className="flex-1 p-6">
        {service.image && (
          <img
            src={service.image}
            alt={service.titre}
            className="w-full h-60 object-cover rounded mb-6"
          />
        )}

        <h1 className="text-2xl font-bold">{service.titre}</h1>
        <p className="text-gray-500 mt-1">Catégorie : {service.categorie}</p>
        <p className="mt-3 text-gray-800">{service.description}</p>
        <p className="text-green-700 font-semibold mt-2">{service.mode_tarification === 'sur_devis' ? 'Prix : sur devis' : `${service.mode_tarification === 'a_partir_de' ? 'À partir de : ' : 'Prix : '}${service.prix} FCFA`}</p>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600">
          <p>⏱ Durée : {service.duree_minutes} min</p>
          <p>📍 {service.mode_intervention_label}</p>
          {service.rayon_intervention_km && (
            <p>🚗 Rayon : {service.rayon_intervention_km} km</p>
          )}
        </div>

        <div className="flex items-center space-x-4 mt-4">
          <button onClick={toggleLike} className="text-sm px-3 py-1 rounded border">
            {service.is_liked ? '💔 Retirer le like' : '❤️ Liker'}
          </button>
          <button onClick={toggleFavori} className="text-sm px-3 py-1 rounded border">
            {service.is_favori ? '📌 Retirer des favoris' : '🔖 Ajouter aux favoris'}
          </button>
        </div>

        <div className="mt-8 border rounded-lg bg-white p-4">
          <h2 className="text-lg font-semibold">📅 Réserver un rendez-vous</h2>
          <p className="text-sm text-gray-500 mt-1">
            Choisissez une date puis un créneau réellement disponible.
          </p>

          <label className="block mt-4 text-sm font-medium">Date souhaitée</label>
          <input
            type="date"
            min={minDate}
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="border p-2 rounded w-full mt-1"
          />

          <div className="mt-4">
            {slotsLoading ? (
              <p className="text-sm text-gray-500">Chargement des créneaux...</p>
            ) : selectedDate && slots.length === 0 ? (
              <p className="text-sm text-amber-700">
                Aucun créneau disponible ce jour-là.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    type="button"
                    key={slot.start}
                    onClick={() => setSelectedSlot(slot)}
                    className={`px-3 py-2 rounded border text-sm ${
                      selectedSlot?.start === slot.start
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white hover:bg-blue-50'
                    }`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <textarea
            value={reservationComment}
            onChange={(event) => setReservationComment(event.target.value)}
            maxLength={1500}
            placeholder="Précisez votre besoin (facultatif)"
            className="border p-2 rounded w-full h-24 mt-4"
          />

          <button
            onClick={handleReservation}
            disabled={isLoadingReservation || !selectedSlot}
            className={`mt-3 px-4 py-2 rounded text-white ${
              isLoadingReservation || !selectedSlot
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoadingReservation ? '⏳ Envoi...' : 'Envoyer la demande'}
          </button>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">⭐ Avis des clients</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun avis pour cette prestation.</p>
          ) : (
            <ul className="space-y-3">
              {reviews.map((review) => (
                <li key={review.id} className="border p-3 rounded bg-white shadow-sm">
                  <p className="text-sm text-gray-700">{renderStars(review.note)}</p>
                  <p className="text-xs text-gray-500">{review.commentaire}</p>
                  <p className="text-xs text-gray-400 italic">Par {review.client}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8 space-y-2">
          <h2 className="text-lg font-semibold">📝 Laisser un avis</h2>
          <div className="flex space-x-1 mb-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className={`text-2xl ${value <= note ? 'text-yellow-500' : 'text-gray-300'}`}
                onClick={() => setNote(value)}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            placeholder="Commentaire"
            value={commentaire}
            onChange={(event) => setCommentaire(event.target.value)}
            className="border p-2 rounded w-full h-24"
          />
          <button
            onClick={handleReview}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          >
            Envoyer l'avis
          </button>
        </div>

        {message && <p className="text-blue-600 mt-4">{message}</p>}
      </div>
    </div>
  );
}
