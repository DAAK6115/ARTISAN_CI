import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from '../utils/axiosInstance';
import LogoutButton from './LogoutButton';

export default function ClientNavbar() {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const isActive = (path) => location.pathname.startsWith(path);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await axios.get('/notifications/');
        const unread = res.data.filter((notification) => !notification.lu).length;
        setUnreadCount(unread);
      } catch {
        setUnreadCount(0);
      }
    };

    fetchNotifications();
  }, []);

  return (
    <aside className="w-full md:w-64 bg-white shadow-md px-4 py-4 md:py-6 md:min-h-screen md:sticky md:top-0 md:self-start">
      <h2 className="text-xl font-bold text-blue-700 mb-6 text-center">👤 Espace Client</h2>

      <nav className="grid grid-cols-2 gap-2 text-sm md:block md:space-y-3" aria-label="Navigation client">
        <Link to="/client/dashboard" className={`block px-3 py-2 rounded ${isActive('/client/dashboard') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>🏠 Tableau de bord</Link>
        <Link to="/client/artisans" className={`block px-3 py-2 rounded ${isActive('/client/artisans') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>🧑‍🎨 Artisans</Link>
        <Link to="/client/services" className={`block px-3 py-2 rounded ${isActive('/client/services') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>🛠 Prestations</Link>
        <Link to="/client/rdvs" className={`block px-3 py-2 rounded ${isActive('/client/rdvs') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>📅 Mes rendez-vous</Link>
        <Link to="/client/favoris" className={`block px-3 py-2 rounded ${isActive('/client/favoris') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>📌 Mes favoris</Link>
        <Link to="/client/paiements" className={`block px-3 py-2 rounded ${isActive('/client/paiements') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>💳 Paiements</Link>
        <Link to="/client/avis" className={`block px-3 py-2 rounded ${isActive('/client/avis') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>⭐ Mes avis</Link>

        <Link to="/client/notifications" className={`relative block px-3 py-2 rounded ${isActive('/client/notifications') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>
          🔔 Notifications
          {unreadCount > 0 && (
            <span className="absolute top-1 right-2 min-w-5 h-5 px-1 text-xs text-white bg-red-600 rounded-full inline-flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        <Link to="/client/profil" className={`block px-3 py-2 rounded ${isActive('/client/profil') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>👤 Profil</Link>
        <Link to="/client/mes-conversations" className={`block px-3 py-2 rounded ${isActive('/client/mes-conversations') || isActive('/client/messagerie') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>💬 Messagerie</Link>

        <LogoutButton className="w-full text-left px-3 py-2 rounded text-red-600 hover:bg-red-100 mt-4 disabled:opacity-60" />
      </nav>
    </aside>
  );
}
