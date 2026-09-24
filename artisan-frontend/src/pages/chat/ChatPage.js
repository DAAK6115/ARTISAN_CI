import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from '../../utils/axiosInstance';
import { getUsername, getUserRole } from '../../utils/auth';
import { createChatSocket } from '../../utils/websocket';
import { startSpeechRecognition } from '../../utils/speech';
import AppIcon from '../../components/AppIcon';
import ReportButton from '../../components/ReportButton';

const formatTime = (value) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));

function statusLabel(status) {
  if (status === 'lu') return 'Lu';
  if (status === 'recu') return 'Reçu';
  return 'Envoyé';
}

export default function ChatPage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const currentUsername = getUsername();
  const role = getUserRole();
  const [contactId, setContactId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [typing, setTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const cancelAudioRef = useRef(false);
  const socketRef = useRef(null);
  const typingTimerRef = useRef(null);
  const endRef = useRef(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [audioPreview, setAudioPreview] = useState('');

  useEffect(() => {
    if (!mediaFile) { setMediaPreview(''); return undefined; }
    const url = URL.createObjectURL(mediaFile); setMediaPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [mediaFile]);
  useEffect(() => {
    if (!audioBlob) { setAudioPreview(''); return undefined; }
    const url = URL.createObjectURL(audioBlob); setAudioPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [audioBlob]);

  const fetchContactId = async () => {
    try {
      const { data } = await axios.get(`/accounts/get-id/${encodeURIComponent(username)}/`);
      setContactId(data.id);
      const access = await axios.get(`/chat/access/${data.id}/`);
      setBlocked(Boolean(access.data.blocked));
      setBlockedByMe(Boolean(access.data.blocked_by_me));
    } catch {
      setError('Utilisateur introuvable ou conversation non autorisée.');
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!contactId) return;
    try {
      const { data } = await axios.get(`/chat/messages/${contactId}/`);
      setMessages(data || []);
      await axios.post(`/chat/messages/${contactId}/read/`).catch(() => {});
      setError('');
      window.requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }));
    } catch (err) {
      setError(err.response?.data?.detail || 'Impossible de charger cette conversation.');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchContactId(); }, [username]);
  useEffect(() => { if (contactId) fetchMessages(); }, [contactId]);

  useEffect(() => {
    if (!contactId) return undefined;
    const manager = createChatSocket((event) => {
      if (event.type === 'socket_status') setConnected(Boolean(event.connected));
      if (event.type === 'typing' && event.sender_id === contactId) {
        setTyping(Boolean(event.typing));
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        if (event.typing) typingTimerRef.current = setTimeout(() => setTyping(false), 1800);
      }
      if (['new_message', 'read', 'delivered', 'message_updated', 'message_deleted'].includes(event.type)) fetchMessages();
    });
    socketRef.current = manager;
    return () => { manager.close(); socketRef.current = null; };
  }, [contactId]);

  const stopTracks = () => {
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferred = MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : undefined;
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      mediaRecorderRef.current = recorder;
      const chunks = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm';
        if (!cancelAudioRef.current) setAudioBlob(new Blob(chunks, { type }));
        cancelAudioRef.current = false;
        setRecording(false);
        clearInterval(intervalRef.current);
        stopTracks();
      };
      cancelAudioRef.current = false;
      recorder.start();
      setRecording(true); setRecordingTime(0);
      intervalRef.current = setInterval(() => setRecordingTime((v) => v + 1), 1000);
    } catch { setError('Impossible d’accéder au microphone.'); }
  };

  const stopRecording = () => mediaRecorderRef.current?.state === 'recording' && mediaRecorderRef.current.stop();
  const cancelRecording = () => {
    cancelAudioRef.current = true;
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    setAudioBlob(null); setRecording(false); setRecordingTime(0); stopTracks();
  };
  useEffect(() => () => { clearInterval(intervalRef.current); stopTracks(); }, []);

  const signalTyping = (value) => {
    setNewMessage(value);
    socketRef.current?.sendTyping(contactId, Boolean(value.trim()));
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => socketRef.current?.sendTyping(contactId, false), 1000);
  };

  const sendMessage = async (extra = {}) => {
    if (!contactId || sending) return;
    if (!newMessage.trim() && !mediaFile && !audioBlob && !extra.location) return;
    const form = new FormData();
    form.append('receiver', contactId);
    if (newMessage.trim()) form.append('content', newMessage.trim());
    if (mediaFile) form.append('media', mediaFile);
    if (audioBlob) form.append('audio', audioBlob, 'message-audio.webm');
    if (replyTo) form.append('reply_to', replyTo.id);
    if (extra.location) {
      form.append('location_lat', extra.location.latitude.toFixed(6));
      form.append('location_lng', extra.location.longitude.toFixed(6));
      if (!newMessage.trim()) form.append('content', 'Position partagée');
    }
    setSending(true); setError('');
    try {
      await axios.post('/chat/messages/send/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setNewMessage(''); setMediaFile(null); setAudioBlob(null); setRecordingTime(0); setReplyTo(null);
      socketRef.current?.sendTyping(contactId, false);
      await fetchMessages();
    } catch (err) { setError(err.response?.data?.detail || 'Impossible d’envoyer le message.'); }
    finally { setSending(false); }
  };

  const shareLocation = () => {
    if (!navigator.geolocation) { setError('La géolocalisation n’est pas disponible.'); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => sendMessage({ location: coords }),
      () => setError('Impossible d’obtenir votre position.'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const dictate = () => startSpeechRecognition({
    onResult: (text) => signalTyping([newMessage, text].filter(Boolean).join(' ').trim()),
    onError: setError,
  });

  const deleteMessage = async (id) => {
    try { await axios.delete(`/chat/messages/${id}/delete/`); await fetchMessages(); }
    catch { setError('Impossible de supprimer ce message.'); }
  };

  const toggleBlock = async () => {
    if (!contactId) return;
    try {
      await axios.post(`/chat/blocks/${contactId}/toggle/`);
      const access = await axios.get(`/chat/access/${contactId}/`);
      setBlocked(Boolean(access.data.blocked));
      setBlockedByMe(Boolean(access.data.blocked_by_me));
      setError(
        access.data.blocked_by_me
          ? 'Utilisateur bloqué. Vous ne recevrez plus de nouveaux messages de sa part.'
          : ''
      );
    } catch { setError('Impossible de modifier le blocage.'); }
  };

  const backPath = role === 'artisan' ? '/artisan/mes-conversations' : '/client/mes-conversations';

  return (
    <div className="mx-auto flex min-h-[calc(100vh-110px)] max-w-5xl flex-col px-4 py-5 sm:px-6">
      <div className="flex items-center justify-between rounded-[24px] border border-black/5 bg-white px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => navigate(backPath)} className="grid h-10 w-10 place-items-center rounded-xl bg-[#F4F6F4]" aria-label="Retour"><AppIcon name="arrow" className="h-5 w-5 rotate-180" /></button>
          <div className="min-w-0"><p className="truncate font-black text-[#111815]">{username}</p><p className="text-xs text-[#718078]">{typing ? 'Écrit…' : connected ? 'Messagerie connectée' : 'Reconnexion…'}</p></div>
        </div>
        <div className="flex items-center gap-2">
          {role === 'client' && <Link to={`/artisans/${username}`} className="hidden rounded-xl px-3 py-2 text-xs font-bold text-[#0B6B50] hover:bg-[#EAF4F0] sm:block">Voir le profil</Link>}
          {contactId && <ReportButton targetUserId={contactId} className="rounded-xl bg-[#F4F6F4] px-3 py-2 text-xs font-bold text-[#536158] hover:bg-[#FFF5F2]" />}
          <button onClick={toggleBlock} className={`rounded-xl px-3 py-2 text-xs font-bold ${blockedByMe ? 'bg-[#FFF0EE] text-[#B23A31]' : 'bg-[#F4F6F4] text-[#536158]'}`}>{blockedByMe ? 'Débloquer' : 'Bloquer'}</button>
        </div>
      </div>

      {error && <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-black/5 bg-[#F5F7F5] shadow-sm">
        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
          {loading ? <p className="text-sm text-[#718078]">Chargement de la conversation…</p> : messages.length === 0 ? <div className="grid min-h-72 place-items-center text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#0B6B50]"><AppIcon name="chat" /></span><p className="mt-3 font-black">Commencez la conversation</p><p className="mt-1 text-sm text-[#718078]">Texte, vocal, photo, vidéo, PDF ou localisation.</p></div></div> : messages.map((msg) => {
            const mine = msg.sender_username === currentUsername;
            const locationUrl = msg.location_lat && msg.location_lng ? `https://www.google.com/maps/search/?api=1&query=${msg.location_lat},${msg.location_lng}` : null;
            return (
              <div key={msg.id} className={`group flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-[22px] px-4 py-3 sm:max-w-[72%] ${mine ? 'bg-[#0B6B50] text-white' : 'border border-black/5 bg-white text-[#111815]'}`}>
                  {msg.reply_preview && <button onClick={() => document.getElementById(`message-${msg.reply_preview.id}`)?.scrollIntoView({ behavior:'smooth' })} className={`mb-2 block w-full rounded-xl px-3 py-2 text-left text-xs ${mine ? 'bg-white/10' : 'bg-[#F4F6F4]'}`}><b>{msg.reply_preview.sender_username}</b><span className="block truncate opacity-80">{msg.reply_preview.content}</span></button>}
                  <div id={`message-${msg.id}`}>
                    {msg.deleted_at ? <p className="text-sm italic opacity-70">Message supprimé</p> : <>
                      {msg.content && <p className="whitespace-pre-wrap break-words text-sm leading-6">{msg.content}</p>}
                      {msg.media_url && (/\.pdf($|\?)/i.test(msg.media_url) ? <a href={msg.media_url} target="_blank" rel="noreferrer" className={`mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${mine ? 'bg-white/10' : 'bg-[#F4F6F4]'}`}><AppIcon name="file" className="h-4 w-4" /> Ouvrir le document PDF</a> : /\.(mp4|webm|mov)($|\?)/i.test(msg.media_url) ? <video controls preload="metadata" className="mt-2 max-h-72 w-full rounded-2xl"><source src={msg.media_url} /></video> : <img src={msg.media_url} alt="Pièce jointe" loading="lazy" decoding="async" className="mt-2 max-h-72 w-full rounded-2xl object-cover" />)}
                      {msg.audio_url && <audio controls preload="metadata" src={msg.audio_url} className="mt-2 w-full max-w-xs" />}
                      {locationUrl && <a href={locationUrl} target="_blank" rel="noreferrer" className={`mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${mine ? 'bg-white/10' : 'bg-[#EAF4F0] text-[#0B6B50]'}`}><AppIcon name="pin" className="h-4 w-4" /> Ouvrir la position</a>}
                    </>}
                  </div>
                  <div className={`mt-2 flex items-center gap-2 text-[10px] ${mine ? 'text-white/70' : 'text-[#829087]'}`}><span>{formatTime(msg.timestamp)}</span>{msg.edited_at && <span>modifié</span>}{mine && <span>{statusLabel(msg.status)}</span>}</div>
                  {!msg.deleted_at && <div className={`mt-1 hidden gap-2 text-[11px] group-hover:flex ${mine ? 'justify-end text-white/80' : 'text-[#66736D]'}`}><button onClick={() => setReplyTo(msg)}>Répondre</button>{mine && <button onClick={() => deleteMessage(msg.id)}>Supprimer</button>}</div>}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="border-t border-black/5 bg-white p-3 sm:p-4">
          {blocked && <div className="mb-3 rounded-xl bg-[#FFF0EE] px-3 py-2 text-xs font-bold text-[#B23A31]">{blockedByMe ? 'Conversation bloquée. Débloquez l’utilisateur pour envoyer un message.' : 'Ce contact a bloqué cette conversation. Vous pouvez consulter l’historique, mais pas envoyer de nouveau message.'}</div>}
          {replyTo && <div className="mb-2 flex items-center justify-between rounded-xl bg-[#F4F6F4] px-3 py-2 text-xs"><span className="truncate"><b>Réponse à {replyTo.sender_username}</b> — {replyTo.content || 'Pièce jointe'}</span><button onClick={() => setReplyTo(null)}><AppIcon name="close" className="h-4 w-4" /></button></div>}
          {mediaFile && <div className="mb-2 flex items-center gap-3 rounded-xl bg-[#F4F6F4] p-2">{mediaFile.type.startsWith('image/') && mediaPreview ? <img src={mediaPreview} alt="Aperçu" className="h-14 w-14 rounded-lg object-cover" /> : <AppIcon name="file" className="h-5 w-5" />}<span className="min-w-0 flex-1 truncate text-xs font-bold">{mediaFile.name}</span><button onClick={() => setMediaFile(null)}><AppIcon name="close" className="h-4 w-4" /></button></div>}
          {audioBlob && audioPreview && <div className="mb-2 flex items-center gap-3 rounded-xl bg-[#EAF4F0] p-2"><audio controls src={audioPreview} className="h-9 flex-1" /><button onClick={() => { setAudioBlob(null); setRecordingTime(0); }}><AppIcon name="close" className="h-4 w-4" /></button></div>}

          <div className="flex items-end gap-2">
            <div className="flex items-center gap-1">
              <label className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl bg-[#F4F6F4]" title="Joindre un fichier"><AppIcon name="paperclip" className="h-5 w-5" /><input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,application/pdf" onChange={(e) => setMediaFile(e.target.files?.[0] || null)} disabled={blocked} /></label>
              <button onClick={shareLocation} disabled={blocked} className="grid h-10 w-10 place-items-center rounded-xl bg-[#F4F6F4]" title="Partager ma position"><AppIcon name="pin" className="h-5 w-5" /></button>
              <button onClick={dictate} disabled={blocked} className="grid h-10 w-10 place-items-center rounded-xl bg-[#F4F6F4]" title="Dicter le message"><AppIcon name="volume" className="h-5 w-5" /></button>
              {!recording ? <button onClick={startRecording} disabled={blocked} className="grid h-10 w-10 place-items-center rounded-xl bg-[#F4F6F4]" title="Message vocal"><AppIcon name="mic" className="h-5 w-5" /></button> : <div className="flex items-center gap-1"><button onClick={stopRecording} className="rounded-xl bg-[#FFF0EE] px-3 py-2 text-xs font-black text-[#B23A31]">Stop {recordingTime}s</button><button onClick={cancelRecording} className="grid h-10 w-10 place-items-center rounded-xl bg-[#F4F6F4]" title="Annuler l’enregistrement"><AppIcon name="close" className="h-4 w-4" /></button></div>}
            </div>
            <textarea rows={1} value={newMessage} onChange={(e) => signalTyping(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} disabled={blocked} placeholder="Écrire un message…" className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl border border-[#DFE6E2] px-4 py-2.5 text-sm outline-none focus:border-[#0B6B50] disabled:bg-gray-100" />
            <button onClick={() => sendMessage()} disabled={sending || blocked} className="grid h-11 w-11 place-items-center rounded-2xl bg-[#0B6B50] text-white disabled:opacity-50" aria-label="Envoyer"><AppIcon name="send" className="h-5 w-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
