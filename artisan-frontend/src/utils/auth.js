const STORAGE_KEYS = {
  access: 'access',
  refresh: 'refresh',
  user: 'user',
  role: 'role',
  legacyToken: 'token',
};

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

export const getAccessToken = () => localStorage.getItem(STORAGE_KEYS.access);
export const getRefreshToken = () => localStorage.getItem(STORAGE_KEYS.refresh);
export const getUsername = () => localStorage.getItem(STORAGE_KEYS.user);
export const getUserRole = () => localStorage.getItem(STORAGE_KEYS.role);

export const isTokenExpired = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 <= Date.now();
};

export const isAuthenticated = () => {
  const access = getAccessToken();
  if (access && !isTokenExpired(access)) return true;

  const refresh = getRefreshToken();
  return Boolean(refresh && !isTokenExpired(refresh));
};

export const saveSession = ({ access, refresh, username, role }) => {
  if (!access || !refresh || !username || !role) {
    throw new Error('Session incomplète.');
  }

  localStorage.setItem(STORAGE_KEYS.access, access);
  localStorage.setItem(STORAGE_KEYS.refresh, refresh);
  localStorage.setItem(STORAGE_KEYS.user, username);
  localStorage.setItem(STORAGE_KEYS.role, role);
  // Nettoyage de l'ancienne clé utilisée avant le Sprint 2.
  localStorage.removeItem(STORAGE_KEYS.legacyToken);
};

export const updateTokens = ({ access, refresh }) => {
  if (access) localStorage.setItem(STORAGE_KEYS.access, access);
  if (refresh) localStorage.setItem(STORAGE_KEYS.refresh, refresh);
  localStorage.removeItem(STORAGE_KEYS.legacyToken);
};

export const clearSession = () => {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
};

export const getRoleHomePath = (role = getUserRole()) => {
  if (role === 'artisan') return '/artisan/dashboard';
  if (role === 'client') return '/client/dashboard';
  if (role === 'admin') return '/admin/dashboard';
  return '/forbidden';
};

export const isSafeRolePath = (path, role) => {
  if (!path || typeof path !== 'string' || !path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  if (role === 'client') return path.startsWith('/client/');
  if (role === 'artisan') return path.startsWith('/artisan/');
  if (role === 'admin') return path.startsWith('/admin/');
  return false;
};
