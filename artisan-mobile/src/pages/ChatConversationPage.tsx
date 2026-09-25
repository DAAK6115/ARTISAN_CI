import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  Check,
  CheckCheck,
  FileImage,
  MapPin,
  Mic,
  MoreHorizontal,
  Pencil,
  Reply,
  Send,
  Trash2,
  X
} from 'lucide-react';
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/http';
import { PageHeader } from '../components/PageHeader';
import {
  deleteMessage,
  getChatAccess,
  getMessages,
  markConversationRead,
  sendMessage,
  toggleChatBlock,
  updateMessage,
  type ChatMessage
} from '../features/chat/chat.api';
import { useRealtime } from '../features/chat/RealtimeProvider';
import { useAuthStore } from '../features/auth/auth.store';

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('fr-CI', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

function statusIcon(status: ChatMessage['status']) {
  if (status === 'lu') return <CheckCheck size={11} />;
  if (status === 'recu') return <CheckCheck size={11} className="opacity-65" />;
  return <Check size={11} />;
}

export function ChatConversationPage() {
  const contactId = Number(useParams().contactId ?? '');
  const [params] = useSearchParams();
  const username = params.get('username') || 'Conversation';
  const me = useAuthStore((state) => state.user);
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<number | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingAudio, setPendingAudio] = useState<File | null>(null);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const endRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const typingStopRef = useRef<number | null>(null);
  const { connected, isTyping, sendTyping: sendRealtimeTyping } = useRealtime();
  const contactTyping = isTyping(contactId);
  const sendTyping = (typing: boolean) => sendRealtimeTyping(contactId, typing);

  const messages = useQuery({
    queryKey: ['chat', 'messages', contactId],
    queryFn: () => getMessages(contactId),
    enabled: Number.isInteger(contactId) && contactId > 0,
    refetchInterval: connected ? false : 5000
  });

  const access = useQuery({
    queryKey: ['chat', 'access', contactId],
    queryFn: () => getChatAccess(contactId),
    enabled: Number.isInteger(contactId) && contactId > 0
  });

  const send = useMutation({
    mutationFn: (input: Parameters<typeof sendMessage>[0]) => sendMessage(input),
    onSuccess: async () => {
      setMessage(''); setReplyTo(null); setPendingFile(null); setPendingAudio(null); setError('');
      sendTyping(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['chat', 'messages', contactId] }),
        queryClient.invalidateQueries({ queryKey: ['chat', 'contacts'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      ]);
    },
    onError: (cause) => setError(cause instanceof ApiError ? cause.message : 'Message non envoyé.')
  });

  const edit = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) => updateMessage(id, content),
    onSuccess: async () => {
      setEditing(null); setMessage(''); setSelectedMessage(null); setError('');
      await queryClient.invalidateQueries({ queryKey: ['chat', 'messages', contactId] });
    },
    onError: (cause) => setError(cause instanceof ApiError ? cause.message : 'Modification impossible.')
  });

  const remove = useMutation({
    mutationFn: deleteMessage,
    onSuccess: async () => {
      setSelectedMessage(null); setError('');
      await queryClient.invalidateQueries({ queryKey: ['chat', 'messages', contactId] });
    },
    onError: (cause) => setError(cause instanceof ApiError ? cause.message : 'Suppression impossible.')
  });

  const block = useMutation({
    mutationFn: () => toggleChatBlock(contactId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['chat', 'access', contactId] }),
        queryClient.invalidateQueries({ queryKey: ['chat', 'contacts'] })
      ]);
    }
  });

  useEffect(() => {
    if (!contactId || !messages.data?.length) return;
    void markConversationRead(contactId)
      .then(() => Promise.all([
        queryClient.invalidateQueries({ queryKey: ['chat', 'contacts'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      ]))
      .catch(() => undefined);
  }, [contactId, messages.data?.length, queryClient]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.data?.length, contactTyping]);

  function onTextChange(value: string) {
    setMessage(value.slice(0, 5000));
    sendTyping(Boolean(value.trim()));
    if (typingStopRef.current) window.clearTimeout(typingStopRef.current);
    typingStopRef.current = window.setTimeout(() => sendTyping(false), 1000);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const content = message.trim();
    if (editing) {
      if (!content || edit.isPending) return;
      edit.mutate({ id: editing.id, content: content.slice(0, 5000) });
      return;
    }
    if ((!content && !pendingFile && !pendingAudio) || send.isPending || access.data?.blocked) return;
    send.mutate({
      receiver: contactId,
      content: content.slice(0, 5000),
      media: pendingFile,
      audio: pendingAudio,
      reply_to: replyTo?.id ?? null
    });
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    setPendingFile(event.target.files?.[0] ?? null);
    event.target.value = '';
  }

  function chooseAudio(event: ChangeEvent<HTMLInputElement>) {
    setPendingAudio(event.target.files?.[0] ?? null);
    event.target.value = '';
  }

  function sendLocation() {
    setError('');
    if (!navigator.geolocation) {
      setError('La géolocalisation n’est pas disponible sur cet appareil.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        send.mutate({
          receiver: contactId,
          content: message.trim().slice(0, 5000),
          location_lat: Number(position.coords.latitude.toFixed(6)),
          location_lng: Number(position.coords.longitude.toFixed(6)),
          reply_to: replyTo?.id ?? null
        });
      },
      () => setError('Impossible d’obtenir votre position. Vérifiez l’autorisation GPS.'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30_000 }
    );
  }

  const blocked = Boolean(access.data?.blocked);

  return (
    <div className="flex min-h-[calc(100dvh-120px)] flex-col">
      <PageHeader title={username} subtitle={contactTyping ? 'écrit…' : connected ? 'Temps réel connecté' : 'Messagerie ARTISAN_CI'} />

      <div className="-mt-3 mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => block.mutate()}
          disabled={block.isPending}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black ${access.data?.blocked_by_me ? 'bg-[var(--artisan-danger-soft)] text-[var(--artisan-danger)]' : 'bg-[#F1F3F2] text-[var(--artisan-muted)]'}`}
        >
          <Ban size={12} /> {access.data?.blocked_by_me ? 'Débloquer' : 'Bloquer'}
        </button>
      </div>

      <div className="flex-1 space-y-2 pb-4">
        {messages.isPending ? <div className="h-24 animate-pulse rounded-3xl bg-white" /> : null}
        {messages.data?.map((item) => {
          const mine = item.sender_username === me?.username;
          const selected = selectedMessage === item.id;
          return (
            <div key={item.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[84%]">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedMessage((value) => value === item.id ? null : item.id)}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedMessage((value) => value === item.id ? null : item.id); }}
                  className={`block w-full text-left rounded-[20px] px-3.5 py-2.5 ${mine ? 'rounded-br-md bg-[var(--artisan-green)] text-white' : 'rounded-bl-md border border-black/5 bg-white text-[var(--artisan-ink)]'}`}
                >
                  {item.reply_preview ? <div className={`mb-2 rounded-xl border-l-2 px-2 py-1.5 text-[10px] ${mine ? 'border-white/50 bg-white/10 text-white/75' : 'border-[var(--artisan-green)] bg-[var(--artisan-green-soft)] text-[var(--artisan-green-dark)]'}`}><b>{item.reply_preview.sender_username}</b><br />{item.reply_preview.content}</div> : null}
                  {item.media_url ? isVideo(item.media_url) ? <video controls preload="metadata" src={item.media_url} className="mb-2 max-h-56 w-full rounded-xl" /> : <img src={item.media_url} alt="Pièce jointe" className="mb-2 max-h-56 w-full rounded-xl object-cover" /> : null}
                  {item.audio_url ? <audio controls preload="metadata" src={item.audio_url} className="mb-2 w-full max-w-full" /> : null}
                  {item.location_lat && item.location_lng ? <a href={`https://www.google.com/maps/search/?api=1&query=${item.location_lat},${item.location_lng}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className={`mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${mine ? 'bg-white/10 text-white' : 'bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]'}`}><MapPin size={15} /> Voir la position</a> : null}
                  <p className="whitespace-pre-wrap break-words text-sm leading-5">{item.deleted_at ? 'Message supprimé' : item.content || (!item.media_url && !item.audio_url && !item.location_lat ? 'Pièce jointe' : '')}</p>
                  <div className={`mt-1 flex items-center justify-end gap-1 text-[9px] font-semibold ${mine ? 'text-white/65' : 'text-[#8A958F]'}`}>
                    {item.edited_at ? 'modifié · ' : ''}{timeLabel(item.timestamp)} {mine ? statusIcon(item.status) : null}
                  </div>
                </div>
                {selected && !item.deleted_at ? (
                  <div className={`mt-1 flex gap-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                    <button type="button" onClick={() => { setReplyTo(item); setSelectedMessage(null); }} className="grid size-8 place-items-center rounded-xl bg-white text-[var(--artisan-green)] shadow-sm" aria-label="Répondre"><Reply size={14} /></button>
                    {mine && !item.media_url && !item.audio_url && !item.location_lat ? <button type="button" onClick={() => { setEditing(item); setMessage(item.content); setSelectedMessage(null); }} className="grid size-8 place-items-center rounded-xl bg-white text-[var(--artisan-green)] shadow-sm" aria-label="Modifier"><Pencil size={14} /></button> : null}
                    {mine ? <button type="button" onClick={() => { if (window.confirm('Supprimer ce message ?')) remove.mutate(item.id); }} className="grid size-8 place-items-center rounded-xl bg-[var(--artisan-danger-soft)] text-[var(--artisan-danger)]" aria-label="Supprimer"><Trash2 size={14} /></button> : null}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
        {contactTyping ? <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md border border-black/5 bg-white px-4 py-2 text-xs font-bold text-[var(--artisan-muted)]">{username} écrit…</div></div> : null}
        <div ref={endRef} />
      </div>

      {blocked ? <div className="mb-2 rounded-2xl bg-[var(--artisan-danger-soft)] px-3 py-2 text-xs font-semibold text-[var(--artisan-danger)]">Cette conversation est bloquée. Débloquez-la pour envoyer un message.</div> : null}
      {error || send.isError ? <div className="mb-2 rounded-2xl bg-[var(--artisan-danger-soft)] px-3 py-2 text-xs font-semibold text-[#A83228]">{error || (send.error instanceof Error ? send.error.message : 'Message non envoyé.')}</div> : null}

      {replyTo || editing || pendingFile || pendingAudio ? <div className="mb-2 flex items-center gap-2 rounded-2xl border border-black/5 bg-white px-3 py-2 text-xs text-[var(--artisan-muted)] shadow-sm"><span className="min-w-0 flex-1 truncate">{editing ? `Modifier : ${editing.content}` : replyTo ? `Réponse à ${replyTo.sender_username} : ${replyTo.content || 'Pièce jointe'}` : pendingFile ? `Image/vidéo : ${pendingFile.name}` : `Audio : ${pendingAudio?.name}`}</span><button type="button" onClick={() => { setReplyTo(null); setEditing(null); setPendingFile(null); setPendingAudio(null); if (editing) setMessage(''); }} className="grid size-7 place-items-center rounded-lg bg-[#F4F6F4]"><X size={13} /></button></div> : null}

      <form onSubmit={submit} className="sticky bottom-[88px] z-20 rounded-[24px] border border-black/5 bg-white/95 p-2 shadow-[0_16px_40px_rgba(20,38,30,0.16)] backdrop-blur-xl">
        <input ref={imageInputRef} type="file" accept="image/*,video/mp4,video/webm" className="hidden" onChange={chooseImage} />
        <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={chooseAudio} />
        {!editing ? <div className="mb-1 flex gap-1 px-1">
          <button type="button" onClick={() => imageInputRef.current?.click()} disabled={blocked} className="grid size-9 place-items-center rounded-xl text-[var(--artisan-green)] disabled:opacity-40" aria-label="Ajouter une image"><FileImage size={17} /></button>
          <button type="button" onClick={() => audioInputRef.current?.click()} disabled={blocked} className="grid size-9 place-items-center rounded-xl text-[var(--artisan-green)] disabled:opacity-40" aria-label="Ajouter un audio"><Mic size={17} /></button>
          <button type="button" onClick={sendLocation} disabled={blocked || send.isPending} className="grid size-9 place-items-center rounded-xl text-[var(--artisan-green)] disabled:opacity-40" aria-label="Envoyer ma position"><MapPin size={17} /></button>
          <span className="ml-auto grid size-9 place-items-center text-[var(--artisan-muted)]"><MoreHorizontal size={17} /></span>
        </div> : null}
        <div className="flex items-end gap-2">
          <textarea value={message} onChange={(event) => onTextChange(event.target.value)} disabled={blocked} rows={1} placeholder={editing ? 'Modifier le message…' : 'Écrire un message…'} className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-2xl bg-[#F7F8F6] px-4 py-3 text-sm outline-none placeholder:text-[#8A958F] disabled:opacity-50" />
          <button type="submit" disabled={blocked || ((!message.trim() && !pendingFile && !pendingAudio) || send.isPending || edit.isPending)} className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--artisan-green)] text-white disabled:opacity-45" aria-label="Envoyer"><Send size={18} /></button>
        </div>
      </form>
    </div>
  );
}
