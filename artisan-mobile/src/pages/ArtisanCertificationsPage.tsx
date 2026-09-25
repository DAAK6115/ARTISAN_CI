import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, FileCheck2, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { addCertification, deleteCertification, getMyCertifications } from '../features/artisan/professional.api';

export function ArtisanCertificationsPage() {
  const queryClient = useQueryClient();
  const certifications = useQuery({ queryKey: ['artisan-certifications'], queryFn: getMyCertifications });
  const [open, setOpen] = useState(false);
  const add = useMutation({ mutationFn: addCertification, onSuccess: async () => { setOpen(false); await queryClient.invalidateQueries({ queryKey: ['artisan-certifications'] }); await queryClient.invalidateQueries({ queryKey: ['artisan-dashboard'] }); } });
  const remove = useMutation({ mutationFn: deleteCertification, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['artisan-certifications'] }) });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nom = String(data.get('nom') ?? '').trim();
    const organisme = String(data.get('organisme') ?? '').trim();
    const valide_jusquau = String(data.get('valide_jusquau') ?? '');
    const fichier = data.get('fichier') as File | null;
    if (!nom || !organisme || !fichier || fichier.size === 0) return;
    add.mutate({ nom, organisme, valide_jusquau, fichier });
  }

  return <div><PageHeader title="Certifications" subtitle="Justificatifs professionnels" />
    <div className="flex justify-end"><button type="button" onClick={() => setOpen(true)} className="flex min-h-11 items-center gap-2 rounded-2xl bg-[var(--artisan-green)] px-3 text-xs font-black text-white"><Plus size={16} /> Ajouter</button></div>
    <section className="mt-4 space-y-3">
      {certifications.isPending ? [1,2].map((id) => <div key={id} className="h-24 animate-pulse rounded-3xl bg-white" />) : null}
      {certifications.data?.map((item) => <article key={item.id} className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--artisan-gold-soft)] text-[#8A6500]"><Award size={20} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{item.nom}</p><p className="mt-1 truncate text-xs text-[var(--artisan-muted)]">{item.organisme}</p><span className="mt-2 inline-flex rounded-full bg-[#F4F6F4] px-2.5 py-1 text-[10px] font-black text-[#526159]">{item.status_label}</span>{item.review_note ? <p className="mt-2 text-[10px] leading-4 text-[var(--artisan-muted)]">{item.review_note}</p> : null}</div><button type="button" onClick={() => remove.mutate(item.id)} className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--artisan-danger-soft)] text-[#A83228]" aria-label="Supprimer"><Trash2 size={15} /></button></div></article>)}
      {!certifications.isPending && !certifications.data?.length ? <div className="rounded-3xl border border-dashed border-[#CDD8D2] bg-white/70 p-7 text-center"><FileCheck2 size={24} className="mx-auto text-[var(--artisan-green)]" /><p className="mt-3 text-sm font-black">Aucune certification</p><p className="mt-1 text-xs text-[var(--artisan-muted)]">Ajoutez vos diplômes, attestations ou certificats utiles.</p></div> : null}
    </section>
    {open ? <div className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-[2px]"><button className="absolute inset-0" onClick={() => setOpen(false)} aria-label="Fermer" /><form onSubmit={submit} className="absolute inset-x-3 bottom-3 grid max-h-[calc(100dvh-24px)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[28px] bg-white shadow-2xl"><div className="border-b border-black/5 px-5 py-4"><p className="text-lg font-black">Ajouter une certification</p><p className="mt-1 text-xs text-[var(--artisan-muted)]">Elle sera soumise à vérification.</p></div><div className="overflow-y-auto px-5 py-4 space-y-4"><label className="block"><span className="text-xs font-black">Nom *</span><input name="nom" required className="mt-2 min-h-12 w-full rounded-2xl border border-[#D9E1DD] px-4 text-sm font-semibold outline-none" /></label><label className="block"><span className="text-xs font-black">Organisme *</span><input name="organisme" required className="mt-2 min-h-12 w-full rounded-2xl border border-[#D9E1DD] px-4 text-sm font-semibold outline-none" /></label><label className="block"><span className="text-xs font-black">Valide jusqu’au</span><input name="valide_jusquau" type="date" className="mt-2 min-h-12 w-full rounded-2xl border border-[#D9E1DD] px-4 text-sm font-semibold outline-none" /></label><label className="block"><span className="text-xs font-black">Document *</span><input name="fichier" type="file" required accept="application/pdf,image/png,image/jpeg,image/webp" className="mt-2 block w-full rounded-2xl border border-dashed border-[#BFCBC5] bg-[#F7F8F6] p-3 text-xs" /></label>{add.isError ? <p className="rounded-2xl bg-[var(--artisan-danger-soft)] px-3 py-2 text-xs font-semibold text-[#A83228]">{add.error instanceof Error ? add.error.message : 'Ajout impossible.'}</p> : null}</div><div className="border-t border-black/5 bg-white p-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}><button type="submit" disabled={add.isPending} className="min-h-[52px] w-full rounded-2xl bg-[var(--artisan-green)] text-sm font-black text-white disabled:opacity-50">{add.isPending ? 'Ajout…' : 'Envoyer pour vérification'}</button></div></form></div> : null}
  </div>;
}
