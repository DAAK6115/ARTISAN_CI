import { useEffect, useState } from 'react';

export default function NetworkStatusBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[100] bg-[#8A5A16] px-4 py-2 text-center text-xs font-bold text-white shadow"
    >
      Connexion Internet indisponible. Certaines actions seront temporairement impossibles.
    </div>
  );
}
