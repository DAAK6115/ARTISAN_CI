import { create } from 'zustand';
import type { AuthUser } from '../../types/auth';

type AuthStatus = 'booting' | 'anonymous' | 'authenticated';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  status: AuthStatus;
  setAuthenticated: (accessToken: string, user: AuthUser) => void;
  setAccessToken: (accessToken: string | null) => void;
  setAnonymous: () => void;
  setStatus: (status: AuthStatus) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: 'booting',
  setAuthenticated: (accessToken, user) =>
    set({ accessToken, user, status: 'authenticated' }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setAnonymous: () => set({ accessToken: null, user: null, status: 'anonymous' }),
  setStatus: (status) => set({ status })
}));

export const authSnapshot = () => useAuthStore.getState();
