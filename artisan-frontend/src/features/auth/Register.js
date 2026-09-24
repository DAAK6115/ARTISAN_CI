import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosInstance';

export default function Register() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    passwordConfirm: '',
    role: 'client',
  });
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setMessage('');
    setSuccess(false);

    if (form.password !== form.passwordConfirm) {
      setMessage('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);

    try {
      await axios.post('/accounts/register/', {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      setSuccess(true);
      setMessage('Compte créé avec succès. Vous pouvez maintenant vous connecter.');
      setForm({ username: '', email: '', password: '', passwordConfirm: '', role: 'client' });
    } catch (err) {
      const data = err.response?.data;
      if (data?.email) setMessage('Cette adresse email est déjà utilisée ou invalide.');
      else if (data?.username) setMessage("Ce nom d'utilisateur est déjà utilisé ou invalide.");
      else if (data?.password) setMessage('Le mot de passe ne respecte pas les règles de sécurité.');
      else if (data?.role) setMessage('Le type de compte sélectionné est invalide.');
      else setMessage("Impossible de créer le compte pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-6 text-center">
          <h1 className="text-2xl font-bold text-white">Artisan_CI</h1>
          <p className="text-indigo-200 mt-1">Plateforme des artisans</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800 text-center">Inscription</h2>

          {message && (
            <div role="status" className={`text-sm p-3 rounded text-center ${success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message}
            </div>
          )}

          <input type="text" name="username" autoComplete="username" placeholder="Nom d'utilisateur" value={form.username} onChange={handleChange} required className="w-full p-2 border rounded" />
          <input type="email" name="email" autoComplete="email" placeholder="Email" value={form.email} onChange={handleChange} required className="w-full p-2 border rounded" />
          <input type="password" name="password" autoComplete="new-password" minLength={10} placeholder="Mot de passe" value={form.password} onChange={handleChange} required className="w-full p-2 border rounded" />
          <input type="password" name="passwordConfirm" autoComplete="new-password" minLength={10} placeholder="Confirmer le mot de passe" value={form.passwordConfirm} onChange={handleChange} required className="w-full p-2 border rounded" />

          <select name="role" value={form.role} onChange={handleChange} className="w-full p-2 border rounded">
            <option value="client">Client</option>
            <option value="artisan">Artisan</option>
          </select>

          <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-60">
            {loading ? 'Création…' : 'Créer un compte'}
          </button>
        </form>

        <div className="bg-gray-50 py-4 text-center border-t border-gray-100">
          <p className="text-gray-600">
            Déjà un compte ? <Link to="/login" className="text-indigo-600 hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
