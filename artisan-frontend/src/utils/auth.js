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

export const getAccessToken = () =>
  localStorage.getItem(STORAGE_KEYS.access) || localStorage.getItem(STORAGE_KEYS.legacyToken);
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

  // Un refresh encore valide permet à l'intercepteur Axios de restaurer
  // silencieusement un access token après un rechargement de page.
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
  // Compatibilité temporaire avec les anciennes pages du dépôt.
  localStorage.setItem(STORAGE_KEYS.legacyToken, access);
};

export const updateTokens = ({ access, refresh }) => {
  if (access) {
    localStorage.setItem(STORAGE_KEYS.access, access);
    localStorage.setItem(STORAGE_KEYS.legacyToken, access);
  }
  if (refresh) localStorage.setItem(STORAGE_KEYS.refresh, refresh);
};

export const clearSession = () => {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
};

export const getRoleHomePath = (role = getUserRole()) => {
  if (role === 'artisan') return '/artisan/dashboard';
  if (role === 'client') return '/client/dashboard';
  return '/forbidden';
};
