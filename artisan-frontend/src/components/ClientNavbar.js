import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from '../utils/axiosInstance';

export default function ClientNavbar() {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const isActive = (path) => location.pathname.startsWith(path);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await axios.get('/notifications/');
        const unread = res.data.filter(n => !n.lu).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error("Erreur lors du chargement des notifications :", err);
      }
    };

    fetchNotifications();
  }, []);

  return (
    <div className="w-full md:w-64 bg-white shadow-md h-full min-h-screen px-4 py-6 fixed md:static">
      <h2 className="text-xl font-bold text-blue-700 mb-6 text-center">👤 Espace Client</h2>

      <nav className="space-y-3 text-sm">
        <Link to="/client/dashboard" className={`block px-3 py-2 rounded ${isActive('/client/dashboard') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>🏠 Tableau de bord</Link>
        <Link to="/client/artisans" className={`block px-3 py-2 rounded ${isActive('/client/artisans') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>🧑‍🎨 Artisans</Link>
        <Link to="/client/services" className={`block px-3 py-2 rounded ${isActive('/client/services') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>🛠 Prestations</Link>
        <Link to="/client/rdvs" className={`block px-3 py-2 rounded ${isActive('/client/rdvs') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>📅 Mes Rendez-vous</Link>
        <Link to="/client/favoris" className={`block px-3 py-2 rounded ${isActive('/client/favoris') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>📌 Mes favoris</Link>
        <Link to="/client/paiements" className={`block px-3 py-2 rounded ${isActive('/client/paiements') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>💳 Paiements</Link>
        <Link to="/client/avis" className={`block px-3 py-2 rounded ${isActive('/client/avis') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>⭐ Mes Avis</Link>

        {/* Notifications */}
        <Link to="/client/notifications" className={`relative block px-3 py-2 rounded ${isActive('/client/notifications') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>
          🔔 Notifications
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-block w-5 h-5 text-xs text-white bg-red-600 rounded-full text-center">{unreadCount}</span>
          )}
        </Link>

        {/* Profil */}
        <Link to="/client/profil" className={`block px-3 py-2 rounded ${isActive('/client/profil') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>👤 Profil</Link>

        {/* Messagerie */}
        <Link to="/mes-conversations" className={`block px-3 py-2 rounded ${isActive('/mes-conversations') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>💬 Messagerie</Link>

        {/* Déconnexion */}
        <Link to="/" className="block px-3 py-2 rounded text-red-500 hover:bg-red-100 mt-4">🚪 Déconnexion</Link>
      </nav>
    </div>
  );
}
