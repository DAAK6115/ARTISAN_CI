import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';
import { Link } from 'react-router-dom';

export default function ListeConversationsPage() {
  const [contacts, setContacts] = useState([]);
  const [error, setError] = useState('');
  const [role, setRole] = useState('');

  // Récupérer les contacts de la messagerie
  const fetchContacts = async () => {
    try {
      const res = await axios.get('/chat/messages/contacts/');
      setContacts(res.data);
    } catch (err) {
      console.error('Erreur chargement contacts :', err);
      setError('Impossible de charger vos contacts.');
    }
  };

  // Récupérer les infos de l'utilisateur connecté (notamment son rôle)
  const fetchUserRole = async () => {
    try {
      const res = await axios.get('/accounts/me/');
      setRole(res.data.role);
    } catch (err) {
      console.error('Erreur chargement utilisateur :', err);
    }
  };

  useEffect(() => {
    fetchUserRole();
    fetchContacts();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">
        {role === 'artisan' ? '📨 Mes clients' : '💬 Mes conversations'}
      </h1>

      {error && <p className="text-red-500">{error}</p>}

      <div className="space-y-3 max-w-2xl mx-auto">
        {contacts.length === 0 ? (
          <p className="text-gray-500">Aucune conversation pour le moment.</p>
        ) : (
          contacts.map((contact, index) => (
            <Link
              key={index}
              to={`/messagerie/${contact.username}`}
              className="block border rounded p-3 bg-white shadow hover:bg-gray-100"
            >
              <p className="font-semibold">{contact.username}</p>
              <p className="text-sm text-gray-500">{contact.email}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
