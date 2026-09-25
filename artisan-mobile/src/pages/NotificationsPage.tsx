import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MobileTopBar } from '../components/MobileTopBar';
import { getNotifications, markNotificationRead, type NotificationItem } from '../features/client/client.api';
import { useAuthStore } from '../features/auth/auth.store';

function mobileTarget(item: NotificationItem, role: string | undefined): string | null {
  const raw = item.lien_redirection || '';
  const exact: Record<string, string> = {
    '/client/rdvs': '/client/rendez-vous',
    '/client/devis': '/client/devis',
    '/client/paiements': '/client/paiements',
    '/artisan/rdv': '/artisan/agenda',
    '/artisan/devis': '/artisan/devis',
    '/artisan/paiements': '/artisan/reglements',
    '/artisan/certifications': '/artisan/certifications',
    '/artisan/support': '/artisan/support',
    '/client/support': '/client/support'
  };
  if (exact[raw]) {
    const target = exact[raw];
    return item.rendez_vous_id && (target === '/artisan/agenda' || target === '/client/rendez-vous')
      ? `${target}?rdv=${item.rendez_vous_id}`
      : target;
  }
  if (item.rendez_vous_id) return role === 'artisan' ? `/artisan/agenda?rdv=${item.rendez_vous_id}` : `/client/rendez-vous?rdv=${item.rendez_vous_id}`;
  return null;
}

export function NotificationsPage() {
  const role = useAuthStore((state) => state.user?.role);
  const queryClient = useQueryClient();
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: getNotifications });
  const mark = useMutation({ mutationFn: markNotificationRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }) });

  return (
    <div>
      <MobileTopBar showNotification={false} />
      <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--artisan-green)]">Centre d’activité</p><h1 className="mt-1 text-2xl font-black tracking-[-0.04em]">Notifications</h1></div><span className="grid size-11 place-items-center rounded-2xl bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]"><Bell size={20} /></span></div>
      <div className="mt-5 space-y-3">
        {notifications.data?.map((item) => {
          const target = mobileTarget(item, role);
          const content = <><div className="flex items-start gap-3"><span className={`mt-1 size-2.5 shrink-0 rounded-full ${item.lu ? 'bg-[#D7DDD9]' : 'bg-[var(--artisan-orange)]'}`} /><div className="min-w-0 flex-1"><p className={`text-sm ${item.lu ? 'font-bold' : 'font-black'} text-[var(--artisan-ink)]`}>{item.titre}</p><p className="mt-1 text-xs leading-5 text-[var(--artisan-muted)]">{item.message}</p><p className="mt-2 text-[10px] font-bold text-[#8A958F]">{new Date(item.date_envoi).toLocaleString('fr-FR')}</p></div>{target ? <ChevronRight size={17} className="shrink-0 text-[var(--artisan-muted)]" /> : null}</div></>;
          return <article key={item.id} className={`rounded-3xl border p-4 shadow-sm ${item.lu ? 'border-black/5 bg-white' : 'border-[#0B6B50]/10 bg-[#F9FCFA]'}`}>
            {target ? <Link to={target} onClick={() => { if (!item.lu) mark.mutate(item.id); }}>{content}</Link> : content}
            {!item.lu && !target ? <button type="button" onClick={() => mark.mutate(item.id)} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--artisan-green-soft)] text-xs font-black text-[var(--artisan-green)]"><Check size={14} /> Marquer comme lue</button> : null}
          </article>;
        })}
        {!notifications.isLoading && (notifications.data?.length ?? 0) === 0 ? <div className="rounded-3xl bg-white p-6 text-center text-sm text-[var(--artisan-muted)] shadow-sm">Aucune notification.</div> : null}
      </div>
    </div>
  );
}
