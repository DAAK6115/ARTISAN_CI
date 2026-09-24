import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosInstance';

export default function ForgotPassword() {
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestCode = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.post('/accounts/password-reset/request/', {
        email: email.trim(),
      });
      setMessage(response.data?.message || 'Si le compte existe, un code a été envoyé.');
      setStep('confirm');
    } catch {
      setError('Impossible d’envoyer la demande pour le moment. Réessayez plus tard.');
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = async (event) => {
    event.preventDefault();
    if (loading) return;

    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);

    try {
      await axios.post('/accounts/password-reset/confirm/', {
        email: email.trim(),
        code: code.trim(),
        new_password: newPassword,
      });
      setStep('done');
      setMessage('Votre mot de passe a été modifié avec succès.');
    } catch (err) {
      if (err.response?.data?.new_password) {
        setError('Le nouveau mot de passe ne respecte pas les règles de sécurité.');
      } else {
        setError('Le code est invalide, expiré ou a déjà été utilisé.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-xl font-semibold text-center">Mot de passe oublié</h1>

        {message && <p role="status" className="mt-4 text-sm text-center text-green-700 bg-green-50 p-3 rounded">{message}</p>}
        {error && <p role="alert" className="mt-4 text-sm text-center text-red-700 bg-red-50 p-3 rounded">{error}</p>}

        {step === 'request' && (
          <form onSubmit={requestCode} className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-gray-700" htmlFor="reset-email">Votre email</label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-60">
              {loading ? 'Envoi…' : 'Envoyer le code'}
            </button>
          </form>
        )}

        {step === 'confirm' && (
          <form onSubmit={confirmReset} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="reset-code">Code à 6 chiffres</label>
              <input
                id="reset-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-2 border rounded tracking-widest text-center"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="new-password">Nouveau mot de passe</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={10}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="confirm-password">Confirmer le mot de passe</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={10}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-60">
              {loading ? 'Modification…' : 'Changer mon mot de passe'}
            </button>
            <button type="button" onClick={() => setStep('request')} className="w-full text-sm text-indigo-600 hover:underline">
              Demander un nouveau code
            </button>
          </form>
        )}

        {step === 'done' && (
          <Link to="/" className="mt-5 block text-center w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">
            Se connecter
          </Link>
        )}

        {step !== 'done' && (
          <Link to="/" className="mt-4 block text-center text-sm text-gray-600 hover:text-indigo-600">
            Retour à la connexion
          </Link>
        )}
      </div>
    </div>
  );
}
