import { useState, useEffect } from 'react';

export default function ClientDashboard() {
  const [rdvs, setRdvs] = useState([]);
  const [paiements, setPaiements] = useState([]);
  const [avis, setAvis] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState(' Client');

  // Simulation de chargement des données
  useEffect(() => {
  const fetchInitial = async () => {
    setLoading(true);
    // Chargement immédiat
    setRdvs([
      { id: 1, service_titre: 'Réparation plomberie', date_rdv: '2025-05-12T14:30:00', statut: 'confirme', artisan: 'Martin Plombier' },
      { id: 2, service_titre: 'Installation électrique', date_rdv: '2025-05-10T10:00:00', statut: 'en_attente', artisan: 'Électricité Pro' },
    ]);
    setUsername('Client');
    setLoading(false);

    // Chargement secondaire
    setTimeout(() => {
      setPaiements([
        { id: 101, montant: 120, date: '2025-05-01', service: 'Réparation plomberie' },
        { id: 102, montant: 85, date: '2025-04-28', service: 'Installation électrique' }
      ]);
      setAvis([
        { id: 201, note: 5, commentaire: "Excellent travail", date: '2025-04-20' }
      ]);
      setNotifications([
        { id: 301, message: "Votre rendez-vous est confirmé", date: '2025-05-07', lu: false },
        { id: 302, message: "Nouvel avis reçu", date: '2025-05-06', lu: false }
      ]);
    }, 300); // délai plus court, visible mais rapide
  };

  fetchInitial();
}, []);


  const nouvellesNotifs = notifications.filter(n => !n.lu);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header du dashboard */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bienvenue, {username} 👋</h1>
              <p className="mt-1 text-gray-600">Voici un aperçu de votre activité sur Artisan_CI</p>
            </div>
            <div className="mt-4 md:mt-0">
              <button 
                onClick={() => console.log('Chercher un artisan')} 
                className="bg-indigo-600 text-white px-5 py-2 rounded-md hover:bg-indigo-700 transition duration-200 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Trouver un artisan
              </button>
            </div>
          </div>
        </div>
        
        {/* Cartes des statistiques */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <svg className="animate-spin h-12 w-12 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Carte des rendez-vous */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-indigo-100 p-3 rounded-md">
                    <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h2 className="text-lg font-semibold text-gray-800">Rendez-vous</h2>
                    <p className="text-3xl font-bold text-gray-900">{rdvs.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <a href="/client/rdvs" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center">
                  Voir tous
                  <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Carte des paiements */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-100 p-3 rounded-md">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h2 className="text-lg font-semibold text-gray-800">Paiements</h2>
                    <p className="text-3xl font-bold text-gray-900">{paiements.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <a href="/client/paiements" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center">
                  Voir tous
                  <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Carte des avis */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-yellow-100 p-3 rounded-md">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h2 className="text-lg font-semibold text-gray-800">Avis donnés</h2>
                    <p className="text-3xl font-bold text-gray-900">{avis.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <a href="/client/avis" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center">
                  Voir tous
                  <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Carte des notifications */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-red-100 p-3 rounded-md">
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div className="ml-4 flex-grow">
                    <h2 className="text-lg font-semibold text-gray-800">Notifications</h2>
                    <div className="flex items-center">
                      <p className="text-3xl font-bold text-gray-900">{nouvellesNotifs.length}</p>
                      {nouvellesNotifs.length > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          Nouveau
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <a href="/client/notifications" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center">
                  Voir tous
                  <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        )}
        
        {/* Aperçu des rendez-vous */}
        {!loading && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Vos rendez-vous récents</h3>
            </div>
            <div className="px-6 py-5">
              {rdvs.length === 0 ? (
                <p className="text-gray-500">Aucun rendez-vous passé.</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {rdvs.map(rdv => (
                    <div key={rdv.id} className="py-4 flex items-start">
                      <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
                        rdv.statut === 'confirme' ? 'bg-green-500' :
                        rdv.statut === 'en_attente' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                      <div className="ml-4 flex-grow">
                        <div className="flex justify-between">
                          <h4 className="text-base font-medium text-gray-900">{rdv.service_titre}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            rdv.statut === 'confirme' ? 'bg-green-100 text-green-800' :
                            rdv.statut === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'}`}>
                            {rdv.statut === 'confirme' ? 'Confirmé' :
                             rdv.statut === 'en_attente' ? 'En attente' : 'Terminé'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(rdv.date_rdv).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Avec: {rdv.artisan}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {rdvs.length > 0 && (
                <div className="mt-4 text-center">
                  <a href="/client/dashboard" className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800">
                    Voir tous mes rendez-vous
                    <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}