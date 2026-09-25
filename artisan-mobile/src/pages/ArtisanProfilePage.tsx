import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, CheckCircle2, Images, LogOut, Pencil, ShieldCheck, UserRound } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/http';
import { MobileTopBar } from '../components/MobileTopBar';
import { getMe, logout } from '../features/auth/auth.api';
import { useAuthStore } from '../features/auth/auth.store';
import { getProfile } from '../features/profile/profile.api';
import { requestArtisanVerification, updateArtisanAccount } from '../features/artisan/professional.api';

const statusMeta = {
  verified: ['Vérifié', 'bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]'],
  pending: ['Vérification en cours', 'bg-[var(--artisan-gold-soft)] text-[#8A6500]'],
  rejected: ['Vérification refusée', 'bg-[var(--artisan-danger-soft)] text-[#A83228]'],
  unverified: ['Non vérifié', 'bg-[#EEF1EF] text-[var(--artisan-muted)]']
} as const;

export function ArtisanProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  const profile = useQuery({ queryKey: ['artisan-profile'], queryFn: getProfile });
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [numeroMomo, setNumeroMomo] = useState('');
  const [qrWave, setQrWave] = useState<File | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile.data) return;
    setUsername(profile.data.username);
    setNumeroMomo(profile.data.numero_momo ?? '');
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () => updateArtisanAccount({ username, numero_momo: numeroMomo, qr_wave: qrWave }),
    onSuccess: async () => {
      const me = await getMe();
      if (accessToken) setAuthenticated(accessToken, me);
      await queryClient.invalidateQueries({ queryKey: ['artisan-profile'] });
      setEditing(false);
      setQrWave(null);
      setError('');
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Impossible de mettre à jour le profil.')
  });

  const verify = useMutation({
    mutationFn: requestArtisanVerification,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['artisan-profile'] }),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Demande impossible.')
  });

  const signOut = useMutation({
    mutationFn: logout,
    onSettled: () => {
      setAnonymous();
      navigate('/connexion', { replace: true });
    }
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!username.trim()) {
      setError('Le nom d’utilisateur est requis.');
      return;
    }
    save.mutate();
  }

  const status = profile.data?.verification_status ?? 'unverified';
  const meta = statusMeta[status];

  return (
    <div>
      <MobileTopBar />
      <section className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Compte professionnel</p>
          <h1 className="mt-1.5 text-[28px] font-black tracking-[-0.045em] text-[var(--artisan-ink)]">Mon profil</h1>
          <p className="mt-1 text-sm leading-5 text-[var(--artisan-muted)]">Gérez votre identité et vos informations de règlement.</p>
        </div>
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]"><UserRound size={22} /></span>
      </section>

      {profile.isPending ? <div className="mt-5 h-48 animate-pulse rounded-3xl bg-white" /> : null}

      {profile.data ? (
        <>
          <section className="mt-5 rounded-3xl border border-black/5 bg-white p-5 shadow-[var(--artisan-shadow-card)]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-[var(--artisan-ink)]">{profile.data.username}</p>
                <p className="mt-1 truncate text-xs font-semibold text-[var(--artisan-muted)]">{profile.data.email}</p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black ${meta[1]}`}>{meta[0]}</span>
            </div>

            {profile.data.verification_note ? (
              <div className="mt-4 rounded-2xl bg-[#F7F8F6] px-3 py-2.5 text-xs leading-5 text-[var(--artisan-muted)]">{profile.data.verification_note}</div>
            ) : null}

            {status !== 'verified' && status !== 'pending' ? (
              <button type="button" onClick={() => verify.mutate()} disabled={verify.isPending} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--artisan-green)] px-4 text-sm font-black text-white disabled:opacity-50">
                <ShieldCheck size={18} /> {verify.isPending ? 'Envoi…' : 'Demander la vérification'}
              </button>
            ) : null}
          </section>

          <section className="mt-4 grid grid-cols-2 gap-3">
            <Link to="/artisan/portfolio" className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm">
              <span className="grid size-10 place-items-center rounded-2xl bg-[var(--artisan-orange-soft)] text-[var(--artisan-orange)]"><Images size={19} /></span>
              <p className="mt-4 text-sm font-black text-[var(--artisan-ink)]">Portfolio</p>
              <p className="mt-1 text-xs leading-5 text-[var(--artisan-muted)]">Bio, localisation et réalisations.</p>
            </Link>
            <Link to="/artisan/certifications" className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm">
              <span className="grid size-10 place-items-center rounded-2xl bg-[var(--artisan-gold-soft)] text-[#8A6500]"><Award size={19} /></span>
              <p className="mt-4 text-sm font-black text-[var(--artisan-ink)]">Certifications</p>
              <p className="mt-1 text-xs leading-5 text-[var(--artisan-muted)]">Ajoutez vos justificatifs professionnels.</p>
            </Link>
          </section>

          <section className="mt-4 rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-[var(--artisan-ink)]">Informations du compte</p>
                <p className="mt-1 text-xs text-[var(--artisan-muted)]">Utilisées pour votre profil et vos règlements.</p>
              </div>
              <button type="button" onClick={() => setEditing((value) => !value)} className="grid size-10 place-items-center rounded-xl bg-[#F4F6F4] text-[var(--artisan-green)]" aria-label="Modifier"><Pencil size={17} /></button>
            </div>

            {!editing ? (
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-2xl bg-[#F7F8F6] px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wide text-[#829087]">Nom d’utilisateur</p><p className="mt-1 font-bold">{profile.data.username}</p></div>
                <div className="rounded-2xl bg-[#F7F8F6] px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wide text-[#829087]">Numéro Mobile Money</p><p className="mt-1 font-bold">{profile.data.numero_momo || 'Non renseigné'}</p></div>
                <div className="rounded-2xl bg-[#F7F8F6] px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wide text-[#829087]">QR Wave</p><p className="mt-1 font-bold">{profile.data.qr_wave ? 'Configuré' : 'Non configuré'}</p></div>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-4">
                <label className="block"><span className="text-xs font-black">Nom d’utilisateur</span><input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-[#D9E1DD] bg-white px-4 text-sm font-bold outline-none focus:border-[var(--artisan-green)]" /></label>
                <label className="block"><span className="text-xs font-black">Numéro Mobile Money</span><input value={numeroMomo} onChange={(e) => setNumeroMomo(e.target.value)} placeholder="Ex. +2250102030405" className="mt-2 min-h-12 w-full rounded-2xl border border-[#D9E1DD] bg-white px-4 text-sm font-bold outline-none focus:border-[var(--artisan-green)]" /></label>
                <label className="block"><span className="text-xs font-black">QR Wave</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setQrWave(e.target.files?.[0] ?? null)} className="mt-2 block w-full rounded-2xl border border-dashed border-[#BFCBC5] bg-[#F7F8F6] p-3 text-xs" /></label>
                {error ? <p className="rounded-2xl bg-[var(--artisan-danger-soft)] px-3 py-2 text-xs font-semibold text-[#A83228]">{error}</p> : null}
                <button type="submit" disabled={save.isPending} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--artisan-green)] px-4 text-sm font-black text-white disabled:opacity-50"><CheckCircle2 size={18} /> {save.isPending ? 'Enregistrement…' : 'Enregistrer'}</button>
              </form>
            )}
          </section>

          <button type="button" onClick={() => signOut.mutate()} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--artisan-danger-soft)] px-4 text-sm font-black text-[#A83228]"><LogOut size={18} /> Se déconnecter</button>
        </>
      ) : null}
    </div>
  );
}
