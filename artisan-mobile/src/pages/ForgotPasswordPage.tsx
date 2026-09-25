import { ArrowLeft, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/http';
import { BrandMark } from '../components/BrandMark';
import { confirmPasswordReset, requestPasswordReset } from '../features/auth/auth.api';

type Step = 'email' | 'confirm';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true); setError(''); setInfo('');
    try {
      const result = await requestPasswordReset(email);
      setInfo(result.message);
      setStep('confirm');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Impossible d’envoyer le code. Réessayez.');
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Saisissez le code à 6 chiffres reçu par email.');
      return;
    }
    if (password.length < 10) {
      setError('Le mot de passe doit contenir au moins 10 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setBusy(true); setError('');
    try {
      await confirmPasswordReset({ email, code, new_password: password });
      navigate('/connexion?reset=1', { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Réinitialisation impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--artisan-surface)] px-4 pb-10 pt-[max(20px,env(safe-area-inset-top))] sm:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(11,107,80,0.14),_transparent_38%),radial-gradient(circle_at_90%_18%,_rgba(212,107,36,0.12),_transparent_30%)]" />
      <div className="relative mx-auto w-full max-w-md">
        <BrandMark large subtitle="Sécurité du compte" />
        <Link to="/connexion" className="mt-6 inline-flex items-center gap-2 text-xs font-black text-[var(--artisan-green)]"><ArrowLeft size={15} /> Retour à la connexion</Link>

        <section className="mt-5 rounded-[30px] border border-black/5 bg-white p-5 shadow-[var(--artisan-shadow-card)]">
          <div className="flex items-start gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]"><ShieldCheck size={22} /></span>
            <div>
              <h1 className="text-xl font-black tracking-[-0.03em]">Mot de passe oublié</h1>
              <p className="mt-1 text-xs leading-5 text-[var(--artisan-muted)]">{step === 'email' ? 'Recevez un code de sécurité valable quelques minutes.' : 'Saisissez le code reçu puis choisissez un nouveau mot de passe.'}</p>
            </div>
          </div>

          {step === 'email' ? (
            <form onSubmit={requestCode} className="mt-5">
              <label className="block"><span className="text-xs font-black text-[var(--artisan-text)]">Adresse email</span><span className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl bg-[var(--artisan-surface-soft)] px-4"><Mail size={18} className="text-[var(--artisan-green)]" /><input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" placeholder="vous@exemple.com" /></span></label>
              <button disabled={busy || !email.trim()} className="mt-4 min-h-14 w-full rounded-2xl bg-[var(--artisan-green)] text-sm font-black text-white disabled:opacity-50">{busy ? 'Envoi…' : 'Recevoir le code'}</button>
            </form>
          ) : (
            <form onSubmit={resetPassword} className="mt-5 space-y-4">
              <label className="block"><span className="text-xs font-black text-[var(--artisan-text)]">Code à 6 chiffres</span><span className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl bg-[var(--artisan-surface-soft)] px-4"><KeyRound size={18} className="text-[var(--artisan-green)]" /><input required inputMode="numeric" pattern="[0-9]*" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="min-w-0 flex-1 bg-transparent text-lg font-black tracking-[0.25em] outline-none" placeholder="000000" /></span></label>
              <label className="block"><span className="text-xs font-black text-[var(--artisan-text)]">Nouveau mot de passe</span><span className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl bg-[var(--artisan-surface-soft)] px-4"><input required minLength={10} maxLength={128} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" placeholder="10 caractères minimum" /><button type="button" onClick={() => setShowPassword((v) => !v)} className="grid size-9 place-items-center rounded-xl text-[var(--artisan-muted)]" aria-label={showPassword ? 'Masquer' : 'Afficher'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
              <label className="block"><span className="text-xs font-black text-[var(--artisan-text)]">Confirmer</span><input required minLength={10} maxLength={128} type={showPassword ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-2 min-h-14 w-full rounded-2xl bg-[var(--artisan-surface-soft)] px-4 text-sm font-semibold outline-none" placeholder="Répétez le mot de passe" /></label>
              <button disabled={busy || code.length !== 6 || password.length < 10 || confirm.length < 10} className="min-h-14 w-full rounded-2xl bg-[var(--artisan-green)] text-sm font-black text-white disabled:opacity-50">{busy ? 'Mise à jour…' : 'Changer mon mot de passe'}</button>
              <button type="button" onClick={() => { setStep('email'); setCode(''); setError(''); }} className="w-full text-xs font-black text-[var(--artisan-green)]">Renvoyer un code</button>
            </form>
          )}

          {info ? <p className="mt-4 rounded-2xl bg-[var(--artisan-green-soft)] px-4 py-3 text-xs font-semibold leading-5 text-[var(--artisan-green)]">{info}</p> : null}
          {error ? <p role="alert" className="mt-4 rounded-2xl bg-[var(--artisan-danger-soft)] px-4 py-3 text-xs font-semibold leading-5 text-[var(--artisan-danger)]">{error}</p> : null}
        </section>
      </div>
    </div>
  );
}
