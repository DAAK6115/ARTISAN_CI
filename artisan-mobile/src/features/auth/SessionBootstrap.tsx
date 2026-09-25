import { useEffect } from 'react';
import { bootstrapAccessToken } from '../../api/http';
import { getMe } from './auth.api';
import { useAuthStore } from './auth.store';

export function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setAnonymous = useAuthStore((state) => state.setAnonymous);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const access = await bootstrapAccessToken();
      if (!active) return;

      if (!access) {
        setAnonymous();
        return;
      }

      try {
        const user = await getMe();
        if (active) setAuthenticated(access, user);
      } catch {
        if (active) setAnonymous();
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, [setAnonymous, setAuthenticated]);

  return children;
}
