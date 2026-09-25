import {
  Wrench,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
  UsersRound
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/http';
import { BrandMark } from '../components/BrandMark';
import { register } from '../features/auth/auth.api';

type PublicRole = 'client' | 'artisan';

function apiValidationMessage(cause: unknown): string {
  if (!(cause instanceof ApiError)) {
    return cause instanceof Error ? cause.message : 'Inscription impossible. Réessayez.';
  }

  const payload = cause.payload;
  if (!payload || typeof payload !== 'object') return cause.message;

  const record = payload as Record<string, unknown>;
  const labels: Record<string, string> = {
    email: 'Email',
    username: 'Nom d’utilisateur',
    password: 'Mot de passe',
    role: 'Type de compte',
    non_field_errors: 'Inscription'
  };

  for (const key of ['email', 'username', 'password', 'role', 'non_field_errors']) {
    const value = record[key];
    const label = labels[key] ?? key;
    if (Array.isArray(value) && typeof value[0] === 'string') {
      return `${label} : ${value[0]}`;
    }
    if (typeof value === 'string' && value) {
      return `${label} : ${value}`;
    }
  }

  return cause.message;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<PublicRole>('client');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const passwordChecks = useMemo(() => ({
    length: password.length >= 10,
    match: password.length > 0 && password === confirmPassword
  }), [password, confirmPassword]);

  const formReady = Boolean(
    email.trim()
    && username.trim()
    && passwordChecks.length
    && passwordChecks.match
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !formReady) return;

    setError('');
    setBusy(true);

    try {
      await register({
        email,
        username,
        password,
        role
      });
      navigate('/connexion?registered=1', { replace: true });
    } catch (cause) {
      setError(apiValidationMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--artisan-surface)] px-4 pb-10 pt-[max(20px,env(safe-area-inset-top))] sm:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(11,107,80,0.14),_transparent_38%),radial-gradient(circle_at_90%_18%,_rgba(212,107,36,0.12),_transparent_30%)]" />

      <div className="relative mx-auto w-full max-w-md">
        <BrandMark large subtitle="Plateforme des artisans" />

        <section className="mt-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#0B6B50]/15 bg-white/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--artisan-green)] shadow-sm backdrop-blur">
            <span className="size-2 rounded-full bg-[var(--artisan-gold)]" />
            Rejoignez ARTISAN_CI
          </span>

          <h1 className="mt-5 text-[36px] font-black leading-[1.02] tracking-[-0.055em] text-[var(--artisan-ink)]">
            Créez votre compte.
            <span className="block text-[var(--artisan-green)]">Commencez simplement.</span>
          </h1>
          <p className="mt-3 text-[15px] leading-6 text-[var(--artisan-text-secondary)]">
            Choisissez votre profil puis renseignez les informations nécessaires pour rejoindre la plateforme.
          </p>

          <form onSubmit={onSubmit} className="mt-7 rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_18px_50px_rgba(20,38,30,0.10)]" noValidate>
            <div>
              <p className="text-sm font-black text-[var(--artisan-ink)]">Je souhaite utiliser ARTISAN_CI comme</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('client')}
                  aria-pressed={role === 'client'}
                  className={`rounded-2xl border p-3 text-left transition ${role === 'client' ? 'border-[var(--artisan-green)] bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]' : 'border-black/5 bg-[var(--artisan-surface-soft)] text-[var(--artisan-ink)]'}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className={`grid size-10 place-items-center rounded-xl ${role === 'client' ? 'bg-white' : 'bg-white/70'}`}>
                      <UsersRound size={19} aria-hidden="true" />
                    </span>
                    {role === 'client' ? <Check size={18} strokeWidth={3} aria-hidden="true" /> : null}
                  </span>
                  <span className="mt-3 block text-sm font-black">Client</span>
                  <span className="mt-1 block text-[11px] leading-4 opacity-70">Je recherche un artisan.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('artisan')}
                  aria-pressed={role === 'artisan'}
                  className={`rounded-2xl border p-3 text-left transition ${role === 'artisan' ? 'border-[var(--artisan-green)] bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]' : 'border-black/5 bg-[var(--artisan-surface-soft)] text-[var(--artisan-ink)]'}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className={`grid size-10 place-items-center rounded-xl ${role === 'artisan' ? 'bg-white' : 'bg-white/70'}`}>
                      <Wrench size={19} aria-hidden="true" />
                    </span>
                    {role === 'artisan' ? <Check size={18} strokeWidth={3} aria-hidden="true" /> : null}
                  </span>
                  <span className="mt-3 block text-sm font-black">Artisan</span>
                  <span className="mt-1 block text-[11px] leading-4 opacity-70">Je propose mes prestations.</span>
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="sr-only">Nom d’utilisateur</span>
                <span className="flex min-h-14 items-center gap-3 rounded-2xl bg-[var(--artisan-surface-soft)] px-4 focus-within:ring-4 focus-within:ring-[#0B6B50]/10">
                  <UserRound size={19} className="shrink-0 text-[var(--artisan-green)]" aria-hidden="true" />
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    required
                    maxLength={150}
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[var(--artisan-ink)] outline-none placeholder:font-medium placeholder:text-[#8A958F]"
                    placeholder="Nom d’utilisateur"
                  />
                </span>
              </label>

              <label className="block">
                <span className="sr-only">Adresse email</span>
                <span className="flex min-h-14 items-center gap-3 rounded-2xl bg-[var(--artisan-surface-soft)] px-4 focus-within:ring-4 focus-within:ring-[#0B6B50]/10">
                  <Mail size={19} className="shrink-0 text-[var(--artisan-green)]" aria-hidden="true" />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    required
                    maxLength={254}
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[var(--artisan-ink)] outline-none placeholder:font-medium placeholder:text-[#8A958F]"
                    placeholder="Adresse email"
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
                    autoComplete="new-password"
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

              <label className="block">
                <span className="sr-only">Confirmer le mot de passe</span>
                <span className="flex min-h-14 items-center gap-3 rounded-2xl bg-[var(--artisan-surface-soft)] px-4 focus-within:ring-4 focus-within:ring-[#0B6B50]/10">
                  <LockKeyhole size={19} className="shrink-0 text-[var(--artisan-green)]" aria-hidden="true" />
                  <input
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={10}
                    maxLength={128}
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[var(--artisan-ink)] outline-none placeholder:font-medium placeholder:text-[#8A958F]"
                    placeholder="Confirmer le mot de passe"
                  />
                </span>
              </label>
            </div>

            <div className="mt-3 grid gap-1.5 text-[11px] font-semibold text-[var(--artisan-muted)]">
              <p className={passwordChecks.length ? 'text-[var(--artisan-green)]' : ''}>• Au moins 10 caractères</p>
              <p className={passwordChecks.match ? 'text-[var(--artisan-green)]' : ''}>• Les deux mots de passe doivent être identiques</p>
            </div>

            {error ? (
              <div role="alert" className="mt-3 rounded-2xl border border-[var(--artisan-danger)]/15 bg-[var(--artisan-danger-soft)] px-4 py-3 text-sm font-semibold text-[#A83228]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy || !formReady}
              className="mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl bg-[var(--artisan-green)] px-5 text-[15px] font-black text-white shadow-sm transition active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Création du compte…' : 'Créer mon compte'}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-[var(--artisan-muted)]">
              Déjà inscrit ?{' '}
              <Link to="/connexion" className="font-black text-[var(--artisan-green)]">
                Se connecter
              </Link>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
