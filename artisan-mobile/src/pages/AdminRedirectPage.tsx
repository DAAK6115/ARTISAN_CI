import { useEffect } from 'react';

export function AdminRedirectPage() {
  useEffect(() => {
    window.location.assign('https://artisan-ci.vercel.app/admin/dashboard');
  }, []);
  return <div className="grid min-h-dvh place-items-center text-sm font-semibold">Ouverture de l’administration…</div>;
}
