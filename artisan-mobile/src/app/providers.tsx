import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { SessionBootstrap } from '../features/auth/SessionBootstrap';

function shouldAutoRefresh(queryKey: readonly unknown[]) {
  return queryKey[0] !== 'artisan-complete-service';
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    let client!: QueryClient;

    client = new QueryClient({
      mutationCache: new MutationCache({
        onSuccess: async () => {
          // Toute action locale (accepter, refuser, créer, modifier, payer...)
          // met immédiatement à jour toutes les vues actuellement affichées.
          await client.invalidateQueries({
            predicate: (query) => shouldAutoRefresh(query.queryKey),
            refetchType: 'active'
          });
        }
      }),
      defaultOptions: {
        queries: {
          staleTime: 8_000,
          gcTime: 5 * 60_000,
          retry: (failureCount, error) => {
            const status =
              error && typeof error === 'object' && 'status' in error
                ? Number((error as { status?: number }).status)
                : 0;
            if (status >= 400 && status < 500) return false;
            return failureCount < 2;
          },
          refetchOnWindowFocus: 'always',
          refetchOnMount: 'always',
          refetchOnReconnect: 'always',
          networkMode: 'offlineFirst'
        },
        mutations: {
          retry: false,
          networkMode: 'online'
        }
      }
    });

    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SessionBootstrap>{children}</SessionBootstrap>
    </QueryClientProvider>
  );
}
