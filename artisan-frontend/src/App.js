import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';

import PrivateRoute from './components/PrivateRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import ClientNavbar from './components/ClientNavbar';
import ArtisanNavbar from './components/ArtisanNavbar';

import HomePage from './pages/HomePage';
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
import ArtisanClientsPage from './pages/artisan/ArtisanClientsPage';
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
    <div className="min-h-screen bg-[#FAF9F6] md:flex">
      <ClientNavbar />
      <main className="min-w-0 flex-1 px-4 py-4 pb-28 sm:px-5 md:px-6 md:py-6 md:pb-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

function ArtisanNavigationShell({ children }) {
  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <ArtisanNavbar />
      <main>{children}</main>
    </div>
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
      {withNavigation ? <ArtisanNavigationShell>{children}</ArtisanNavigationShell> : children}
    </PrivateRoute>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Marketplace publique */}
        <Route path="/" element={<HomePage />} />
        <Route path="/prestations" element={<ServicesList publicMode />} />
        <Route path="/prestations/:id" element={<ServiceDetail publicMode />} />
        <Route path="/artisans/:username" element={<ArtisanPublicProfilePage />} />

        {/* Authentification */}
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
        <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
        <Route path="/forgotpassword" element={<Navigate to="/forgot-password" replace />} />

        <Route path="/dashboard" element={<PrivateRoute><RoleHomeRedirect /></PrivateRoute>} />
        <Route path="/dashboard/:username" element={<PrivateRoute><RoleHomeRedirect /></PrivateRoute>} />

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

        {/* Compatibilité anciens liens */}
        <Route path="/mes-conversations" element={<ClientRoute><ListeConversationsPage /></ClientRoute>} />
        <Route path="/messagerie/:username" element={<ClientRoute><ChatPage /></ClientRoute>} />

        {/* Espace artisan */}
        <Route path="/artisan/dashboard" element={<ArtisanRoute withNavigation><ArtisanDashboard /></ArtisanRoute>} />
        <Route path="/artisan/services" element={<ArtisanRoute withNavigation><ArtisanServices /></ArtisanRoute>} />
        <Route path="/artisan/rdv" element={<ArtisanRoute withNavigation><ArtisanAppointments /></ArtisanRoute>} />
        <Route path="/artisan/portfolio" element={<ArtisanRoute withNavigation><ArtisanPortfolio /></ArtisanRoute>} />
        <Route path="/artisan/certifications" element={<ArtisanRoute withNavigation><ArtisanCertifications /></ArtisanRoute>} />
        <Route path="/artisan/clients" element={<ArtisanRoute withNavigation><ArtisanClientsPage /></ArtisanRoute>} />
        <Route path="/artisan/paiements" element={<ArtisanRoute withNavigation><ArtisanPaiements /></ArtisanRoute>} />
        <Route path="/artisan/devis" element={<ArtisanRoute withNavigation><ArtisanQuotesPage /></ArtisanRoute>} />
        <Route path="/artisan/profil" element={<ArtisanRoute withNavigation><ArtisanProfilePage /></ArtisanRoute>} />
        <Route path="/artisan/profil/edit" element={<ArtisanRoute withNavigation><ArtisanProfileEditPage /></ArtisanRoute>} />
        <Route path="/artisan/mes-conversations" element={<ArtisanRoute withNavigation><ListeConversationsArtisanPage /></ArtisanRoute>} />
        <Route path="/artisan/messagerie/:username" element={<ArtisanRoute withNavigation><ChatPage /></ArtisanRoute>} />

        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}
