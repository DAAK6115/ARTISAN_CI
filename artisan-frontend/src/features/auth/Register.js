import { useState } from 'react';
import axios from '../../utils/axiosInstance';  // ⚠️ Assure-toi que ce fichier est bien configuré

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'client' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await axios.post('/accounts/register/', form);  // ✅ Requête réelle
      localStorage.setItem("token", res.data.access);
      console.log('Inscription réussie :', res.data);
      setMessage("Inscription réussie ✅ Vous pouvez vous connecter.");
    } catch (err) {
      console.error('Erreur lors de l’inscription :', err.response?.data || err.message);
      setMessage("❌ Erreur : " + (err.response?.data?.detail || 'Une erreur est survenue'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-6 text-center">
          <h1 className="text-2xl font-bold text-white">Artisan_CI</h1>
          <p className="text-indigo-200 mt-1">Plateforme des artisans</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800 text-center">Inscription</h2>

          {message && <div className="text-sm p-2 rounded bg-gray-100 text-center">{message}</div>}

          <input type="text" name="username" placeholder="Nom d'utilisateur" value={form.username} onChange={handleChange} required className="w-full p-2 border rounded" />
          <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} required className="w-full p-2 border rounded" />
          <input type="password" name="password" placeholder="Mot de passe" value={form.password} onChange={handleChange} required className="w-full p-2 border rounded" />
          <select name="role" value={form.role} onChange={handleChange} className="w-full p-2 border rounded">
            <option value="client">Client</option>
            <option value="artisan">Artisan</option>
          </select>

          <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
            {loading ? 'Création...' : 'Créer un compte'}
          </button>
        </form>

        <div className="bg-gray-50 py-4 text-center border-t border-gray-100">
          <p className="text-gray-600">
            Déjà un compte ? <a href="/" className="text-indigo-600 hover:underline">Se connecter</a>
          </p>
        </div>
      </div>
    </div>
  );
}
