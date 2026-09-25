import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MobileTopBar } from '../components/MobileTopBar';
import { getChatContacts } from '../features/chat/chat.api';
import { useRealtime } from '../features/chat/RealtimeProvider';

function timeLabel(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return new Intl.DateTimeFormat('fr-CI', { hour: '2-digit', minute: '2-digit' }).format(date);
  }
  return new Intl.DateTimeFormat('fr-CI', { day: '2-digit', month: 'short' }).format(date);
}

export function ClientMessagesPage() {
  const [search, setSearch] = useState('');
  const { connected } = useRealtime();
  const contacts = useQuery({ queryKey: ['chat', 'contacts'], queryFn: getChatContacts, refetchInterval: connected ? false : 15000 });
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contacts.data ?? [];
    return (contacts.data ?? []).filter((item) => item.username.toLowerCase().includes(query) || item.last_message.toLowerCase().includes(query));
  }, [contacts.data, search]);

  return (
    <div>
      <MobileTopBar />
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Conversations</p>
        <h1 className="mt-1.5 text-[28px] font-black tracking-[-0.045em] text-[var(--artisan-ink)]">Messages</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--artisan-muted)]">Échangez avec les artisans avec lesquels une conversation est autorisée.</p>
        <label className="mt-4 flex min-h-13 items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 shadow-sm">
          <Search size={18} className="text-[var(--artisan-green)]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une conversation" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#8A958F]" />
        </label>
      </section>

      <section className="mt-5 space-y-2.5 pb-2">
        {contacts.isPending ? [1,2,3].map((id) => <div key={id} className="h-20 animate-pulse rounded-3xl bg-white" />) : null}
        {filtered.map((contact) => (
          <Link key={contact.id} to={`/client/messages/${contact.id}?username=${encodeURIComponent(contact.username)}`} className="flex items-center gap-3 rounded-3xl border border-black/5 bg-white p-3.5 shadow-sm">
            <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]">
              <MessageCircle size={20} />
              {contact.online ? <span className="absolute bottom-0.5 right-0.5 size-3 rounded-full border-2 border-white bg-[#25A66A]" /> : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-black text-[var(--artisan-ink)]">{contact.username}</span>
                <span className="shrink-0 text-[10px] font-semibold text-[#8A958F]">{timeLabel(contact.last_message_at)}</span>
              </span>
              <span className="mt-1 flex items-center justify-between gap-3">
                <span className="truncate text-xs text-[var(--artisan-muted)]">{contact.last_message || 'Aucun message'}</span>
                {contact.unread_count ? <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-[var(--artisan-green)] px-1.5 py-0.5 text-[10px] font-black text-white">{contact.unread_count > 9 ? '9+' : contact.unread_count}</span> : null}
              </span>
            </span>
          </Link>
        ))}
        {!contacts.isPending && filtered.length === 0 ? (
          <div className="rounded-3xl border border-black/5 bg-white p-7 text-center shadow-sm">
            <MessageCircle size={24} className="mx-auto text-[var(--artisan-green)]" />
            <p className="mt-3 text-sm font-black text-[var(--artisan-ink)]">Aucune conversation</p>
            <p className="mt-1 text-xs leading-5 text-[var(--artisan-muted)]">Vos échanges avec les artisans apparaîtront ici.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
