import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Clock3, MapPin, XCircle } from 'lucide-react';
import { MobileTopBar } from '../components/MobileTopBar';
import { getMyAppointments, updateAppointmentStatus, type AppointmentItem } from '../features/appointments/appointments.api';

const statusStyles: Record<string, string> = {
  en_attente: 'bg-[#FFF7DD] text-[#8A6500]',
  accepte: 'bg-[#EAF4F0] text-[#0B6B50]',
  confirme: 'bg-[#EAF4F0] text-[#0B6B50]',
  en_route: 'bg-[#EEF5FF] text-[#2D5C91]',
  en_cours: 'bg-[#FFF4E8] text-[#B85B1D]',
  termine: 'bg-[#F3F0FF] text-[#6550A5]',
  effectue: 'bg-[#EAF4F0] text-[#0B6B50]',
  refuse: 'bg-[#FFF0EE] text-[#A83228]',
  annule_client: 'bg-[#F4F6F4] text-[#596760]',
  annule_artisan: 'bg-[#FFF0EE] text-[#A83228]',
  annule: 'bg-[#F4F6F4] text-[#596760]'
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('fr-CI', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('fr-CI', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function AppointmentCard({ item, onCancel, cancelling }: { item: AppointmentItem; onCancel: () => void; cancelling: boolean }) {
  return (
    <article className="rounded-3xl border border-black/5 bg-white p-4 shadow-[var(--artisan-shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black text-[var(--artisan-ink)]">{item.service_titre}</p>
          <p className="mt-1 text-xs font-semibold text-[var(--artisan-muted)]">avec {item.artisan_nom}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${statusStyles[item.statut] ?? 'bg-[#F4F6F4] text-[#596760]'}`}>{item.statut_label}</span>
      </div>

      <div className="mt-4 grid gap-2 rounded-2xl bg-[#F7F8F6] p-3.5 text-xs font-semibold text-[#596760]">
        <p className="flex items-center gap-2"><CalendarDays size={15} className="text-[var(--artisan-green)]" /> {dateLabel(item.date_rdv)}</p>
        <p className="flex items-center gap-2"><Clock3 size={15} className="text-[var(--artisan-green)]" /> {timeLabel(item.date_rdv)} · {item.service_duree_minutes} min</p>
        <p className="flex items-center gap-2"><MapPin size={15} className="text-[var(--artisan-green)]" /> Rendez-vous #{item.id}</p>
      </div>

      {item.commentaires ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--artisan-text-secondary)]">{item.commentaires}</p> : null}

      {item.peut_annuler && item.transitions_autorisees.includes('annule_client') ? (
        <button type="button" onClick={onCancel} disabled={cancelling} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--artisan-danger-soft)] px-4 text-xs font-black text-[#A83228] disabled:opacity-50">
          <XCircle size={16} /> {cancelling ? 'Annulation…' : 'Annuler ce rendez-vous'}
        </button>
      ) : null}
    </article>
  );
}

export function ClientAppointmentsPage() {
  const queryClient = useQueryClient();
  const appointments = useQuery({ queryKey: ['appointments', 'client'], queryFn: getMyAppointments });
  const cancel = useMutation({
    mutationFn: (id: number) => updateAppointmentStatus(id, 'annule_client', 'Annulation demandée depuis l’application mobile'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['appointments', 'client'] });
    }
  });

  function requestCancel(item: AppointmentItem) {
    if (!window.confirm('Voulez-vous vraiment annuler ce rendez-vous ?')) return;
    cancel.mutate(item.id);
  }

  const active = appointments.data?.filter((item) => !['effectue', 'refuse', 'annule_client', 'annule_artisan', 'annule'].includes(item.statut)) ?? [];
  const history = appointments.data?.filter((item) => ['effectue', 'refuse', 'annule_client', 'annule_artisan', 'annule'].includes(item.statut)) ?? [];

  return (
    <div>
      <MobileTopBar />
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Suivi</p>
        <h1 className="mt-1.5 text-[28px] font-black tracking-[-0.045em] text-[var(--artisan-ink)]">Mes rendez-vous</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--artisan-muted)]">Suivez vos demandes et l’avancement de vos prestations.</p>
      </section>

      {cancel.isError ? <div className="mt-4 rounded-2xl bg-[var(--artisan-danger-soft)] px-4 py-3 text-sm font-semibold text-[#A83228]">{cancel.error instanceof Error ? cancel.error.message : 'Impossible d’annuler ce rendez-vous.'}</div> : null}

      <section className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-[var(--artisan-ink)]">En cours</h2>
          <span className="rounded-full bg-[var(--artisan-green-soft)] px-2.5 py-1 text-[10px] font-black text-[var(--artisan-green)]">{active.length}</span>
        </div>
        <div className="mt-3 space-y-3">
          {appointments.isPending ? [1,2].map((id) => <div key={id} className="h-40 animate-pulse rounded-3xl bg-white" />) : null}
          {active.map((item) => <AppointmentCard key={item.id} item={item} onCancel={() => requestCancel(item)} cancelling={cancel.isPending && cancel.variables === item.id} />)}
          {!appointments.isPending && active.length === 0 ? (
            <div className="rounded-3xl border border-black/5 bg-white p-6 text-center shadow-sm">
              <CalendarDays size={24} className="mx-auto text-[var(--artisan-green)]" />
              <p className="mt-3 text-sm font-black text-[var(--artisan-ink)]">Aucun rendez-vous actif</p>
              <p className="mt-1 text-xs leading-5 text-[var(--artisan-muted)]">Votre prochaine réservation apparaîtra ici.</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-7 pb-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-[var(--artisan-ink)]">Historique</h2>
          <span className="text-xs font-bold text-[var(--artisan-muted)]">{history.length}</span>
        </div>
        <div className="mt-3 space-y-3">
          {history.map((item) => <AppointmentCard key={item.id} item={item} onCancel={() => undefined} cancelling={false} />)}
          {!appointments.isPending && history.length === 0 ? <p className="rounded-3xl bg-white p-5 text-sm text-[var(--artisan-muted)]">Aucun rendez-vous terminé ou annulé.</p> : null}
        </div>
      </section>
    </div>
  );
}
