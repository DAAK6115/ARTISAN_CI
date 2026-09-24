import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';

import PrivateRoute from './components/PrivateRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import ClientNavbar from './components/ClientNavbar';
import ArtisanNavbar from './components/ArtisanNavbar';

import Login from './features/auth/Login';
import Register from './features/auth/Register';
import ForgotPassword from './features/auth/ForgotPassword';

import ArtisanDashboard from './pages/artisan/ArtisanDashboard';
import ArtisanServices from './pages/artisan/ArtisanServices';
import ArtisanAppointments from './pages/artisan/ArtisanAppointments';
import ArtisanPortfolio from './pages/artisan/ArtisanPortfolio';
import ArtisanCertifications from './pages/artisan/ArtisanCertifications';
import ArtisanPaiements from './pages/artisan/ArtisanPaiements';
import ArtisanQuotesPage from './pages/artisan/ArtisanQuotesPage';
import ArtisanProfilePage from './pages/artisan/ArtisanProfilePage';
import ArtisanProfileEditPage from './pages/artisan/ArtisanProfileEditPage';
import ListeConversationsArtisanPage from './pages/artisan/ListeConversationsArtisanPage';

import ClientDashboard from './pages/client/ClientDashboard';
import ArtisansList from './pages/client/ArtisansList';
import ServicesList from './pages/client/ServicesList';
import ServiceDetail from './pages/client/ServiceDetail';
import FavorisPage from './pages/client/FavorisPage';
import MesRendezVous from './pages/client/MesRendezVous';
import PaiementsPage from './pages/client/PaiementsPage';
import ClientQuotesPage from './pages/client/ClientQuotesPage';
import ClientNotificationsPage from './pages/client/ClientNotificationsPage';
import DonnerAvisPage from './pages/client/DonnerAvisPage';
import ClientProfilePage from './pages/client/ClientProfilePage';
import ClientProfileEditPage from './pages/client/ClientProfileEditPage';
import NoterArtisanPage from './pages/client/NoterArtisanPage';

import ArtisanPublicProfilePage from './pages/ArtisanPublicProfilePage';
import ChatPage from './pages/chat/ChatPage';
import ListeConversationsPage from './pages/chat/ListeConversationsPage';

import ForbiddenPage from './pages/system/ForbiddenPage';
import NotFoundPage from './pages/system/NotFoundPage';
import RoleHomeRedirect from './pages/system/RoleHomeRedirect';

function ClientLayout({ children }) {
  return (
    <div className="min-h-screen md:flex bg-gray-50">
      <ClientNavbar />
      <main className="flex-1 min-w-0 p-4 md:p-6">{children}</main>
    </div>
  );
}

// Certaines pages artisan historiques affichent déjà ArtisanNavbar elles-mêmes.
// Ce shell est réservé aux pages qui n'ont pas encore leur propre navigation,
// afin d'éviter un double menu pendant cette phase de nettoyage.
function ArtisanNavigationShell({ children }) {
  return (
    <>
      <ArtisanNavbar />
      <main className="pt-20 px-4 md:px-6">{children}</main>
    </>
  );
}

function ClientRoute({ children }) {
  return (
    <PrivateRoute allowedRoles={['client']}>
      <ClientLayout>{children}</ClientLayout>
    </PrivateRoute>
  );
}

