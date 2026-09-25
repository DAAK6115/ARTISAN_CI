import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, Send } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { getMessages, markConversationRead, sendMessage } from '../features/chat/chat.api';
import { useAuthStore } from '../features/auth/auth.store';

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('fr-CI', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function ChatConversationPage() {
  const contactId = Number(useParams().contactId ?? '');
  const [params] = useSearchParams();
  const username = params.get('username') || 'Conversation';
  const me = useAuthStore((state) => state.user);
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();
  const endRef = useRef<HTMLDivElement>(null);

  const messages = useQuery({
    queryKey: ['chat', 'messages', contactId],
    queryFn: () => getMessages(contactId),
    enabled: Number.isInteger(contactId) && contactId > 0,
    refetchInterval: 5000
  });
  const send = useMutation({
    mutationFn: (content: string) => sendMessage(contactId, content),
    onSuccess: async () => {
      setMessage('');
      await queryClient.invalidateQueries({ queryKey: ['chat', 'messages', contactId] });
      await queryClient.invalidateQueries({ queryKey: ['chat', 'contacts'] });
    }
  });

  useEffect(() => {
    if (!contactId || !messages.data?.length) return;
    void markConversationRead(contactId).then(() => queryClient.invalidateQueries({ queryKey: ['chat', 'contacts'] })).catch(() => undefined);
  }, [contactId, messages.data?.length, queryClient]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.data?.length]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const content = message.trim();
    if (!content || send.isPending) return;
    send.mutate(content.slice(0, 5000));
  }

  return (
    <div className="flex min-h-[calc(100dvh-120px)] flex-col">
      <PageHeader title={username} subtitle="Messagerie ARTISAN_CI" />

      <div className="flex-1 space-y-2 pb-4">
        {messages.isPending ? <div className="h-24 animate-pulse rounded-3xl bg-white" /> : null}
        {messages.data?.map((item) => {
          const mine = item.sender_username === me?.username;
          return (
            <div key={item.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[82%] rounded-[20px] px-3.5 py-2.5 ${mine ? 'rounded-br-md bg-[var(--artisan-green)] text-white' : 'rounded-bl-md border border-black/5 bg-white text-[var(--artisan-ink)]'}`}>
                <p className="whitespace-pre-wrap break-words text-sm leading-5">{item.deleted_at ? 'Message supprimé' : item.content || 'Pièce jointe'}</p>
                <div className={`mt-1 flex items-center justify-end gap-1 text-[9px] font-semibold ${mine ? 'text-white/65' : 'text-[#8A958F]'}`}>
                  {timeLabel(item.timestamp)}
                  {mine ? <CheckCheck size={11} /> : null}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {send.isError ? <div className="mb-2 rounded-2xl bg-[var(--artisan-danger-soft)] px-3 py-2 text-xs font-semibold text-[#A83228]">{send.error instanceof Error ? send.error.message : 'Message non envoyé.'}</div> : null}

      <form onSubmit={submit} className="sticky bottom-[88px] z-20 flex items-end gap-2 rounded-[24px] border border-black/5 bg-white/95 p-2 shadow-[0_16px_40px_rgba(20,38,30,0.16)] backdrop-blur-xl">
        <textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 5000))} rows={1} placeholder="Écrire un message…" className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-2xl bg-[#F7F8F6] px-4 py-3 text-sm outline-none placeholder:text-[#8A958F]" />
        <button type="submit" disabled={!message.trim() || send.isPending} className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--artisan-green)] text-white disabled:opacity-45" aria-label="Envoyer"><Send size={18} /></button>
      </form>
    </div>
  );
}
