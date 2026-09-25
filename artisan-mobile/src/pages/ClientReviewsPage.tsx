import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareText, Send, Star } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MobileTopBar } from '../components/MobileTopBar';
import { getMyAppointments } from '../features/appointments/appointments.api';
import { completedAppointmentsForReview, createReview, getMyReviews } from '../features/client/client.api';

export function ClientReviewsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const reviews = useQuery({ queryKey: ['client-reviews'], queryFn: getMyReviews });
  const appointments = useQuery({ queryKey: ['client-appointments'], queryFn: getMyAppointments });
  const [appointmentId, setAppointmentId] = useState('');
  const [note, setNote] = useState(5);
  const [comment, setComment] = useState('');
  const [submittedIds, setSubmittedIds] = useState<number[]>([]);

  const eligible = useMemo(() => completedAppointmentsForReview(appointments.data ?? []).filter((item) => !submittedIds.includes(item.id)), [appointments.data, submittedIds]);
  const selected = eligible.find((item) => item.id === Number(appointmentId));
  const requestedId = Number(searchParams.get('rdv') || 0);

  useEffect(() => {
    if (!appointmentId && requestedId && eligible.some((item) => item.id === requestedId)) {
      setAppointmentId(String(requestedId));
    }
  }, [appointmentId, eligible, requestedId]);

  const create = useMutation({
    mutationFn: () => createReview({ rendez_vous: Number(appointmentId), service: selected!.service_id, note, commentaire: comment.trim() }),
    onSuccess: async () => {
      setSubmittedIds((current) => [...current, Number(appointmentId)]);
      setAppointmentId(''); setComment(''); setNote(5);
      await queryClient.invalidateQueries({ queryKey: ['client-reviews'] });
    }
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected || create.isPending) return;
    create.mutate();
  }

  return (
    <div>
      <MobileTopBar />
      <div><p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--artisan-green)]">Votre expérience</p><h1 className="mt-1 text-2xl font-black tracking-[-0.04em]">Mes avis</h1></div>

      <form onSubmit={submit} className="mt-5 rounded-[30px] border border-black/5 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[var(--artisan-gold-soft)] text-[#9A6B00]"><Star size={20} fill="currentColor" /></span><div><p className="font-black">Noter une prestation terminée</p><p className="text-xs text-[var(--artisan-muted)]">Votre avis aide les autres clients.</p></div></div>
        <label className="mt-5 block"><span className="text-xs font-black text-[#45534C]">Prestation</span><select value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-[#DDE5E0] bg-[#F7F8F6] px-4 text-sm font-bold outline-none"><option value="">Choisir une prestation</option>{eligible.map((item) => <option key={item.id} value={item.id}>{item.service_titre} · {new Date(item.date_rdv).toLocaleDateString('fr-FR')}</option>)}</select></label>
        <div className="mt-4"><p className="text-xs font-black text-[#45534C]">Note</p><div className="mt-2 flex gap-2">{[1,2,3,4,5].map((value) => <button key={value} type="button" onClick={() => setNote(value)} aria-label={`${value} étoile${value > 1 ? 's' : ''}`} className={`grid size-11 place-items-center rounded-2xl ${value <= note ? 'bg-[var(--artisan-gold-soft)] text-[#9A6B00]' : 'bg-[#F4F6F4] text-[#A1AAA5]'}`}><Star size={20} fill={value <= note ? 'currentColor' : 'none'} /></button>)}</div></div>
        <label className="mt-4 block"><span className="text-xs font-black text-[#45534C]">Commentaire</span><textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1500} rows={4} placeholder="Décrivez votre expérience…" className="mt-2 w-full resize-none rounded-2xl border border-[#DDE5E0] bg-[#F7F8F6] p-4 text-sm outline-none focus:ring-4 focus:ring-[#0B6B50]/10" /></label>
        {create.isError ? <div className="mt-4 rounded-2xl bg-[var(--artisan-danger-soft)] p-3 text-sm font-semibold text-[#A83228]">{create.error instanceof Error ? create.error.message : 'Impossible d’enregistrer cet avis.'}</div> : null}
        <button disabled={!selected || create.isPending} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--artisan-green)] text-sm font-black text-white disabled:opacity-50"><Send size={17} /> {create.isPending ? 'Publication…' : 'Publier mon avis'}</button>
      </form>

      <h2 className="mt-6 text-lg font-black">Avis déjà publiés</h2>
      <div className="mt-3 space-y-3">
        {reviews.data?.map((review) => <article key={review.id} className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{review.service_titre}</p><p className="mt-1 text-xs text-[var(--artisan-muted)]">{new Date(review.date_creation).toLocaleDateString('fr-FR')}</p></div><span className="flex items-center gap-1 rounded-full bg-[var(--artisan-gold-soft)] px-2.5 py-1 text-xs font-black text-[#9A6B00]"><Star size={12} fill="currentColor" /> {review.note}/5</span></div>{review.commentaire ? <p className="mt-3 text-sm leading-6 text-[#596760]">{review.commentaire}</p> : null}</article>)}
        {!reviews.isLoading && (reviews.data?.length ?? 0) === 0 ? <div className="rounded-3xl bg-white p-6 text-center text-sm text-[var(--artisan-muted)]"><MessageSquareText className="mx-auto mb-2" />Vous n’avez pas encore publié d’avis.</div> : null}
      </div>
    </div>
  );
}
