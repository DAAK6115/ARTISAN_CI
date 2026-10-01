import { useEffect, useMemo, useState } from 'react';
import axios from '../../utils/axiosInstance';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import LocationActions from '../../components/LocationActions';

const WEEKDAYS = [
  [0, 'Lundi'],
  [1, 'Mardi'],
  [2, 'Mercredi'],
  [3, 'Jeudi'],
  [4, 'Vendredi'],
  [5, 'Samedi'],
  [6, 'Dimanche'],
];

const STATUS_LABELS = {
  en_attente: 'Demande reçue',
  accepte: 'Accepté',
  confirme: 'Confirmé',
  en_route: 'En route',
  en_cours: 'En cours',
  termine: 'Terminé - attente client',
  effectue: 'Clôturé',
  refuse: 'Refusé',
  annule_client: 'Annulé par le client',
  annule_artisan: 'Annulé par vous',
  annule: 'Annulé',
};

const ACTIONS = {
  accepte: ['Accepter', 'bg-green-600 hover:bg-green-700'],
  refuse: ['Refuser', 'bg-red-600 hover:bg-red-700'],
  confirme: ['Confirmer le rendez-vous', 'bg-emerald-600 hover:bg-emerald-700'],
  en_route: ['Je suis en route', 'bg-sky-600 hover:bg-sky-700'],
  en_cours: ['Démarrer la prestation', 'bg-indigo-600 hover:bg-indigo-700'],
  termine: ['Marquer comme terminée', 'bg-purple-600 hover:bg-purple-700'],
  annule_artisan: ['Annuler', 'bg-red-600 hover:bg-red-700'],
};

