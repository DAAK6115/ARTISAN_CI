import { useState } from 'react';
import axios from '../../utils/axiosInstance';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/accounts/password-reset/request/', { email });
      setMessage("Un code a été envoyé à votre adresse email.");
    } catch (err) {
      setMessage("Erreur : email introuvable ou non valide.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-80 space-y-4">
        <h2 className="text-xl font-semibold text-center">Mot de passe oublié</h2>
        {message && <p className="text-sm text-center text-blue-600">{message}</p>}
        <input
          type="email"
          placeholder="Votre email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          required
        />
        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">
          Envoyer le code
        </button>
      </form>
    </div>
  );
}
