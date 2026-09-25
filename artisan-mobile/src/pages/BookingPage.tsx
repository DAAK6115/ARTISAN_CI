import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, ChevronRight, Clock3, MessageSquareText } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { servicePriceLabel } from '../components/ServiceCard';
import { createAppointment, getAvailableSlots } from '../features/appointments/appointments.api';
import { getService } from '../features/home/services.api';

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function upcomingDays(count = 14) {
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      value: toLocalIsoDate(date),
      day: new Intl.DateTimeFormat('fr-CI', { weekday: 'short' }).format(date).replace('.', ''),
      number: new Intl.DateTimeFormat('fr-CI', { day: '2-digit' }).format(date),
      month: new Intl.DateTimeFormat('fr-CI', { month: 'short' }).format(date).replace('.', '')
    };
  });
}

function dateTimeLabel(value: string) {
  return new Intl.DateTimeFormat('fr-CI', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));
}

export function BookingPage() {
  const serviceId = Number(useParams().id ?? '');
  const days = useMemo(() => upcomingDays(), []);
  const [selectedDate, setSelectedDate] = useState(days[0]?.value ?? '');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();

  const service = useQuery({ queryKey: ['service', serviceId], queryFn: () => getService(serviceId), enabled: Number.isInteger(serviceId) && serviceId > 0 });
  const slots = useQuery({
    queryKey: ['available-slots', serviceId, selectedDate],
    queryFn: () => getAvailableSlots(serviceId, selectedDate),
    enabled: Number.isInteger(serviceId) && serviceId > 0 && Boolean(selectedDate)
  });
  const booking = useMutation({
    mutationFn: () => {
      const payload: { service: number; date_rdv: string; commentaires?: string } = { service: serviceId, date_rdv: selectedSlot };
      const cleanedComment = comment.trim();
      if (cleanedComment) payload.commentaires = cleanedComment;
      return createAppointment(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['appointments', 'client'] });
    }
  });

  function selectDate(value: string) {
    setSelectedDate(value);
    setSelectedSlot('');
    booking.reset();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedSlot || booking.isPending) return;
    booking.mutate();
  }

  if (booking.isSuccess) {
    return (
      <div>
        <PageHeader title="Réservation" />
        <section className="rounded-[30px] border border-black/5 bg-white p-6 text-center shadow-[var(--artisan-shadow-card)]">
          <span className="mx-auto grid size-16 place-items-center rounded-[22px] bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]"><CheckCircle2 size={30} /></span>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Demande envoyée</p>
          <h1 className="mt-2 text-[25px] font-black tracking-[-0.04em] text-[var(--artisan-ink)]">Votre rendez-vous est enregistré</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--artisan-muted)]">L’artisan doit maintenant accepter votre demande. Vous pourrez suivre son évolution dans vos rendez-vous.</p>
          <div className="mt-5 rounded-2xl bg-[#F7F8F6] p-4 text-left">
            <p className="text-xs font-black text-[var(--artisan-ink)]">{booking.data.service_titre}</p>
            <p className="mt-1.5 text-sm font-semibold text-[var(--artisan-green)]">{dateTimeLabel(booking.data.date_rdv)}</p>
            <p className="mt-1 text-xs text-[var(--artisan-muted)]">avec {booking.data.artisan_nom}</p>
          </div>
          <Link to="/client/rendez-vous" className="mt-5 flex min-h-14 w-full items-center justify-center rounded-2xl bg-[var(--artisan-green)] px-5 text-sm font-black text-white">Voir mes rendez-vous</Link>
          <Link to="/client" className="mt-2 flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#F4F6F4] px-5 text-sm font-black text-[#45534C]">Retour à l’accueil</Link>
        </section>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Réserver" subtitle={service.data?.titre ?? 'Choisissez votre créneau'} />

      {service.isPending ? <div className="h-32 animate-pulse rounded-3xl bg-white" /> : null}
      {service.data ? (
        <section className="rounded-3xl border border-black/5 bg-white p-4 shadow-[var(--artisan-shadow-card)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--artisan-green)]">{service.data.categorie_label}</p>
              <h1 className="mt-1 text-lg font-black text-[var(--artisan-ink)]">{service.data.titre}</h1>
              <p className="mt-1 text-xs font-semibold text-[var(--artisan-muted)]">par {service.data.artisan_username}</p>
            </div>
            <p className="shrink-0 text-sm font-black text-[var(--artisan-green)]">{servicePriceLabel(service.data)}</p>
          </div>
          <div className="mt-3 flex items-center gap-4 border-t border-black/5 pt-3 text-xs font-semibold text-[var(--artisan-muted)]">
            <span className="flex items-center gap-1.5"><Clock3 size={14} /> {service.data.duree_minutes} min</span>
            <span>{service.data.mode_intervention_label}</span>
          </div>
        </section>
      ) : null}

      <form onSubmit={submit} className="mt-6">
        <section>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Étape 1</p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--artisan-ink)]">Choisissez une date</h2>
          </div>
          <div className="mt-4 flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {days.map((day) => {
              const active = selectedDate === day.value;
              return (
                <button key={day.value} type="button" onClick={() => selectDate(day.value)} className={`w-[68px] shrink-0 rounded-[20px] border px-2 py-3 text-center transition ${active ? 'border-[var(--artisan-green)] bg-[var(--artisan-green)] text-white shadow-sm' : 'border-black/5 bg-white text-[var(--artisan-ink)]'}`}>
                  <span className={`block text-[10px] font-black uppercase ${active ? 'text-white/75' : 'text-[var(--artisan-muted)]'}`}>{day.day}</span>
                  <span className="mt-1 block text-xl font-black">{day.number}</span>
                  <span className={`mt-0.5 block text-[10px] font-bold ${active ? 'text-white/75' : 'text-[var(--artisan-muted)]'}`}>{day.month}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-7">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Étape 2</p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--artisan-ink)]">Choisissez l’heure</h2>
          </div>

          <div className="mt-4">
            {slots.isPending ? <div className="grid grid-cols-3 gap-2">{[1,2,3,4,5,6].map((id) => <div key={id} className="h-12 animate-pulse rounded-2xl bg-white" />)}</div> : null}
            {slots.isError ? <div className="rounded-3xl bg-[var(--artisan-danger-soft)] p-4 text-sm font-semibold text-[#A83228]">Impossible de charger les créneaux pour cette date.</div> : null}
            {slots.data?.slots.length ? (
              <div className="grid grid-cols-3 gap-2">
                {slots.data.slots.map((slot) => {
                  const active = selectedSlot === slot.start;
                  return <button key={slot.start} type="button" onClick={() => setSelectedSlot(slot.start)} className={`min-h-12 rounded-2xl border px-2 text-sm font-black transition ${active ? 'border-[var(--artisan-green)] bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]' : 'border-black/5 bg-white text-[#45534C]'}`}>{slot.label}</button>;
                })}
              </div>
            ) : null}
            {slots.data && slots.data.slots.length === 0 ? (
              <div className="rounded-3xl border border-black/5 bg-white p-5 text-center">
                <CalendarDays size={22} className="mx-auto text-[var(--artisan-green)]" />
                <p className="mt-2 text-sm font-black text-[var(--artisan-ink)]">Aucun créneau disponible</p>
                <p className="mt-1 text-xs leading-5 text-[var(--artisan-muted)]">Choisissez une autre date dans la liste.</p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-7">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Étape 3</p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--artisan-ink)]">Précisez votre besoin</h2>
          </div>
          <label className="mt-4 block rounded-3xl border border-black/5 bg-white p-4 shadow-sm focus-within:ring-4 focus-within:ring-[#0B6B50]/10">
            <span className="flex items-center gap-2 text-xs font-black text-[#45534C]"><MessageSquareText size={16} className="text-[var(--artisan-green)]" /> Message facultatif</span>
            <textarea value={comment} onChange={(event) => setComment(event.target.value.slice(0, 1500))} rows={4} placeholder="Expliquez brièvement le problème ou la prestation souhaitée…" className="mt-3 w-full resize-none bg-transparent text-sm leading-6 text-[var(--artisan-ink)] outline-none placeholder:text-[#8A958F]" />
            <span className="mt-2 block text-right text-[10px] font-semibold text-[#8A958F]">{comment.length}/1500</span>
          </label>
        </section>

        {booking.isError ? <div role="alert" className="mt-5 rounded-2xl bg-[var(--artisan-danger-soft)] px-4 py-3 text-sm font-semibold text-[#A83228]">{booking.error instanceof Error ? booking.error.message : 'La réservation a échoué. Réessayez.'}</div> : null}

        <button type="submit" disabled={!selectedSlot || booking.isPending} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--artisan-green)] px-5 text-sm font-black text-white shadow-sm transition active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-45">
          {booking.isPending ? 'Envoi de la demande…' : <>Confirmer la réservation <ChevronRight size={18} /></>}
        </button>
        <p className="mt-3 text-center text-[11px] leading-5 text-[var(--artisan-muted)]">La réservation reste en attente tant que l’artisan ne l’a pas acceptée.</p>
      </form>
    </div>
  );
}
