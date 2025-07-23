// 📦 Imports
import { useEffect, useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import ArtisanNavbar from '../../components/ArtisanNavbar';

export default function ArtisanDashboard() {
  const [rdvs, setRdvs] = useState([]);
  const [prestations, setPrestations] = useState([]);
  const [revenus, setRevenus] = useState(0);
  const [avis, setAvis] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [profil, setProfil] = useState({ username: 'Artisan' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [resRdv, resPres, resMe] = await Promise.all([
          axiosInstance.get('/appointments/mes-rendezvous-artisan/'),
          axiosInstance.get('/services/mes-prestations/'),
          axiosInstance.get('/portfolio/me/')
        ]);

        setRdvs(resRdv.data);
        setPrestations(resPres.data);
        setProfil(resMe.data);
        setLoading(false);

        const revenusRdvsEffectues = resRdv.data
          .filter(r => r.statut === 'effectue' && typeof r.service_prix === 'number')
          .reduce((total, r) => total + r.service_prix, 0);
        setRevenus(revenusRdvsEffectues);

        const [resAvis, resNotif] = await Promise.all([
          axiosInstance.get('/reviews/artisan/'),
          axiosInstance.get('/notifications/')
        ]);

        setAvis(resAvis.data);
        setNotifications(resNotif.data);
      } catch (err) {
        console.error('Erreur chargement dashboard:', err);
      }
    };
    fetchInitial();
  }, []);

  const nouvellesNotifs = notifications.filter(n => !n.lu);

  return (
    <div className="bg-gray-50 min-h-screen">
      <ArtisanNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Bienvenue, {profil.artisan_nom || profil.username} 👋
          </h1>
          <p className="text-gray-600">Voici votre tableau de bord. Cliquez sur les icônes ou écoutez les infos 🔊.</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin h-10 w-10 border-4 border-indigo-400 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard icon="📅" label="Rendez-vous" value={`Vous avez ${rdvs.length} rendez-vous`} color="indigo" audio="Vous avez ${rdvs.length} rendez-vous cette semaine." />
            <StatCard icon="🛠️" label="Prestations" value={`Total : ${prestations.length}`} color="blue" audio="Vous avez réalisé ${prestations.length} prestations." />
            <StatCard icon="💸" label="Revenus" value={`${new Intl.NumberFormat('fr-FR').format(revenus)} FCFA`} color="green" audio={`Vous avez gagné ${revenus} francs ce mois.`} />
            <StatCard icon="⭐" label="Avis reçus" value={`${avis.length}`} color="yellow" audio={`Vous avez reçu ${avis.length} avis de vos clients.`} />
          </div>
        )}

        {!loading && nouvellesNotifs.length > 0 && (
          <div className="bg-white p-6 rounded shadow animate-pulse border-l-4 border-yellow-500">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">🔔 Notifications non lues</h2>
            <ul className="space-y-2">
              {nouvellesNotifs.map((n, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-center">
                  <span className="mr-2">🔊</span>{n.message} <span className="ml-2 text-gray-400">({n.date_envoi})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, audio }) {
  const colorMap = {
    indigo: 'text-indigo-600 bg-indigo-100',
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    yellow: 'text-yellow-600 bg-yellow-100'
  };

  const handleAudio = () => {
    const msg = new SpeechSynthesisUtterance(audio);
    window.speechSynthesis.speak(msg);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden relative">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${colorMap[color]} p-3 rounded-md text-2xl`}>
            {icon}
          </div>
          <div className="ml-4">
            <h2 className="text-lg font-semibold text-gray-800">{label}</h2>
            <p className="text-xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
        <button
          onClick={handleAudio}
          className="mt-3 text-sm text-gray-600 underline hover:text-gray-800"
        >
          🔊 Écouter ceci
        </button>
      </div>
    </div>
  );
}