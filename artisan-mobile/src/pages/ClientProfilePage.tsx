import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, Save, ShieldCheck, UserRound } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { MobileTopBar } from '../components/MobileTopBar';
import { getMe, logout } from '../features/auth/auth.api';
import { useAuthStore } from '../features/auth/auth.store';
import { getProfile, updateProfile } from '../features/profile/profile.api';

export function ClientProfilePage() {
  const profile = useQuery({ queryKey: ['profile', 'me'], queryFn: getProfile });
  const queryClient = useQueryClient();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  const [username, setUsername] = useState('');
  const [momo, setMomo] = useState('');

  useEffect(() => {
    if (!profile.data) return;
    setUsername(profile.data.username);
    setMomo(profile.data.numero_momo ?? '');
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () => updateProfile({ username: username.trim(), numero_momo: momo.trim() || null }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      const user = await getMe();
      if (accessToken) setAuthenticated(accessToken, user);
    }
  });

  async function signOut() {
    try { await logout(); } finally { setAnonymous(); }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || save.isPending) return;
    save.mutate();
  }

  return (
    <div>
      <MobileTopBar showNotification={false} />
      <section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-[var(--artisan-shadow-card)]">
        <div className="flex items-center gap-3">
          <span className="grid size-14 place-items-center rounded-[20px] bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]"><UserRound size={24} /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black text-[var(--artisan-ink)]">{profile.data?.username ?? 'Mon profil'}</p>
            <p className="mt-0.5 truncate text-xs text-[var(--artisan-muted)]">{profile.data?.email ?? ''}</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-[var(--artisan-green-soft)] px-2.5 py-1 text-[10px] font-black text-[var(--artisan-green)]"><ShieldCheck size={12} /> Client</span>
        </div>
      </section>

      <form onSubmit={submit} className="mt-5 rounded-[30px] border border-black/5 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-black tracking-[-0.03em] text-[var(--artisan-ink)]">Informations du compte</h1>
        <div className="mt-4 grid gap-4">
          <label>
            <span className="text-xs font-black text-[#45534C]">Nom d’utilisateur</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={150} className="mt-2 min-h-13 w-full rounded-2xl border border-[#DDE5E0] bg-[#F7F8F6] px-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-[#0B6B50]/10" />
          </label>
          <label>
            <span className="text-xs font-black text-[#45534C]">Numéro Mobile Money</span>
            <input value={momo} onChange={(event) => setMomo(event.target.value)} maxLength={20} inputMode="tel" placeholder="Ex. +2250102030405" className="mt-2 min-h-13 w-full rounded-2xl border border-[#DDE5E0] bg-[#F7F8F6] px-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-[#0B6B50]/10" />
          </label>
        </div>
        {save.isError ? <div className="mt-4 rounded-2xl bg-[var(--artisan-danger-soft)] px-4 py-3 text-sm font-semibold text-[#A83228]">{save.error instanceof Error ? save.error.message : 'Mise à jour impossible.'}</div> : null}
        {save.isSuccess ? <div className="mt-4 rounded-2xl bg-[var(--artisan-green-soft)] px-4 py-3 text-sm font-semibold text-[var(--artisan-green)]">Profil mis à jour.</div> : null}
        <button type="submit" disabled={!username.trim() || save.isPending} className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--artisan-green)] px-4 text-sm font-black text-white disabled:opacity-50"><Save size={17} /> {save.isPending ? 'Enregistrement…' : 'Enregistrer'}</button>
      </form>

      <button type="button" onClick={() => void signOut()} className="mt-4 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--artisan-danger-soft)] px-4 text-sm font-black text-[#A83228]"><LogOut size={17} /> Se déconnecter</button>
    </div>
  );
}
