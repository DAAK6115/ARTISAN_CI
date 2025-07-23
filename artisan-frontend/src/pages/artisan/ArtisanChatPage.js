import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';
import { useParams } from 'react-router-dom';

export default function ArtisanChatPage() {
  const { username } = useParams();
  const [contactId, setContactId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Récupérer l'ID du contact depuis son username
  useEffect(() => {
    const fetchContactId = async () => {
      try {
        const res = await axios.get(`/accounts/get-id/${username}/`);
        setContactId(res.data.id);
      } catch (err) {
        console.error('Erreur récupération contact:', err);
        setError('Utilisateur introuvable.');
      }
    };
    fetchContactId();
  }, [username]);

  // Charger les messages
  useEffect(() => {
    if (contactId) {
      fetchMessages();
    }
  }, [contactId]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`/chat/messages/${contactId}/`);
      setMessages(res.data);
    } catch (err) {
      console.error('Erreur chargement messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await axios.post('/chat/messages/send/', {
        receiver: contactId,
        content: newMessage,
      });
      setNewMessage('');
      fetchMessages();
    } catch (err) {
      console.error('Erreur envoi message:', err);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">💬 Discussion avec {username}</h1>

      {error && <p className="text-red-500">{error}</p>}

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div className="space-y-3 max-w-2xl mx-auto">
          <div className="bg-white p-4 rounded shadow h-96 overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-2 p-2 rounded ${
                  msg.sender_username === username ? 'bg-white text-left' : 'bg-blue-100 text-right'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          <div className="flex mt-4">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 border rounded p-2 mr-2"
              placeholder="Écrire un message..."
            />
            <button
              onClick={handleSendMessage}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Envoyer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