function ArtisanRoute({ children, withNavigation = false }) {
  return (
    <PrivateRoute allowedRoles={['artisan']}>
      {withNavigation ? (
        <ArtisanNavigationShell>{children}</ArtisanNavigationShell>
      ) : children}
    </PrivateRoute>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Authentification publique */}
        <Route path="/" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
        <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
        <Route path="/forgotpassword" element={<Navigate to="/forgot-password" replace />} />

        {/* Redirection vers l'espace correspondant au rôle connecté */}
        <Route path="/dashboard" element={<PrivateRoute><RoleHomeRedirect /></PrivateRoute>} />
        <Route path="/dashboard/:username" element={<PrivateRoute><RoleHomeRedirect /></PrivateRoute>} />

        {/* Profil artisan public : accessible sans compte */}
        <Route path="/artisans/:username" element={<ArtisanPublicProfilePage />} />

        {/* Espace client */}
        <Route path="/client/dashboard" element={<ClientRoute><ClientDashboard /></ClientRoute>} />
        <Route path="/client/artisans" element={<ClientRoute><ArtisansList /></ClientRoute>} />
        <Route path="/client/services" element={<ClientRoute><ServicesList /></ClientRoute>} />
        <Route path="/client/services/:id" element={<ClientRoute><ServiceDetail /></ClientRoute>} />
        <Route path="/client/favoris" element={<ClientRoute><FavorisPage /></ClientRoute>} />
        <Route path="/client/rdvs" element={<ClientRoute><MesRendezVous /></ClientRoute>} />
        <Route path="/client/paiements" element={<ClientRoute><PaiementsPage /></ClientRoute>} />
        <Route path="/client/devis" element={<ClientRoute><ClientQuotesPage /></ClientRoute>} />
        <Route path="/client/notifications" element={<ClientRoute><ClientNotificationsPage /></ClientRoute>} />
        <Route path="/client/avis" element={<ClientRoute><DonnerAvisPage /></ClientRoute>} />
        <Route path="/client/noter-artisan/:rdv_id" element={<ClientRoute><NoterArtisanPage /></ClientRoute>} />
        <Route path="/client/avis/ajouter/:rdv_id" element={<ClientRoute><NoterArtisanPage /></ClientRoute>} />
        <Route path="/client/profil" element={<ClientRoute><ClientProfilePage /></ClientRoute>} />
        <Route path="/client/profil/edit" element={<ClientRoute><ClientProfileEditPage /></ClientRoute>} />
        <Route path="/client/mes-conversations" element={<ClientRoute><ListeConversationsPage /></ClientRoute>} />
        <Route path="/client/messagerie/:username" element={<ClientRoute><ChatPage /></ClientRoute>} />

        {/* Compatibilité avec les anciens liens déjà présents dans le projet */}
        <Route path="/mes-conversations" element={<ClientRoute><ListeConversationsPage /></ClientRoute>} />
        <Route path="/messagerie/:username" element={<ClientRoute><ChatPage /></ClientRoute>} />

        {/* Espace artisan */}
        <Route path="/artisan/dashboard" element={<ArtisanRoute><ArtisanDashboard /></ArtisanRoute>} />
        <Route path="/artisan/services" element={<ArtisanRoute><ArtisanServices /></ArtisanRoute>} />
        <Route path="/artisan/rdv" element={<ArtisanRoute><ArtisanAppointments /></ArtisanRoute>} />
        <Route path="/artisan/portfolio" element={<ArtisanRoute><ArtisanPortfolio /></ArtisanRoute>} />
        <Route path="/artisan/certifications" element={<ArtisanRoute><ArtisanCertifications /></ArtisanRoute>} />
        <Route path="/artisan/paiements" element={<ArtisanRoute withNavigation><ArtisanPaiements /></ArtisanRoute>} />
        <Route path="/artisan/devis" element={<ArtisanRoute withNavigation><ArtisanQuotesPage /></ArtisanRoute>} />
        <Route path="/artisan/profil" element={<ArtisanRoute><ArtisanProfilePage /></ArtisanRoute>} />
        <Route path="/artisan/profil/edit" element={<ArtisanRoute><ArtisanProfileEditPage /></ArtisanRoute>} />
        <Route path="/artisan/mes-conversations" element={<ArtisanRoute withNavigation><ListeConversationsArtisanPage /></ArtisanRoute>} />
        <Route path="/artisan/messagerie/:username" element={<ArtisanRoute withNavigation><ChatPage /></ArtisanRoute>} />

        {/* Erreurs contrôlées */}
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}
