import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axiosInstance';
import { clearSession, getRefreshToken } from '../utils/auth';

export default function LogoutButton({ className = '' }) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);

    const refresh = getRefreshToken();

    try {
      if (refresh) {
        await axios.post('/accounts/logout/', { refresh });
      }
    } catch {
      // Même si le réseau est indisponible, la session locale doit être fermée.
    } finally {
      clearSession();
      navigate('/', { replace: true });
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={className}
    >
      {loading ? 'Déconnexion…' : '🚪 Déconnexion'}
    </button>
  );
}
