import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from '../../utils/axiosInstance';
import AppIcon from '../../components/AppIcon';
import PublicHeader from '../../components/PublicHeader';
import { getUserRole, isAuthenticated } from '../../utils/auth';

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

const formatPrice = (value) => new Intl.NumberFormat('fr-FR').format(Number(value || 0));

export default function ServiceDetail({ publicMode = false }) {
  const { id } = useParams();
  const connectedClient = isAuthenticated() && getUserRole() === 'client';
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
    let mounted = true;
    Promise.all([
      axios.get(`/services/${id}/`),
      axios.get(`/reviews/service/${id}/`),
    ]).then(([serviceResponse, reviewsResponse]) => {
      if (!mounted) return;
      setService(serviceResponse.data);
      setReviews(reviewsResponse.data || []);
    }).catch(() => mounted && setMessage('Service introuvable ou indisponible.'));
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    if (!selectedDate || !connectedClient) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }

    let cancelled = false;
    setSlotsLoading(true);
    setSelectedSlot(null);
    axios.get(`/appointments/creneaux/${id}/`, { params: { date: selectedDate } })
      .then((response) => !cancelled && setSlots(response.data.slots || []))
      .catch((error) => {
        if (!cancelled) {
          setSlots([]);
          setMessage(apiErrorMessage(error, 'Impossible de charger les créneaux.'));
        }
      })
      .finally(() => !cancelled && setSlotsLoading(false));
    return () => { cancelled = true; };
  }, [id, selectedDate, connectedClient]);

  const handleReservation = async () => {
    if (!selectedSlot) return;
    setIsLoadingReservation(true);
    setMessage('');
    try {
      await axios.post('/appointments/create/', {
        service: Number(id),
        date_rdv: selectedSlot.start,
        commentaires: reservationComment.trim(),
      });
      setMessage('Demande envoyée. L’artisan doit maintenant l’accepter.');
      setSelectedSlot(null);
      setReservationComment('');
      const response = await axios.get(`/appointments/creneaux/${id}/`, { params: { date: selectedDate } });
      setSlots(response.data.slots || []);
    } catch (error) {
      setMessage(apiErrorMessage(error, 'Erreur lors de la réservation.'));
    } finally {
      setIsLoadingReservation(false);
    }
  };

  const toggleFavori = async () => {
    if (!connectedClient) return;
    try {
      await axios.post(`/favoris/toggle/${id}/`);
      setService((current) => ({ ...current, is_favori: !current.is_favori }));
    } catch {
      setMessage('Impossible de modifier les favoris.');
    }
  };

  const handleReview = async () => {
    if (!note) {
      setMessage('Choisissez une note avant de publier votre avis.');
      return;
    }
    try {
      await axios.post('/reviews/create/', { service: id, note, commentaire });
      setMessage('Avis enregistré.');
      setNote('');
      setCommentaire('');
      const response = await axios.get(`/reviews/service/${id}/`);
      setReviews(response.data || []);
    } catch (error) {
      setMessage(apiErrorMessage(error, "Impossible d'enregistrer l'avis."));
    }
  };

  if (!service) {
    return (
      <div className="min-h-screen bg-[#FAF9F6]">
        {publicMode && <PublicHeader />}
        <div className="mx-auto max-w-6xl p-8 text-sm text-[#66736D]">{message || 'Chargement…'}</div>
      </div>
    );
  }

  const priceLabel = service.mode_tarification === 'sur_devis'
    ? 'Sur devis'
    : `${service.mode_tarification === 'a_partir_de' ? 'À partir de ' : ''}${formatPrice(service.prix)} FCFA`;

  const content = (
    <div className={publicMode ? 'mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8' : 'mx-auto max-w-6xl'}>
      <Link to={publicMode ? '/prestations' : '/client/services'} className="inline-flex items-center gap-2 text-sm font-bold text-[#66736D] hover:text-[#0B6B50]">
        <span aria-hidden="true">←</span> Retour aux prestations
      </Link>

      <div className="mt-5 overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-[0_18px_50px_rgba(20,38,30,0.08)]">
        <div className="grid lg:grid-cols-[1.05fr_.95fr]">
          <div className="min-h-[310px] bg-[#EAF4F0]">
            {service.image ? <img src={service.image} alt="" className="h-full min-h-[310px] w-full object-cover" /> : <div className="grid h-full min-h-[310px] place-items-center text-[#0B6B50]"><AppIcon name="tools" className="h-14 w-14" /></div>}
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B6B50]">{service.categorie_label || service.categorie}</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight">{service.titre}</h1>
              </div>
              {service.moyenne_avis && <span className="rounded-full bg-[#FFF7DD] px-3 py-1.5 text-sm font-black text-[#926800]">★ {service.moyenne_avis}</span>}
            </div>

            <Link to={`/artisans/${service.artisan_username}`} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#526159] hover:text-[#0B6B50]"><AppIcon name="user" className="h-4 w-4" /> {service.artisan_username}</Link>
            <p className="mt-5 text-sm leading-7 text-[#596760]">{service.description}</p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-[#F6F8F6] p-3"><p className="text-xs text-[#829087]">Durée estimée</p><p className="mt-1 font-black">{service.duree_minutes} min</p></div>
              <div className="rounded-2xl bg-[#F6F8F6] p-3"><p className="text-xs text-[#829087]">Intervention</p><p className="mt-1 font-black">{service.mode_intervention_label}</p></div>
            </div>

            <div className="mt-6 flex items-end justify-between border-t border-black/5 pt-5">
              <div><p className="text-xs font-semibold text-[#829087]">Tarif</p><p className="mt-1 text-2xl font-black text-[#0B6B50]">{priceLabel}</p></div>
              {connectedClient ? (
                <button onClick={toggleFavori} className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold ${service.is_favori ? 'bg-[#FFF0EE] text-[#B74339]' : 'bg-[#F2F5F3] text-[#526159]'}`}><AppIcon name="heart" className="h-4 w-4" />{service.is_favori ? 'Enregistré' : 'Favori'}</button>
              ) : (
                <Link to="/login" className="rounded-2xl bg-[#F2F5F3] px-4 py-2.5 text-sm font-bold text-[#526159]">Se connecter</Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {message && <div className="mt-5 rounded-2xl border border-[#DDE5E0] bg-white px-4 py-3 text-sm font-semibold text-[#45534C]">{message}</div>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_.8fr]">
        <section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-[0_12px_35px_rgba(20,38,30,0.05)] sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B6B50]">Réservation</p>
          <h2 className="mt-1 text-xl font-black">Choisissez un créneau</h2>
          {connectedClient ? (
            <>
              <label className="mt-5 block text-sm font-bold">Date souhaitée</label>
              <input type="date" min={minDate} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#DDE5E0] px-4 py-3 text-sm" />

              <div className="mt-4 flex flex-wrap gap-2">
                {slotsLoading && <p className="text-sm text-[#718078]">Chargement des créneaux…</p>}
                {!slotsLoading && selectedDate && slots.length === 0 && <p className="text-sm text-amber-700">Aucun créneau disponible ce jour-là.</p>}
                {slots.map((slot) => <button key={slot.start} type="button" onClick={() => setSelectedSlot(slot)} className={`rounded-xl border px-3 py-2 text-sm font-bold ${selectedSlot?.start === slot.start ? 'border-[#0B6B50] bg-[#0B6B50] text-white' : 'border-[#DDE5E0] bg-white text-[#45534C]'}`}>{slot.label}</button>)}
              </div>

              <textarea value={reservationComment} onChange={(event) => setReservationComment(event.target.value)} maxLength={1500} placeholder="Décrivez brièvement votre besoin (facultatif)" className="mt-4 h-24 w-full rounded-2xl border border-[#DDE5E0] px-4 py-3 text-sm" />
              <button onClick={handleReservation} disabled={!selectedSlot || isLoadingReservation} className="mt-3 w-full rounded-2xl bg-[#0B6B50] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-[#AAB8B1]">{isLoadingReservation ? 'Envoi…' : 'Envoyer la demande de rendez-vous'}</button>
              <p className="mt-3 text-xs leading-5 text-[#829087]">Le paiement n’est pas demandé ici. L’artisan déclare le règlement seulement après la réalisation du service.</p>
            </>
          ) : (
            <div className="mt-5 rounded-3xl bg-[#F6F8F6] p-6 text-center">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[#EAF4F0] text-[#0B6B50]"><AppIcon name="calendar" className="h-5 w-5" /></span>
              <p className="mt-3 font-black">Connectez-vous comme client pour réserver</p>
              <p className="mt-1 text-sm text-[#718078]">Vous pourrez ensuite choisir une date parmi les disponibilités réelles.</p>
              <Link to="/login" className="mt-4 inline-flex rounded-xl bg-[#0B6B50] px-4 py-2.5 text-sm font-bold text-white">Se connecter</Link>
            </div>
          )}
        </section>

        <section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-[0_12px_35px_rgba(20,38,30,0.05)] sm:p-6">
          <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#E07A32]">Expériences</p><h2 className="mt-1 text-xl font-black">Avis clients</h2></div><span className="text-sm font-bold text-[#718078]">{reviews.length}</span></div>
          <div className="mt-5 max-h-[360px] space-y-3 overflow-y-auto pr-1">
            {reviews.length === 0 && <p className="rounded-2xl bg-[#F8F9F7] p-4 text-sm text-[#718078]">Aucun avis pour cette prestation.</p>}
            {reviews.map((review) => <article key={review.id} className="rounded-2xl bg-[#F8F9F7] p-4"><div className="flex items-center justify-between"><p className="text-sm font-black">{review.client}</p><span className="text-xs font-black text-[#9A6B00]">★ {review.note}/5</span></div><p className="mt-2 text-sm leading-6 text-[#66736D]">{review.commentaire || 'Aucun commentaire.'}</p></article>)}
          </div>

          {connectedClient && (
            <div className="mt-5 border-t border-black/5 pt-5">
              <p className="text-sm font-black">Partager votre expérience</p>
              <div className="mt-2 flex gap-1">{[1,2,3,4,5].map((value) => <button key={value} type="button" onClick={() => setNote(value)} className={`text-2xl ${value <= note ? 'text-[#E7B451]' : 'text-[#D7DDD9]'}`}>★</button>)}</div>
              <textarea value={commentaire} onChange={(event) => setCommentaire(event.target.value)} placeholder="Votre commentaire" className="mt-2 h-20 w-full rounded-2xl border border-[#DDE5E0] px-3 py-2 text-sm" />
              <button onClick={handleReview} className="mt-2 rounded-xl bg-[#111815] px-4 py-2 text-sm font-bold text-white">Publier</button>
            </div>
          )}
        </section>
      </div>
    </div>
  );

  return publicMode ? <div className="min-h-screen bg-[#FAF9F6]"><PublicHeader />{content}</div> : content;
}
