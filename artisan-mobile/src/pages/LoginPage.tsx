import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { getMe, login } from '../features/auth/auth.api';
import { useAuthStore } from '../features/auth/auth.store';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const registered = searchParams.get('registered') === '1';

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);

    try {
      const session = await login({ identifier, password });
      useAuthStore.getState().setAccessToken(session.access);
      const user = await getMe();
      setAuthenticated(session.access, user);
      navigate(user.role === 'artisan' ? '/artisan' : user.role === 'client' ? '/client' : '/admin', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Connexion impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--artisan-surface)] px-4 pb-10 pt-[max(20px,env(safe-area-inset-top))] sm:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(11,107,80,0.14),_transparent_38%),radial-gradient(circle_at_90%_18%,_rgba(212,107,36,0.12),_transparent_30%)]" />

      <div className="relative mx-auto w-full max-w-md">
        <BrandMark large subtitle="Plateforme des artisans" />

        <section className="mt-9">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#0B6B50]/15 bg-white/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--artisan-green)] shadow-sm backdrop-blur">
            <span className="size-2 rounded-full bg-[var(--artisan-gold)]" />
            Services de proximité en Côte d’Ivoire
          </span>

          <h1 className="mt-5 text-[38px] font-black leading-[1.02] tracking-[-0.055em] text-[var(--artisan-ink)]">
            Bon retour.
            <span className="block text-[var(--artisan-green)]">Retrouvez votre espace.</span>
          </h1>
          <p className="mt-3 max-w-sm text-[15px] leading-6 text-[var(--artisan-text-secondary)]">
            Connectez-vous pour accéder à vos prestations, rendez-vous, messages et paiements.
          </p>

          <form onSubmit={onSubmit} className="mt-7 rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_18px_50px_rgba(20,38,30,0.10)]" noValidate>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-black tracking-[-0.03em] text-[var(--artisan-ink)]">Connexion</p>
                <p className="mt-1 text-xs leading-5 text-[var(--artisan-muted)]">Email ou nom d’utilisateur</p>
              </div>
              <span className="grid size-11 place-items-center rounded-2xl bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]">
                <ShieldCheck size={20} aria-hidden="true" />
              </span>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="sr-only">Email ou nom d’utilisateur</span>
                <span className="flex min-h-14 items-center gap-3 rounded-2xl bg-[var(--artisan-surface-soft)] px-4 focus-within:ring-4 focus-within:ring-[#0B6B50]/10">
                  <Mail size={19} className="shrink-0 text-[var(--artisan-green)]" aria-hidden="true" />
                  <input
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    autoComplete="username"
                    inputMode="email"
                    required
                    maxLength={254}
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[var(--artisan-ink)] outline-none placeholder:font-medium placeholder:text-[#8A958F]"
                    placeholder="Email ou nom d’utilisateur"
                  />
                </span>
              </label>

              <label className="block">
                <span className="sr-only">Mot de passe</span>
                <span className="flex min-h-14 items-center gap-3 rounded-2xl bg-[var(--artisan-surface-soft)] px-4 focus-within:ring-4 focus-within:ring-[#0B6B50]/10">
                  <LockKeyhole size={19} className="shrink-0 text-[var(--artisan-green)]" aria-hidden="true" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    minLength={10}
                    maxLength={128}
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[var(--artisan-ink)] outline-none placeholder:font-medium placeholder:text-[#8A958F]"
                    placeholder="Mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="grid size-9 shrink-0 place-items-center rounded-xl text-[#607069] hover:bg-white"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>
            </div>

            {registered && !error ? (
              <div role="status" className="mt-3 rounded-2xl border border-[#0B6B50]/15 bg-[var(--artisan-green-soft)] px-4 py-3 text-sm font-semibold text-[var(--artisan-green)]">
                Compte créé avec succès. Vous pouvez maintenant vous connecter.
              </div>
            ) : null}

            {error ? (
              <div role="alert" className="mt-3 rounded-2xl border border-[var(--artisan-danger)]/15 bg-[var(--artisan-danger-soft)] px-4 py-3 text-sm font-semibold text-[#A83228]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy || !identifier.trim() || password.length < 10}
              className="mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl bg-[var(--artisan-green)] px-5 text-[15px] font-black text-white shadow-sm transition active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Connexion…' : 'Se connecter'}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-[var(--artisan-muted)]">
              Pas encore de compte ?{' '}
              <Link to="/inscription" className="font-black text-[var(--artisan-green)]">
                Créer un compte
              </Link>
            </p>
          </form>

          <div className="mt-5 rounded-[22px] bg-[#111815] px-4 py-4 text-white shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--artisan-gold)]">Pensé localement</p>
            <p className="mt-1.5 text-sm font-black">FCFA · proximité · simplicité</p>
            <p className="mt-1 text-xs leading-5 text-white/65">Une expérience mobile cohérente avec ARTISAN_CI sur le web.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
