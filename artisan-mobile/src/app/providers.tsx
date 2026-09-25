import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { SessionBootstrap } from '../features/auth/SessionBootstrap';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: (failureCount, error) => {
              const status =
                error && typeof error === 'object' && 'status' in error
                  ? Number((error as { status?: number }).status)
                  : 0;
              if (status >= 400 && status < 500) return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: false
          },
          mutations: { retry: false }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionBootstrap>{children}</SessionBootstrap>
    </QueryClientProvider>
  );
}
