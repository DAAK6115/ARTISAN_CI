import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';
import { useNavigate } from 'react-router-dom';

export default function ClientNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [avisDonnes, setAvisDonnes] = useState([]); // contiendra des IDs (ex: [1, 2])
  const [appointments, setAppointments] = useState({});
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      // 1. Récupère les notifications et les avis en parallèle
      const [notifRes, avisRes] = await Promise.all([
        axios.get('/notifications/'),
        axios.get('/reviews/mes/')
      ]);

      setNotifications(notifRes.data);

      // 2. Récupère uniquement les ID des rendez-vous avec avis donnés
      const avisRdvIds = avisRes.data
      .filter(a => a.rendez_vous && a.rendez_vous.id)
      .map(a => a.rendez_vous.id);
      setAvisDonnes(avisRdvIds);

      // 3. Récupère les ID uniques des rendez-vous présents dans les notifications
      const uniqueRdvIds = [...new Set(
        notifRes.data
          .map(n => n.rendez_vous_id)
          .filter(Boolean)
      )];

      // 4. Précharge les rendez-vous associés pour afficher le titre du service
      const fetchedAppointments = {};
      await Promise.all(uniqueRdvIds.map(async (id) => {
        try {
          const res = await axios.get(`/appointments/${id}/`);
          fetchedAppointments[id] = res.data;
        } catch (e) {
          console.warn('RDV non trouvé :', id);
        }
      }));
      setAppointments(fetchedAppointments);
    } catch (err) {
      console.error("Erreur lors du chargement des notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleNoter = (rdv_id) => {
    if (rdv_id) {
      navigate("/client/noter-artisan/" + rdv_id)
    } else {
      console.error("rdv_id invalide : ", rdv_id);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">🔔 Mes Notifications</h1>

      {notifications.length === 0 ? (
        <p className="text-gray-600">Aucune notification disponible.</p>
      ) : (
        <div className="space-y-4">
          {notifications
          .filter(notif => notif.rendez_vous_id) // On garde seulement celles avec un rdv valide  
          .map((notif) => {
            const rdvId = notif.rendez_vous_id;
            const aDejaNote = avisDonnes.includes(rdvId);

            return (
              <div key={notif.id} className="bg-white rounded shadow p-4">
                <h2
                  className="font-semibold text-lg text-indigo-700 cursor-pointer hover:underline"
                  onClick={() => handleNoter(rdvId)}
                >
                  {notif.titre}
                </h2>

                <p className="text-gray-700 mt-2">{notif.message}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Reçu le {new Date(notif.date_envoi).toLocaleString()}
                </p>

                {rdvId && !aDejaNote && (
                  <button
                    onClick={() => handleNoter(rdvId)}
                    className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                  >
                    Noter cette prestation
                  </button>
                )}

                {aDejaNote && (
                  <p className="mt-2 text-green-600 font-medium">✔️ Avis déjà donné</p>
                )}

                {appointments[rdvId] && (
                  <p className="text-sm text-gray-600 mt-1 italic">
                    Prestation : {appointments[rdvId].service_titre || 'N/A'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
