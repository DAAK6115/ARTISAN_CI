import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';

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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchAppointments(), fetchSchedule()]);
      setLoading(false);
    };
    load();
  }, []);

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

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h2 className="text-xl font-bold">📋 Rendez-vous & disponibilités</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-3 py-2 rounded text-sm ${activeTab === 'appointments' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            Rendez-vous
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-3 py-2 rounded text-sm ${activeTab === 'schedule' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            Mes disponibilités
          </button>
        </div>
      </div>

      {message && <p className="text-sm mb-4 text-blue-600">{message}</p>}

      {loading ? (
        <p>Chargement...</p>
      ) : activeTab === 'appointments' ? (
        <div className="grid gap-4">
          {appointments.length === 0 ? (
            <p className="text-gray-500">Aucun rendez-vous pour l’instant.</p>
          ) : (
            appointments.map((appointment) => (
              <div key={appointment.id} className="p-4 border rounded bg-white shadow-sm">
                <div className="flex flex-col md:flex-row md:justify-between gap-3">
                  <div>
                    <p><strong>👤 Client :</strong> {appointment.client_nom}</p>
                    <p><strong>🛠 Prestation :</strong> {appointment.service_titre}</p>
                    <p><strong>📅 Début :</strong> {new Date(appointment.date_rdv).toLocaleString('fr-FR')}</p>
                    <p><strong>⏱ Fin prévue :</strong> {new Date(appointment.date_fin).toLocaleString('fr-FR')}</p>
                  </div>
                  <div>
                    <span className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                      {STATUS_LABELS[appointment.statut] || appointment.statut}
                    </span>
                  </div>
                </div>

                {appointment.commentaires && (
                  <p className="mt-2 text-sm text-gray-600">💬 {appointment.commentaires}</p>
                )}
                {appointment.motif_annulation && (
                  <p className="mt-2 text-sm text-red-600">Motif : {appointment.motif_annulation}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {(appointment.transitions_autorisees || []).map((transition) => {
                    const action = ACTIONS[transition];
                    if (!action) return null;
                    return (
                      <button
                        key={transition}
                        onClick={() => updateStatus(appointment, transition)}
                        className={`${action[1]} text-white px-3 py-2 rounded text-sm`}
                      >
                        {action[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
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
          <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
            <div className="border-b px-5 py-4">
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
              <form onSubmit={submitCompletion} className="space-y-5 p-5">
                <div className="rounded-lg bg-gray-50 p-4 text-sm">
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="completion-payment-method" className="mb-1 block text-sm font-medium text-gray-700">
                        Moyen de paiement *
                      </label>
                      <select
                        id="completion-payment-method"
                        value={paymentForm.methode_paiement}
                        onChange={(event) => setPaymentForm({ ...paymentForm, methode_paiement: event.target.value })}
                        className="w-full rounded border p-2"
                        required
                      >
                        <option value="">-- Sélectionner --</option>
                        {(completionPreview.payment_methods || []).map((method) => (
                          <option key={method.value} value={method.value}>{method.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="completion-payment-reference" className="mb-1 block text-sm font-medium text-gray-700">
                        Référence du paiement
                      </label>
                      <input
                        id="completion-payment-reference"
                        type="text"
                        maxLength={100}
                        value={paymentForm.payment_reference}
                        onChange={(event) => setPaymentForm({ ...paymentForm, payment_reference: event.target.value })}
                        placeholder="Ex. référence Wave / Orange Money"
                        className="w-full rounded border p-2"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="completion-payment-notes" className="mb-1 block text-sm font-medium text-gray-700">
                    Note facultative
                  </label>
                  <textarea
                    id="completion-payment-notes"
                    rows={3}
                    maxLength={255}
                    value={paymentForm.notes}
                    onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })}
                    placeholder="Précision sur le règlement ou la prestation…"
                    className="w-full rounded border p-2"
                  />
                </div>

                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={closeCompletionModal}
                    disabled={completionSubmitting}
                    className="rounded border px-4 py-2 text-sm text-gray-700 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={completionSubmitting || !paymentForm.statut}
                    className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
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
