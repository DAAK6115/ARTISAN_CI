import { useMemo, useState } from 'react';
import axios from '../../utils/axiosInstance';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from '../../components/BrandLogo';
import {
  clearSession,
  getRoleHomePath,
  isSafeRolePath,
  saveSession,
} from '../../utils/auth';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const sessionMessage = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('reason') === 'session-expired'
      ? 'Votre session a expiré. Reconnectez-vous pour continuer.'
      : '';
  }, [location.search]);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');
    clearSession();

    try {
      const response = await axios.post('/accounts/login/', {
        email: identifier.trim(),
        password,
      });

      const role = response.data.role;
      saveSession({
        access: response.data.access,
        refresh: response.data.refresh,
        username: response.data.username,
        role,
      });

      const requestedPath = location.state?.from;
      const destination = isSafeRolePath(requestedPath, role)
        ? requestedPath
        : getRoleHomePath(role);
      navigate(destination, { replace: true });
    } catch (err) {
      if (!err.response) {
        setError('Connexion au serveur impossible. Vérifiez votre connexion et réessayez.');
      } else {
        setError('Email, nom d’utilisateur ou mot de passe incorrect.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-[24px] bg-white shadow-lg">
          <div className="border-b border-[#E8ECE8] bg-white px-6 py-5 text-center">
            <div className="flex justify-center">
              <BrandLogo
                variant="horizontal"
                imageClassName="h-16 w-auto sm:h-[72px]"
                subtitle="Plateforme des artisans"
                subtitleClassName="mt-1 text-sm font-medium text-[#66736D]"
              />
            </div>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-6">
            <h2 className="text-xl font-semibold text-center text-gray-800">Connexion</h2>

            {sessionMessage && !error && (
              <div role="status" className="bg-amber-50 text-amber-800 border border-amber-100 p-3 rounded-md text-sm">
                {sessionMessage}
              </div>
            )}

            {error && (
              <div role="alert" className="bg-red-100 text-red-700 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
                Email ou nom d'utilisateur
              </label>
              <input
                type="text"
                id="identifier"
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">Mot de passe</label>
                <Link to="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-800">Oublié ?</Link>
              </div>
              <input
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition duration-200 disabled:opacity-60"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <div className="bg-gray-50 py-4 text-center">
            <p className="text-sm text-gray-600">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-indigo-600 hover:text-indigo-800 font-medium">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
