import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Plus,
  Power,
  Route,
  Settings2,
  Trash2,
  UserRound,
  Wrench,
  X,
  XCircle
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/http';
import { MobileTopBar } from '../components/MobileTopBar';
import {
  getArtisanAppointments,
  getArtisanAvailabilities,
  createArtisanAvailability,
  deleteArtisanAvailability,
  getArtisanTimeOffs,
  createArtisanTimeOff,
  deleteArtisanTimeOff
} from '../features/artisan/artisan.api';
import { updateAppointmentStatus, type AppointmentItem } from '../features/appointments/appointments.api';
import { completeServiceWithPayment, getCompleteServicePayment } from '../features/artisan/professional.api';

type AgendaTab = 'rendez-vous' | 'horaires';
type AppointmentFilter = 'tous' | 'en_attente' | 'actifs' | 'termines';

const transitionLabels: Record<string, string> = {
  accepte: 'Accepter',
  refuse: 'Refuser',
  confirme: 'Confirmer',
  en_route: 'Je suis en route',
  en_cours: 'Démarrer',
  termine: 'Terminer',
  annule_artisan: 'Annuler'
};

const statusClasses: Record<string, string> = {
  en_attente: 'bg-[var(--artisan-gold-soft)] text-[#8A6200]',
  accepte: 'bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]',
  confirme: 'bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]',
  en_route: 'bg-[#EEF4FF] text-[#315E9B]',
  en_cours: 'bg-[var(--artisan-orange-soft)] text-[var(--artisan-orange)]',
  termine: 'bg-[#F1F2F1] text-[#4E5C55]',
  effectue: 'bg-[#E9F6EE] text-[#247844]',
  refuse: 'bg-[var(--artisan-danger-soft)] text-[var(--artisan-danger)]',
  annule_artisan: 'bg-[var(--artisan-danger-soft)] text-[var(--artisan-danger)]',
  annule_client: 'bg-[var(--artisan-danger-soft)] text-[var(--artisan-danger)]',
  annule: 'bg-[var(--artisan-danger-soft)] text-[var(--artisan-danger)]'
};

const days = [
  [0, 'Lundi'],
  [1, 'Mardi'],
  [2, 'Mercredi'],
  [3, 'Jeudi'],
  [4, 'Vendredi'],
  [5, 'Samedi'],
  [6, 'Dimanche']
] as const;

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function timeLabel(value: string): string {
  return value.slice(0, 5);
}

function appointmentMatches(item: AppointmentItem, filter: AppointmentFilter): boolean {
  if (filter === 'tous') return true;
  if (filter === 'en_attente') return item.statut === 'en_attente';
  if (filter === 'actifs') return ['accepte', 'confirme', 'en_route', 'en_cours', 'termine'].includes(item.statut);
  return ['effectue', 'refuse', 'annule_client', 'annule_artisan', 'annule'].includes(item.statut);
}