const PAYMENT_METHODS = [
  { value: 'wave', label: 'Wave' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'mtn_money', label: 'MTN Money' },
  { value: 'moov_money', label: 'Moov Money' },
  { value: 'cash', label: 'Espèces' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
  { value: 'other', label: 'Autre' },
];

const STATUS_META = {
  en_attente: { label: 'Demande reçue', badge: 'bg-[#FFF4DE] text-[#9A5D00]', dot: 'bg-[#E7A326]' },
  accepte: { label: 'Accepté', badge: 'bg-[#EAF4F0] text-[#0B6B50]', dot: 'bg-[#0B6B50]' },
  confirme: { label: 'Confirmé', badge: 'bg-[#EAF4F0] text-[#0B6B50]', dot: 'bg-[#0B6B50]' },
  en_route: { label: 'En route', badge: 'bg-[#EAF5FF] text-[#1269A7]', dot: 'bg-[#2A88C9]' },
  en_cours: { label: 'En cours', badge: 'bg-[#EEF0FF] text-[#4854B8]', dot: 'bg-[#5965D8]' },
  termine: { label: 'Terminé · attente client', badge: 'bg-[#F4EDFF] text-[#7650A8]', dot: 'bg-[#8660B6]' },
  effectue: { label: 'Clôturé', badge: 'bg-[#EDF1EE] text-[#526159]', dot: 'bg-[#718078]' },
  refuse: { label: 'Refusé', badge: 'bg-[#FFF0EE] text-[#B23A31]', dot: 'bg-[#D84A3A]' },
  annule_client: { label: 'Annulé par le client', badge: 'bg-[#FFF0EE] text-[#B23A31]', dot: 'bg-[#D84A3A]' },
  annule_artisan: { label: 'Annulé par vous', badge: 'bg-[#FFF0EE] text-[#B23A31]', dot: 'bg-[#D84A3A]' },
  annule: { label: 'Annulé', badge: 'bg-[#FFF0EE] text-[#B23A31]', dot: 'bg-[#D84A3A]' },
};

const ACTIVE_STATUSES = new Set(['en_attente', 'accepte', 'confirme', 'en_route', 'en_cours', 'termine']);
const HISTORY_STATUSES = new Set(['effectue', 'refuse', 'annule_client', 'annule_artisan', 'annule']);

function dayKey(date) {
  const value = new Date(date);
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

function formatAgendaDate(date) {
  const value = new Date(date);
  return {
    day: new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(value),
    month: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(value).replace('.', '').toUpperCase(),
    weekday: new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(value).replace('.', ''),
    time: new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(value),
  };
}

function durationLabel(start, end) {
  const diff = Math.max(0, new Date(end) - new Date(start));
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest.toString().padStart(2, '0')}` : `${hours} h`;
}

function apiErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (data.error) return data.error;
  if (data.detail) return data.detail;
  const first = Object.values(data).flat()[0];
  return typeof first === 'string' ? first : fallback;
}

export default function ArtisanAppointments() {
  const [activeTab, setActiveTab] = useState('appointments');
  const [agendaFilter, setAgendaFilter] = useState('active');
  const [appointments, setAppointments] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [timeOffs, setTimeOffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [availabilityForm, setAvailabilityForm] = useState({
    jour_semaine: 0,
    heure_debut: '08:00',
    heure_fin: '17:00',
  });
  const [timeOffForm, setTimeOffForm] = useState({
    debut: '',
    fin: '',
    motif: '',
  });
  const [completionModal, setCompletionModal] = useState(null);
  const [completionPreview, setCompletionPreview] = useState(null);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completionSubmitting, setCompletionSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    statut: '',
    methode_paiement: '',
    payment_reference: '',
    notes: '',
  });

  const fetchAppointments = async () => {
    try {
      const response = await axios.get('/appointments/mes-rendezvous-artisan/');
      setAppointments(response.data);
    } catch (error) {
      setMessage(`❌ ${apiErrorMessage(error, 'Impossible de charger les rendez-vous.')}`);
    }
  };

  const fetchSchedule = async () => {
    try {
      const [availabilityResponse, timeOffResponse] = await Promise.all([
        axios.get('/appointments/disponibilites/'),
        axios.get('/appointments/indisponibilites/'),
      ]);
      setAvailabilities(availabilityResponse.data);
      setTimeOffs(timeOffResponse.data);
    } catch (error) {
      setMessage(`❌ ${apiErrorMessage(error, 'Impossible de charger vos disponibilités.')}`);
    }
  };

  const refreshAll = async (silent = false) => {
    if (!silent) setLoading(true);
    await Promise.all([fetchAppointments(), fetchSchedule()]);
    if (!silent) setLoading(false);
  };

  useEffect(() => { refreshAll(); }, []);
  useAutoRefresh(() => refreshAll(true), { intervalMs: 15000 });

  const closeCompletionModal = () => {
    if (completionSubmitting) return;
    setCompletionModal(null);
    setCompletionPreview(null);
    setPaymentForm({
      statut: '',
      methode_paiement: '',
      payment_reference: '',
      notes: '',
    });
  };

  const openCompletionModal = async (appointment) => {
    setCompletionModal(appointment);
    setCompletionPreview(null);
    setPaymentForm({
      statut: '',
      methode_paiement: '',
      payment_reference: '',
      notes: '',
    });
    setCompletionLoading(true);
    try {
      const response = await axios.get(`/payments/complete-service/${appointment.id}/`);
      setCompletionPreview(response.data);
    } catch (error) {
      setCompletionModal(null);
      setMessage(`❌ ${apiErrorMessage(error, 'Impossible de préparer les informations de règlement.')}`);
    } finally {
      setCompletionLoading(false);
    }
  };

  const submitCompletion = async (event) => {
    event.preventDefault();
    if (!completionModal) return;

    if (!paymentForm.statut) {
      setMessage('❌ Indiquez si la prestation a été payée ou non.');
      return;
    }
    if (paymentForm.statut === 'paid' && !paymentForm.methode_paiement) {
      setMessage('❌ Sélectionnez le moyen de paiement utilisé.');
      return;
    }

    setCompletionSubmitting(true);
    try {
      await axios.post(`/payments/complete-service/${completionModal.id}/`, {
        statut: paymentForm.statut,
        methode_paiement: paymentForm.statut === 'paid' ? paymentForm.methode_paiement : null,
        payment_reference: paymentForm.statut === 'paid' ? paymentForm.payment_reference.trim() : '',
        notes: paymentForm.notes.trim(),
      });
      setMessage(
        paymentForm.statut === 'paid'
          ? '✅ Prestation terminée et paiement déclaré reçu.'
          : '✅ Prestation terminée et règlement déclaré non reçu.'
      );
      closeCompletionModal();
      await fetchAppointments();
    } catch (error) {
      setMessage(`❌ ${apiErrorMessage(error, 'Impossible de terminer la prestation.')}`);
    } finally {
      setCompletionSubmitting(false);
    }
  };

  const updateStatus = async (appointment, newStatus) => {
    if (newStatus === 'termine') {
      await openCompletionModal(appointment);
      return;
    }

    let motif = '';
    if (['refuse', 'annule_artisan'].includes(newStatus)) {
      motif = window.prompt('Indiquez brièvement le motif :') || '';
    }

    try {
      await axios.patch(`/appointments/${appointment.id}/changer-statut/`, {
        statut: newStatus,
        motif,
      });
      setMessage('✅ Statut du rendez-vous mis à jour.');
      await fetchAppointments();
    } catch (error) {
      setMessage(`❌ ${apiErrorMessage(error, 'Mise à jour impossible.')}`);
    }
  };

  const addAvailability = async (event) => {
    event.preventDefault();
    try {
      await axios.post('/appointments/disponibilites/', {
        ...availabilityForm,
        jour_semaine: Number(availabilityForm.jour_semaine),
      });
      setMessage('✅ Disponibilité ajoutée.');
      await fetchSchedule();
    } catch (error) {
      setMessage(`❌ ${apiErrorMessage(error, 'Impossible d’ajouter cette disponibilité.')}`);
    }
  };

  const deleteAvailability = async (id) => {
    if (!window.confirm('Supprimer cette plage de disponibilité ?')) return;
    try {
      await axios.delete(`/appointments/disponibilites/${id}/`);
      setMessage('✅ Disponibilité supprimée.');
      await fetchSchedule();
    } catch (error) {
      setMessage(`❌ ${apiErrorMessage(error, 'Suppression impossible.')}`);
    }
  };

  const addTimeOff = async (event) => {
    event.preventDefault();
    try {
      await axios.post('/appointments/indisponibilites/', timeOffForm);
      setTimeOffForm({ debut: '', fin: '', motif: '' });
      setMessage('✅ Indisponibilité enregistrée.');
      await fetchSchedule();
    } catch (error) {
      setMessage(`❌ ${apiErrorMessage(error, 'Impossible d’enregistrer cette indisponibilité.')}`);
    }
  };

  const deleteTimeOff = async (id) => {
    if (!window.confirm('Supprimer cette indisponibilité ?')) return;
    try {
      await axios.delete(`/appointments/indisponibilites/${id}/`);
      setMessage('✅ Indisponibilité supprimée.');
      await fetchSchedule();
    } catch (error) {
      setMessage(`❌ ${apiErrorMessage(error, 'Suppression impossible.')}`);
    }
  };

  const agendaStats = useMemo(() => {
    const today = dayKey(new Date());
    return {
      today: appointments.filter((item) => dayKey(item.date_rdv) === today && ACTIVE_STATUSES.has(item.statut)).length,
      pending: appointments.filter((item) => item.statut === 'en_attente').length,
      inProgress: appointments.filter((item) => ['en_route', 'en_cours'].includes(item.statut)).length,
      active: appointments.filter((item) => ACTIVE_STATUSES.has(item.statut)).length,
    };
  }, [appointments]);

  const visibleAppointments = useMemo(() => {
    const items = [...appointments].sort((a, b) => {
      const diff = new Date(a.date_rdv) - new Date(b.date_rdv);
      return agendaFilter === 'history' ? -diff : diff;
    });
    if (agendaFilter === 'active') return items.filter((item) => ACTIVE_STATUSES.has(item.statut));
    if (agendaFilter === 'history') return items.filter((item) => HISTORY_STATUSES.has(item.statut));
    return items;
  }, [appointments, agendaFilter]);

  const paymentMethods = completionPreview?.payment_methods?.length
    ? completionPreview.payment_methods
    : PAYMENT_METHODS;

  return (
    <div className="mx-auto max-w-[1400px] p-4 pb-28 sm:p-6 lg:pb-8">
      <div className="mb-6 rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_14px_40px_rgba(25,44,34,0.06)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0B6B50]">Organisation</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[#111815]">Agenda & disponibilités</h2>
            <p className="mt-2 max-w-2xl text-sm text-[#66736D]">Suivez vos interventions, leurs étapes et vos créneaux disponibles depuis un seul espace.</p>
          </div>
          <div className="inline-flex w-full rounded-2xl bg-[#F3F6F4] p-1 sm:w-auto">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-black transition sm:flex-none ${activeTab === 'appointments' ? 'bg-white text-[#0B6B50] shadow-sm' : 'text-[#66736D]'}`}
            >
              Agenda
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-black transition sm:flex-none ${activeTab === 'schedule' ? 'bg-white text-[#0B6B50] shadow-sm' : 'text-[#66736D]'}`}
            >
              Disponibilités
            </button>
          </div>
        </div>

        {activeTab === 'appointments' ? (
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['Aujourd’hui', agendaStats.today, 'Interventions du jour'],
              ['À traiter', agendaStats.pending, 'Demandes reçues'],
              ['En déplacement', agendaStats.inProgress, 'En route / en cours'],
              ['Actifs', agendaStats.active, 'Rendez-vous ouverts'],
            ].map(([label, value, hint]) => (
              <div key={label} className="rounded-2xl border border-black/5 bg-[#FBFCFB] p-4">
                <p className="text-2xl font-black text-[#111815]">{value}</p>
                <p className="mt-1 text-sm font-black text-[#334139]">{label}</p>
                <p className="mt-1 text-xs text-[#829087]">{hint}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {message && (
        <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${message.startsWith('❌') ? 'border-[#F0CBC7] bg-[#FFF5F3] text-[#A63D34]' : 'border-[#CFE5DB] bg-[#F2FAF6] text-[#0B6B50]'}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="rounded-[24px] border border-black/5 bg-white p-8 text-center text-sm text-[#718078]">Chargement de votre agenda…</div>
      ) : activeTab === 'appointments' ? (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {[
              ['active', 'À venir'],
              ['history', 'Historique'],
              ['all', 'Tous'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setAgendaFilter(value)}
                className={`rounded-full border px-4 py-2 text-xs font-black transition ${agendaFilter === value ? 'border-[#0B6B50] bg-[#0B6B50] text-white' : 'border-[#DDE5E0] bg-white text-[#526159] hover:border-[#9DB5A8]'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {visibleAppointments.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[#C9D6CF] bg-[#FBFCFB] p-10 text-center">
              <p className="text-lg font-black text-[#334139]">Aucun rendez-vous dans cette vue</p>
              <p className="mt-2 text-sm text-[#718078]">Vos prochaines demandes et interventions apparaîtront ici automatiquement.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleAppointments.map((appointment) => {
                const date = formatAgendaDate(appointment.date_rdv);
                const meta = STATUS_META[appointment.statut] || { label: STATUS_LABELS[appointment.statut] || appointment.statut, badge: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' };
                return (
                  <article key={appointment.id} className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_10px_32px_rgba(30,45,37,0.05)]">
                    <div className="grid gap-0 md:grid-cols-[118px_1fr]">
                      <div className="flex items-center gap-3 border-b border-black/5 bg-[#F7F9F7] px-5 py-4 md:flex-col md:justify-center md:border-b-0 md:border-r md:px-3 md:text-center">
                        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm md:h-16 md:w-16">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B6B50]">{date.month}</p>
                            <p className="text-2xl font-black leading-none text-[#111815]">{date.day}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-bold capitalize text-[#66736D]">{date.weekday}</p>
                          <p className="mt-0.5 text-base font-black text-[#111815]">{date.time}</p>
                        </div>
                      </div>

                      <div className="p-5 sm:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-black text-[#111815]">{appointment.service_titre}</h3>
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black ${meta.badge}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                                {meta.label}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-semibold text-[#526159]">Client : <span className="text-[#111815]">{appointment.client_nom}</span></p>
                          </div>

                          <div className="rounded-2xl bg-[#F7F9F7] px-4 py-3 text-sm">
                            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#829087]">Horaire</p>
                            <p className="mt-1 font-black text-[#334139]">{date.time} · {durationLabel(appointment.date_rdv, appointment.date_fin)}</p>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 lg:grid-cols-2">
                          <div className="rounded-2xl border border-black/5 bg-[#FCFDFC] p-4">
                            <p className="text-xs font-black uppercase tracking-[0.08em] text-[#718078]">Lieu de l’intervention</p>
                            <p className="mt-2 font-black text-[#334139]">{appointment.lieu_intervention === 'atelier' ? 'Dans votre atelier' : 'Chez le client'}</p>
                            {appointment.lieu_intervention === 'chez_client' && appointment.intervention_adresse ? (
                              <p className="mt-1 text-sm leading-5 text-[#66736D]">{appointment.intervention_adresse}</p>
                            ) : null}
                          </div>
                          {appointment.commentaires ? (
                            <div className="rounded-2xl border border-black/5 bg-[#FCFDFC] p-4">
                              <p className="text-xs font-black uppercase tracking-[0.08em] text-[#718078]">Note du client</p>
                              <p className="mt-2 text-sm leading-5 text-[#526159]">{appointment.commentaires}</p>
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-black/5 bg-[#FCFDFC] p-4">
                              <p className="text-xs font-black uppercase tracking-[0.08em] text-[#718078]">Référence</p>
                              <p className="mt-2 text-sm font-bold text-[#526159]">Rendez-vous #{appointment.id}</p>
                            </div>
                          )}
                        </div>

                        {appointment.motif_annulation ? (
                          <div className="mt-4 rounded-2xl bg-[#FFF4F2] px-4 py-3 text-sm text-[#A63D34]"><strong>Motif :</strong> {appointment.motif_annulation}</div>
                        ) : null}

                        {appointment.lieu_intervention === 'chez_client'
                          && appointment.intervention_latitude != null
                          && appointment.intervention_longitude != null ? (
                          <div className="mt-4 rounded-2xl bg-[#F3F7F5] p-4">
                            <p className="mb-2 text-xs font-black uppercase tracking-[0.08em] text-[#718078]">Itinéraire vers le client</p>
                            <LocationActions
                              latitude={appointment.intervention_latitude}
                              longitude={appointment.intervention_longitude}
                              label={appointment.intervention_adresse || appointment.client_nom}
                              compact
                            />
                          </div>
                        ) : null}

                        {(appointment.transitions_autorisees || []).length > 0 ? (
                          <div className="mt-5 flex flex-wrap gap-2 border-t border-black/5 pt-4">
                            {(appointment.transitions_autorisees || []).map((transition) => {
                              const action = ACTIONS[transition];
                              if (!action) return null;
                              const semantic = transition === 'termine'
                                ? 'bg-[#0B6B50] hover:bg-[#095A43]'
                                : transition === 'annule_artisan' || transition === 'refuse'
                                  ? 'border border-[#E7C5C1] bg-white text-[#B23A31] hover:bg-[#FFF4F2]'
                                  : action[1];
                              return (
                                <button
                                  key={transition}
                                  onClick={() => updateStatus(appointment, transition)}
                                  className={`${semantic} rounded-xl px-4 py-2.5 text-sm font-black ${transition === 'annule_artisan' || transition === 'refuse' ? '' : 'text-white'}`}
                                >
                                  {action[0]}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold text-lg">Horaires habituels</h3>
            <p className="text-sm text-gray-500 mb-4">
              Ces plages déterminent les créneaux que les clients peuvent réserver.
            </p>

            <form onSubmit={addAvailability} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <select
                value={availabilityForm.jour_semaine}
                onChange={(event) => setAvailabilityForm({ ...availabilityForm, jour_semaine: event.target.value })}
                className="border rounded p-2"
              >
                {WEEKDAYS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <input
                type="time"
                value={availabilityForm.heure_debut}
                onChange={(event) => setAvailabilityForm({ ...availabilityForm, heure_debut: event.target.value })}
                className="border rounded p-2"
                required
              />
              <input
                type="time"
                value={availabilityForm.heure_fin}
                onChange={(event) => setAvailabilityForm({ ...availabilityForm, heure_fin: event.target.value })}
                className="border rounded p-2"
                required
              />
              <button className="sm:col-span-3 bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2">
                Ajouter cette plage
              </button>
            </form>

            <div className="space-y-2">
              {availabilities.length === 0 ? (
                <p className="text-sm text-amber-700">
                  Aucune disponibilité configurée : les clients ne verront aucun créneau réservable.
                </p>
              ) : (
                availabilities.map((availability) => (
                  <div key={availability.id} className="flex items-center justify-between border rounded p-3">
                    <span className="text-sm">
                      <strong>{availability.jour_label}</strong> · {availability.heure_debut.slice(0, 5)} - {availability.heure_fin.slice(0, 5)}
                    </span>
                    <button
                      onClick={() => deleteAvailability(availability.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Supprimer
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold text-lg">Indisponibilités exceptionnelles</h3>
            <p className="text-sm text-gray-500 mb-4">
              Bloquez une période pour congé, déplacement, urgence ou autre indisponibilité.
            </p>

            <form onSubmit={addTimeOff} className="space-y-3 mb-5">
              <div>
                <label className="block text-sm font-medium mb-1">Début</label>
                <input
                  type="datetime-local"
                  value={timeOffForm.debut}
                  onChange={(event) => setTimeOffForm({ ...timeOffForm, debut: event.target.value })}
                  className="border rounded p-2 w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fin</label>
                <input
                  type="datetime-local"
                  value={timeOffForm.fin}
                  onChange={(event) => setTimeOffForm({ ...timeOffForm, fin: event.target.value })}
                  className="border rounded p-2 w-full"
                  required
                />
              </div>
              <input
                type="text"
                maxLength={180}
                placeholder="Motif (facultatif)"
                value={timeOffForm.motif}
                onChange={(event) => setTimeOffForm({ ...timeOffForm, motif: event.target.value })}
                className="border rounded p-2 w-full"
              />
              <button className="bg-gray-800 hover:bg-gray-900 text-white rounded px-4 py-2 w-full">
                Bloquer cette période
              </button>
            </form>

            <div className="space-y-2">
              {timeOffs.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune indisponibilité enregistrée.</p>
              ) : (
                timeOffs.map((timeOff) => (
                  <div key={timeOff.id} className="border rounded p-3">
                    <div className="flex justify-between gap-3">
                      <div className="text-sm">
                        <p>{new Date(timeOff.debut).toLocaleString('fr-FR')}</p>
                        <p>→ {new Date(timeOff.fin).toLocaleString('fr-FR')}</p>
                        {timeOff.motif && <p className="text-gray-500 mt-1">{timeOff.motif}</p>}
                      </div>
                      <button
                        onClick={() => deleteTimeOff(timeOff.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {completionModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="completion-payment-title"
        >
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-[26px] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-black/5 bg-white px-5 py-4 sm:px-6">
              <h3 id="completion-payment-title" className="text-lg font-bold text-gray-900">
                Terminer la prestation & renseigner le règlement
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                La prestation ne sera marquée comme terminée qu'après validation de ces informations.
              </p>
            </div>

            {completionLoading || !completionPreview ? (
              <div className="p-6 text-center text-gray-500">Chargement des informations…</div>
            ) : (
              <form onSubmit={submitCompletion} className="space-y-6 p-5 sm:p-6">
                <div className="rounded-2xl border border-black/5 bg-[#F7F9F7] p-4 text-sm">
                  <p><strong>Client :</strong> {completionPreview.client_username}</p>
                  <p><strong>Prestation :</strong> {completionPreview.service_titre}</p>
                  {completionPreview.quote_reference && (
                    <p><strong>Devis :</strong> {completionPreview.quote_reference}</p>
                  )}
                  <p className="mt-2 text-base font-semibold text-gray-900">
                    Montant prévu : {new Intl.NumberFormat('fr-FR').format(Number(completionPreview.montant || 0))} FCFA
                  </p>
                </div>

                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-gray-800">Le client a-t-il payé ?</legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className={`cursor-pointer rounded-lg border p-3 ${paymentForm.statut === 'paid' ? 'border-green-600 bg-green-50' : 'border-gray-200'}`}>
                      <input
                        type="radio"
                        name="payment-status"
                        value="paid"
                        checked={paymentForm.statut === 'paid'}
                        onChange={(event) => setPaymentForm({ ...paymentForm, statut: event.target.value })}
                        className="mr-2"
                      />
                      <span className="font-medium text-green-800">Oui, payé</span>
                    </label>
                    <label className={`cursor-pointer rounded-lg border p-3 ${paymentForm.statut === 'unpaid' ? 'border-amber-500 bg-amber-50' : 'border-gray-200'}`}>
                      <input
                        type="radio"
                        name="payment-status"
                        value="unpaid"
                        checked={paymentForm.statut === 'unpaid'}
                        onChange={(event) => setPaymentForm({
                          ...paymentForm,
                          statut: event.target.value,
                          methode_paiement: '',
                          payment_reference: '',
                        })}
                        className="mr-2"
                      />
                      <span className="font-medium text-amber-800">Non, pas encore payé</span>
                    </label>
                  </div>
                </fieldset>

                {paymentForm.statut === 'paid' && (
                  <section className="space-y-4 rounded-2xl border border-[#E4EAE6] bg-[#FBFCFB] p-4">
                    <fieldset>
                      <legend className="mb-3 text-sm font-bold text-[#334139]">Moyen de paiement *</legend>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {paymentMethods.map((method) => {
                          const selected = paymentForm.methode_paiement === method.value;
                          return (
                            <button
                              key={method.value}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => setPaymentForm({ ...paymentForm, methode_paiement: method.value })}
                              className={`min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-black transition ${selected ? 'border-[#0B6B50] bg-[#EAF4F0] text-[#0B6B50] ring-1 ring-[#0B6B50]/20' : 'border-[#DDE5E0] bg-white text-[#526159] hover:border-[#AFC2B8]'}`}
                            >
                              {selected ? '✓ ' : ''}{method.label}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div>
                      <label htmlFor="completion-payment-reference" className="mb-1.5 block text-sm font-bold text-[#334139]">
                        Référence du paiement <span className="font-medium text-[#829087]">(facultatif)</span>
                      </label>
                      <input
                        id="completion-payment-reference"
                        type="text"
                        maxLength={100}
                        value={paymentForm.payment_reference}
                        onChange={(event) => setPaymentForm({ ...paymentForm, payment_reference: event.target.value })}
                        placeholder="Ex. référence Wave, Orange Money ou virement"
                        className="w-full rounded-xl border border-[#DDE5E0] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#0B6B50] focus:ring-2 focus:ring-[#0B6B50]/10"
                      />
                    </div>
                  </section>
                )}

                <div>
                  <label htmlFor="completion-payment-notes" className="mb-1.5 block text-sm font-bold text-[#334139]">
                    Note facultative
                  </label>
                  <textarea
                    id="completion-payment-notes"
                    rows={3}
                    maxLength={255}
                    value={paymentForm.notes}
                    onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })}
                    placeholder="Précision sur le règlement ou la prestation…"
                    className="w-full resize-y rounded-xl border border-[#DDE5E0] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#0B6B50] focus:ring-2 focus:ring-[#0B6B50]/10"
                  />
                </div>

                <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-col-reverse gap-2 border-t border-black/5 bg-white px-5 py-4 sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:px-6">
                  <button
                    type="button"
                    onClick={closeCompletionModal}
                    disabled={completionSubmitting}
                    className="rounded-xl border border-[#DDE5E0] px-4 py-3 text-sm font-bold text-[#526159] disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={completionSubmitting || !paymentForm.statut}
                    className="rounded-xl bg-[#0B6B50] px-5 py-3 text-sm font-black text-white hover:bg-[#095A43] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {completionSubmitting ? 'Enregistrement…' : 'Confirmer la fin de la prestation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
