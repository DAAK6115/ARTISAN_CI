import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export function NetworkBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex min-h-10 items-center justify-center gap-2 bg-[#201F1B] px-4 py-2 text-center text-xs font-semibold text-white shadow-lg">
      <WifiOff size={15} aria-hidden="true" />
      Connexion internet indisponible. Certaines actions sont temporairement bloquées.
    </div>
  );
}
