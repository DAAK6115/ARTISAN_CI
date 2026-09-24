import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosInstance';
import AppIcon from '../../components/AppIcon';

export default function ListeConversationsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/chat/messages/contacts/')
      .then(({ data }) => setContacts(data || []))
      .catch(() => setError('Impossible de charger vos conversations.'))
      .finally(() => setLoading(false));
  }, []);

  return <div className="mx-auto max-w-4xl">
    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0B6B50]">Messagerie</p>
    <h1 className="mt-2 text-3xl font-black">Mes conversations</h1>
    <p className="mt-2 text-sm text-[#718078]">Échangez avec vos artisans sans exposer votre adresse e-mail.</p>
    {error && <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="mt-6 space-y-3">
      {loading ? [1,2,3].map(x => <div key={x} className="h-20 animate-pulse rounded-2xl bg-white" />) : contacts.length === 0 ? <div className="rounded-[28px] border border-dashed border-[#CAD5CF] bg-white p-10 text-center"><AppIcon name="chat" className="mx-auto h-8 w-8 text-[#0B6B50]" /><p className="mt-3 font-black">Aucune conversation</p><p className="mt-1 text-sm text-[#718078]">Contactez un artisan depuis sa prestation ou son profil.</p></div> : contacts.map(contact => <Link key={contact.id} to={`/client/messagerie/${contact.username}`} className="flex items-center gap-4 rounded-[22px] border border-black/5 bg-white p-4 shadow-sm hover:bg-[#FBFCFB]"><span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#EAF4F0] font-black text-[#0B6B50]">{contact.username.slice(0,1).toUpperCase()}{contact.online && <i className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="truncate font-black">{contact.username}</p>{contact.last_message_at && <span className="shrink-0 text-[10px] text-[#829087]">{new Date(contact.last_message_at).toLocaleDateString('fr-FR')}</span>}</div><p className="mt-1 truncate text-sm text-[#718078]">{contact.last_message || 'Conversation'}</p></div>{contact.unread_count > 0 && <span className="min-w-6 rounded-full bg-[#0B6B50] px-2 py-1 text-center text-[10px] font-black text-white">{contact.unread_count}</span>}</Link>)}
    </div>
  </div>;
}