export function ArtisanAgendaPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const highlightedId = Number(searchParams.get('rdv') || 0);
  const [tab, setTab] = useState<AgendaTab>('rendez-vous');
  const [filter, setFilter] = useState<AppointmentFilter>('tous');
  const [actionTarget, setActionTarget] = useState<{ appointment: AppointmentItem; statut: string } | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [actionError, setActionError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  const [paymentMethod, setPaymentMethod] = useState('wave');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [timeOffOpen, setTimeOffOpen] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [timeOffError, setTimeOffError] = useState('');

  const appointments = useQuery({
    queryKey: ['artisan-appointments'],
    queryFn: getArtisanAppointments
  });

  const availabilities = useQuery({
    queryKey: ['artisan-availabilities'],
    queryFn: getArtisanAvailabilities,
    enabled: tab === 'horaires'
  });

  const timeOffs = useQuery({
    queryKey: ['artisan-time-offs'],
    queryFn: getArtisanTimeOffs,
    enabled: tab === 'horaires'
  });

  const paymentInfo = useQuery({
    queryKey: ['artisan-complete-service', actionTarget?.appointment.id],
    queryFn: () => getCompleteServicePayment(actionTarget!.appointment.id),
    enabled: actionTarget?.statut === 'termine' && Boolean(actionTarget?.appointment.id),
    retry: false
  });

  const transitionMutation = useMutation({
    mutationFn: ({ id, statut, motif }: { id: number; statut: string; motif: string }) =>
      updateAppointmentStatus(id, statut, motif || undefined),
    onSuccess: async () => {
      setActionTarget(null);
      setActionNote('');
      setActionError('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['artisan-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['artisan-dashboard'] })
      ]);
    },
    onError: (error) => {
      setActionError(error instanceof ApiError ? error.message : 'Impossible de mettre à jour ce rendez-vous.');
    }
  });

  const completeServiceMutation = useMutation({
    mutationFn: ({ id }: { id: number }) => completeServiceWithPayment(id, {
      statut: paymentStatus,
      methode_paiement: paymentStatus === 'paid' ? paymentMethod : null,
      payment_reference: paymentStatus === 'paid' ? paymentReference.trim() : '',
      notes: paymentNotes.trim()
    }),
    onSuccess: async () => {
      setActionTarget(null);
      setPaymentStatus('paid');
      setPaymentMethod('wave');
      setPaymentReference('');
      setPaymentNotes('');
      setActionError('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['artisan-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['artisan-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['artisan-payment-workspace'] }),
        queryClient.invalidateQueries({ queryKey: ['artisan-payments'] })
      ]);
    },
    onError: (error) => {
      setActionError(error instanceof ApiError ? error.message : 'Impossible de terminer cette prestation.');
    }
  });

  const createAvailabilityMutation = useMutation({
    mutationFn: createArtisanAvailability,
    onSuccess: async () => {
      setAvailabilityOpen(false);
      setAvailabilityError('');
      await queryClient.invalidateQueries({ queryKey: ['artisan-availabilities'] });
    },
    onError: (error) => {
      setAvailabilityError(error instanceof ApiError ? error.message : 'Impossible d’ajouter cette disponibilité.');
    }
  });

  const deleteAvailabilityMutation = useMutation({
    mutationFn: deleteArtisanAvailability,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['artisan-availabilities'] })
  });

  const createTimeOffMutation = useMutation({
    mutationFn: createArtisanTimeOff,
    onSuccess: async () => {
      setTimeOffOpen(false);
      setTimeOffError('');
      await queryClient.invalidateQueries({ queryKey: ['artisan-time-offs'] });
    },
    onError: (error) => {
      setTimeOffError(error instanceof ApiError ? error.message : 'Impossible d’ajouter cette indisponibilité.');
    }
  });

  const deleteTimeOffMutation = useMutation({
    mutationFn: deleteArtisanTimeOff,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['artisan-time-offs'] })
  });

  const visibleAppointments = useMemo(() => {
    const list = (appointments.data ?? []).filter((item) => appointmentMatches(item, filter));
    if (!highlightedId) return list;
    return [...list].sort((a, b) => Number(b.id === highlightedId) - Number(a.id === highlightedId));
  }, [appointments.data, filter, highlightedId]);

  function submitAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAvailabilityError('');
    const data = new FormData(event.currentTarget);
    const day = Number(data.get('jour_semaine'));
    const start = String(data.get('heure_debut') ?? '');
    const end = String(data.get('heure_fin') ?? '');
    if (!start || !end || start >= end) {
      setAvailabilityError('Choisissez une heure de fin postérieure à l’heure de début.');
      return;
    }
    createAvailabilityMutation.mutate({ jour_semaine: day, heure_debut: start, heure_fin: end, actif: true });
  }

  function submitTimeOff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTimeOffError('');
    const data = new FormData(event.currentTarget);
    const startRaw = String(data.get('debut') ?? '');
    const endRaw = String(data.get('fin') ?? '');
    const motif = String(data.get('motif') ?? '').trim();
    const start = new Date(startRaw);
    const end = new Date(endRaw);
    if (!startRaw || !endRaw || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      setTimeOffError('La fin doit être postérieure au début.');
      return;
    }
    createTimeOffMutation.mutate({ debut: start.toISOString(), fin: end.toISOString(), motif });
  }

  return (
    <div>
      <MobileTopBar />

      <section className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Organisation</p>
          <h1 className="mt-1.5 text-[28px] font-black tracking-[-0.045em] text-[var(--artisan-ink)]">Agenda</h1>
          <p className="mt-1 text-sm leading-5 text-[var(--artisan-muted)]">Gérez vos demandes, vos créneaux et vos absences.</p>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 rounded-2xl bg-[#EEF1EF] p-1">
        {([
          ['rendez-vous', 'Rendez-vous', CalendarDays],
          ['horaires', 'Horaires', Settings2]
        ] as const).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`flex items-center justify-center gap-2 rounded-[14px] px-3 py-2.5 text-xs font-black transition ${
              tab === value ? 'bg-white text-[var(--artisan-green)] shadow-sm' : 'text-[var(--artisan-muted)]'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'rendez-vous' ? (
        <section className="mt-5">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {([
              ['tous', 'Tous'],
              ['en_attente', 'À traiter'],
              ['actifs', 'En cours'],
              ['termines', 'Terminés']
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-black ${
                  filter === value
                    ? 'bg-[var(--artisan-green)] text-white'
                    : 'border border-black/5 bg-white text-[var(--artisan-text)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {appointments.isPending ? [1, 2, 3].map((item) => (
              <div key={item} className="h-44 animate-pulse rounded-3xl bg-white" />
            )) : null}

            {appointments.isError ? (
              <div className="rounded-3xl bg-[var(--artisan-danger-soft)] p-5 text-sm font-semibold text-[var(--artisan-danger)]">
                Impossible de charger vos rendez-vous.
              </div>
            ) : null}

            {!appointments.isPending && !appointments.isError && visibleAppointments.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#CBD5D0] bg-white/70 px-5 py-9 text-center">
                <CalendarDays className="mx-auto text-[var(--artisan-green)]" size={30} />
                <p className="mt-3 text-sm font-black text-[var(--artisan-ink)]">Aucun rendez-vous ici</p>
                <p className="mt-1 text-xs leading-5 text-[var(--artisan-muted)]">Les nouvelles demandes apparaîtront automatiquement.</p>
              </div>
            ) : null}

            {visibleAppointments.map((item) => {
              const highlighted = item.id === highlightedId;
              return (
                <article
                  key={item.id}
                  className={`rounded-3xl border bg-white p-4 shadow-[var(--artisan-shadow-card)] ${
                    highlighted ? 'border-[var(--artisan-green)]/40 ring-2 ring-[var(--artisan-green)]/10' : 'border-black/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]">
                      <Wrench size={19} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="truncate text-[15px] font-black text-[var(--artisan-ink)]">{item.service_titre}</h2>
                          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--artisan-muted)]">
                            <UserRound size={13} /> {item.client_nom}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${statusClasses[item.statut] ?? 'bg-[#F1F2F1] text-[#4E5C55]'}`}>
                          {item.statut_label}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-[#607068]">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F8F6] px-2.5 py-1.5"><Clock3 size={12} /> {dateLabel(item.date_rdv)}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F8F6] px-2.5 py-1.5">{item.service_duree_minutes} min</span>
                      </div>

                      {item.commentaires ? (
                        <div className="mt-3 rounded-2xl bg-[#F7F8F6] px-3 py-2.5 text-xs leading-5 text-[var(--artisan-text)]">
                          “{item.commentaires}”
                        </div>
                      ) : null}

                      {item.transitions_autorisees.length ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.transitions_autorisees.map((transition) => {
                            const destructive = transition === 'refuse' || transition === 'annule_artisan';
                            return (
                              <button
                                key={transition}
                                type="button"
                                onClick={() => {
                                  setActionError('');
                                  setActionNote('');
                                  setPaymentStatus('paid');
                                  setPaymentMethod('wave');
                                  setPaymentReference('');
                                  setPaymentNotes('');
                                  setActionTarget({ appointment: item, statut: transition });
                                }}
                                className={`rounded-2xl px-3.5 py-2.5 text-xs font-black transition active:scale-[.98] ${
                                  destructive
                                    ? 'bg-[var(--artisan-danger-soft)] text-[var(--artisan-danger)]'
                                    : 'bg-[var(--artisan-green)] text-white'
                                }`}
                              >
                                {transitionLabels[transition] ?? transition}
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
        </section>
      ) : (
        <section className="mt-6 space-y-7">
          <div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--artisan-green)]">Planning hebdomadaire</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--artisan-ink)]">Mes disponibilités</h2>
              </div>
              <button
                type="button"
                onClick={() => setAvailabilityOpen(true)}
                className="grid size-10 place-items-center rounded-2xl bg-[var(--artisan-green)] text-white"
                aria-label="Ajouter une disponibilité"
              >
                <Plus size={19} />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {availabilities.isPending ? <div className="h-24 animate-pulse rounded-3xl bg-white" /> : null}
              {availabilities.data?.length ? availabilities.data.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-3xl border border-black/5 bg-white p-4 shadow-[var(--artisan-shadow-sm)]">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]"><Clock3 size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-[var(--artisan-ink)]">{item.jour_label}</p>
                    <p className="mt-0.5 text-xs font-semibold text-[var(--artisan-muted)]">{timeLabel(item.heure_debut)} → {timeLabel(item.heure_fin)}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[9px] font-black ${item.actif ? 'bg-[#E9F6EE] text-[#247844]' : 'bg-[#F1F2F1] text-[#66736D]'}`}>
                    {item.actif ? 'Actif' : 'Inactif'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Supprimer cette plage de disponibilité ?')) deleteAvailabilityMutation.mutate(item.id);
                    }}
                    className="grid size-9 place-items-center rounded-xl bg-[var(--artisan-danger-soft)] text-[var(--artisan-danger)]"
                    aria-label="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )) : !availabilities.isPending ? (
                <div className="rounded-3xl border border-dashed border-[#CBD5D0] bg-white/70 p-6 text-center text-xs font-semibold text-[var(--artisan-muted)]">
                  Ajoutez au moins une disponibilité pour que les clients puissent réserver.
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--artisan-orange)]">Exceptions</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--artisan-ink)]">Indisponibilités</h2>
              </div>
              <button
                type="button"
                onClick={() => setTimeOffOpen(true)}
                className="grid size-10 place-items-center rounded-2xl bg-[var(--artisan-orange)] text-white"
                aria-label="Ajouter une indisponibilité"
              >
                <Plus size={19} />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {timeOffs.isPending ? <div className="h-24 animate-pulse rounded-3xl bg-white" /> : null}
              {timeOffs.data?.length ? timeOffs.data.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-3xl border border-black/5 bg-white p-4 shadow-[var(--artisan-shadow-sm)]">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--artisan-orange-soft)] text-[var(--artisan-orange)]"><Power size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-[var(--artisan-ink)]">{dateLabel(item.debut)}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-[var(--artisan-muted)]">jusqu’au {dateLabel(item.fin)}</p>
                    {item.motif ? <p className="mt-1 truncate text-[11px] text-[var(--artisan-text)]">{item.motif}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Supprimer cette indisponibilité ?')) deleteTimeOffMutation.mutate(item.id);
                    }}
                    className="grid size-9 place-items-center rounded-xl bg-[var(--artisan-danger-soft)] text-[var(--artisan-danger)]"
                    aria-label="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )) : !timeOffs.isPending ? (
                <div className="rounded-3xl border border-dashed border-[#CBD5D0] bg-white/70 p-6 text-center text-xs font-semibold text-[var(--artisan-muted)]">
                  Aucune indisponibilité programmée.
                </div>
              ) : null}
            </div>
          </div>
        </section>
      )}

      {actionTarget ? (
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-[2px]" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0" onClick={() => setActionTarget(null)} aria-label="Fermer" />
          <div
            className="absolute inset-x-2 bottom-2 mx-auto grid max-w-[536px] overflow-hidden rounded-[28px] bg-white shadow-2xl"
            style={{
              maxHeight: 'calc(100dvh - 16px)',
              gridTemplateRows: 'auto minmax(0, 1fr) auto'
            }}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-2 pt-5">
              <div>
                <p className="text-lg font-black text-[var(--artisan-ink)]">{transitionLabels[actionTarget.statut] ?? 'Mettre à jour'}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--artisan-muted)]">{actionTarget.appointment.service_titre} · {actionTarget.appointment.client_nom}</p>
              </div>
              <button type="button" onClick={() => setActionTarget(null)} className="grid size-9 place-items-center rounded-xl bg-[#F4F6F4]" aria-label="Fermer"><X size={18} /></button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-1">
            {actionTarget.statut === 'termine' ? (
              <div className="mt-4 space-y-4">
                {paymentInfo.isPending ? <div className="h-20 animate-pulse rounded-2xl bg-[#F4F6F4]" /> : null}
                {paymentInfo.data ? (
                  <div className="rounded-2xl bg-[#F7F8F6] p-4">
                    <p className="text-[10px] font-black uppercase tracking-wide text-[#829087]">Montant de la prestation</p>
                    <p className="mt-1 text-xl font-black text-[var(--artisan-green)]">{new Intl.NumberFormat('fr-CI').format(Number(paymentInfo.data.montant || 0))} FCFA</p>
                    {paymentInfo.data.quote_reference ? <p className="mt-1 text-[10px] font-semibold text-[var(--artisan-muted)]">Devis {paymentInfo.data.quote_reference}</p> : null}
                  </div>
                ) : null}
                {paymentInfo.isError ? <p className="rounded-2xl bg-[var(--artisan-danger-soft)] px-3 py-2 text-xs font-semibold text-[var(--artisan-danger)]">Impossible de préparer la déclaration de règlement.</p> : null}

                <div>
                  <p className="text-xs font-black text-[var(--artisan-text)]">Le règlement a-t-il été reçu ?</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setPaymentStatus('paid')} className={`min-h-11 rounded-2xl text-xs font-black ${paymentStatus === 'paid' ? 'bg-[var(--artisan-green)] text-white' : 'bg-[#F4F6F4] text-[var(--artisan-muted)]'}`}>Oui, payé</button>
                    <button type="button" onClick={() => setPaymentStatus('unpaid')} className={`min-h-11 rounded-2xl text-xs font-black ${paymentStatus === 'unpaid' ? 'bg-[var(--artisan-gold)] text-[#4B3900]' : 'bg-[#F4F6F4] text-[var(--artisan-muted)]'}`}>Non payé</button>
                  </div>
                </div>

                {paymentStatus === 'paid' ? (
                  <>
                    <label className="block">
                      <span className="text-xs font-black text-[var(--artisan-text)]">Méthode de paiement *</span>
                      <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-[#DDE5E0] bg-white px-3.5 text-sm font-bold outline-none focus:border-[var(--artisan-green)]">
                        {(paymentInfo.data?.payment_methods ?? [
                          { value: 'wave', label: 'Wave' },
                          { value: 'orange_money', label: 'Orange Money' },
                          { value: 'mtn_money', label: 'MTN Money' },
                          { value: 'moov_money', label: 'Moov Money' },
                          { value: 'cash', label: 'Espèces' },
                          { value: 'bank_transfer', label: 'Virement bancaire' },
                          { value: 'other', label: 'Autre' }
                        ]).map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-black text-[var(--artisan-text)]">Référence <span className="font-semibold text-[var(--artisan-muted)]">(facultatif)</span></span>
                      <input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value.slice(0, 100))} placeholder="Ex. référence Wave / Orange" className="mt-2 min-h-12 w-full rounded-2xl border border-[#DDE5E0] bg-white px-3.5 text-sm font-semibold outline-none focus:border-[var(--artisan-green)]" />
                    </label>
                  </>
                ) : null}

                <label className="block">
                  <span className="text-xs font-black text-[var(--artisan-text)]">Note <span className="font-semibold text-[var(--artisan-muted)]">(facultatif)</span></span>
                  <textarea value={paymentNotes} onChange={(event) => setPaymentNotes(event.target.value.slice(0, 255))} rows={2} placeholder="Information utile sur le règlement…" className="mt-2 w-full resize-none rounded-2xl border border-[#DDE5E0] bg-white px-3.5 py-3 text-sm outline-none focus:border-[var(--artisan-green)]" />
                </label>
              </div>
            ) : (actionTarget.statut === 'refuse' || actionTarget.statut === 'annule_artisan') ? (
              <label className="mt-4 block">
                <span className="text-xs font-black text-[var(--artisan-text)]">Motif</span>
                <textarea
                  value={actionNote}
                  onChange={(event) => setActionNote(event.target.value)}
                  maxLength={255}
                  rows={3}
                  placeholder="Expliquez brièvement la raison…"
                  className="mt-2 w-full resize-none rounded-2xl border border-[#DDE5E0] bg-[#F9FAF9] px-3.5 py-3 text-sm outline-none focus:border-[var(--artisan-green)]"
                />
              </label>
            ) : (
              <div className="mt-4 rounded-2xl bg-[var(--artisan-green-soft)] p-3 text-xs leading-5 text-[var(--artisan-green-dark)]">
                Cette action fera passer le rendez-vous à l’étape suivante du suivi client.
              </div>
            )}

            {actionError ? <p className="mt-3 rounded-2xl bg-[var(--artisan-danger-soft)] px-3 py-2 text-xs font-semibold text-[var(--artisan-danger)]">{actionError}</p> : null}
            </div>

            <div
              className="relative z-20 border-t border-black/5 bg-white px-5 pt-3 shadow-[0_-10px_30px_rgba(20,38,30,0.06)]"
              style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
            >
            <button
              type="button"
              disabled={transitionMutation.isPending || completeServiceMutation.isPending || (actionTarget.statut === 'termine' && paymentInfo.isPending)}
              onClick={() => {
                if (!actionTarget) return;
                if ((actionTarget.statut === 'refuse' || actionTarget.statut === 'annule_artisan') && !actionNote.trim()) {
                  setActionError('Indiquez un motif avant de continuer.');
                  return;
                }
                if (actionTarget.statut === 'termine') {
                  if (paymentStatus === 'paid' && !paymentMethod) {
                    setActionError('Choisissez une méthode de paiement.');
                    return;
                  }
                  completeServiceMutation.mutate({ id: actionTarget.appointment.id });
                  return;
                }
                transitionMutation.mutate({ id: actionTarget.appointment.id, statut: actionTarget.statut, motif: actionNote.trim() });
              }}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-black text-white shadow-sm disabled:opacity-60"
              style={{
                backgroundColor:
                  actionTarget.statut === 'refuse' || actionTarget.statut === 'annule_artisan'
                    ? '#D84A3A'
                    : '#0B6B50'
              }}
            >
              {actionTarget.statut === 'en_route' ? <Route size={18} /> : actionTarget.statut === 'refuse' || actionTarget.statut === 'annule_artisan' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
              {transitionMutation.isPending || completeServiceMutation.isPending ? 'Mise à jour…' : actionTarget.statut === 'termine' ? 'Terminer et enregistrer le règlement' : transitionLabels[actionTarget.statut] ?? 'Confirmer'}
            </button>
            </div>
          </div>
        </div>
      ) : null}

      {availabilityOpen ? (
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-[2px]" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0" onClick={() => setAvailabilityOpen(false)} aria-label="Fermer" />
          <form onSubmit={submitAvailability} className="absolute inset-x-3 bottom-3 mx-auto max-w-[536px] rounded-[28px] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-lg font-black text-[var(--artisan-ink)]">Ajouter un créneau</p><p className="mt-1 text-xs text-[var(--artisan-muted)]">Définissez vos horaires habituels.</p></div>
              <button type="button" onClick={() => setAvailabilityOpen(false)} className="grid size-9 place-items-center rounded-xl bg-[#F4F6F4]"><X size={18} /></button>
            </div>

            <label className="mt-4 block text-xs font-black text-[var(--artisan-text)]">Jour
              <select name="jour_semaine" defaultValue="0" className="mt-2 w-full rounded-2xl border border-[#DDE5E0] bg-[#F9FAF9] px-3.5 py-3 text-sm outline-none focus:border-[var(--artisan-green)]">
                {days.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-xs font-black text-[var(--artisan-text)]">Début<input required type="time" name="heure_debut" defaultValue="08:00" className="mt-2 w-full rounded-2xl border border-[#DDE5E0] bg-[#F9FAF9] px-3 py-3 text-sm outline-none focus:border-[var(--artisan-green)]" /></label>
              <label className="text-xs font-black text-[var(--artisan-text)]">Fin<input required type="time" name="heure_fin" defaultValue="17:00" className="mt-2 w-full rounded-2xl border border-[#DDE5E0] bg-[#F9FAF9] px-3 py-3 text-sm outline-none focus:border-[var(--artisan-green)]" /></label>
            </div>
            {availabilityError ? <p className="mt-3 rounded-2xl bg-[var(--artisan-danger-soft)] px-3 py-2 text-xs font-semibold text-[var(--artisan-danger)]">{availabilityError}</p> : null}
            <button disabled={createAvailabilityMutation.isPending} className="mt-4 w-full rounded-2xl bg-[var(--artisan-green)] px-4 py-3.5 text-sm font-black text-white disabled:opacity-60">{createAvailabilityMutation.isPending ? 'Ajout…' : 'Ajouter la disponibilité'}</button>
          </form>
        </div>
      ) : null}

      {timeOffOpen ? (
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-[2px]" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0" onClick={() => setTimeOffOpen(false)} aria-label="Fermer" />
          <form onSubmit={submitTimeOff} className="absolute inset-x-3 bottom-3 mx-auto max-w-[536px] rounded-[28px] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-lg font-black text-[var(--artisan-ink)]">Ajouter une indisponibilité</p><p className="mt-1 text-xs text-[var(--artisan-muted)]">Bloquez une période exceptionnelle.</p></div>
              <button type="button" onClick={() => setTimeOffOpen(false)} className="grid size-9 place-items-center rounded-xl bg-[#F4F6F4]"><X size={18} /></button>
            </div>
            <label className="mt-4 block text-xs font-black text-[var(--artisan-text)]">Début<input required type="datetime-local" name="debut" className="mt-2 w-full rounded-2xl border border-[#DDE5E0] bg-[#F9FAF9] px-3 py-3 text-sm outline-none focus:border-[var(--artisan-green)]" /></label>
            <label className="mt-3 block text-xs font-black text-[var(--artisan-text)]">Fin<input required type="datetime-local" name="fin" className="mt-2 w-full rounded-2xl border border-[#DDE5E0] bg-[#F9FAF9] px-3 py-3 text-sm outline-none focus:border-[var(--artisan-green)]" /></label>
            <label className="mt-3 block text-xs font-black text-[var(--artisan-text)]">Motif <span className="font-semibold text-[var(--artisan-muted)]">(facultatif)</span><input name="motif" maxLength={180} placeholder="Ex. déplacement, congé…" className="mt-2 w-full rounded-2xl border border-[#DDE5E0] bg-[#F9FAF9] px-3.5 py-3 text-sm outline-none focus:border-[var(--artisan-green)]" /></label>
            {timeOffError ? <p className="mt-3 rounded-2xl bg-[var(--artisan-danger-soft)] px-3 py-2 text-xs font-semibold text-[var(--artisan-danger)]">{timeOffError}</p> : null}
            <button disabled={createTimeOffMutation.isPending} className="mt-4 w-full rounded-2xl bg-[var(--artisan-orange)] px-4 py-3.5 text-sm font-black text-white disabled:opacity-60">{createTimeOffMutation.isPending ? 'Ajout…' : 'Bloquer cette période'}</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
