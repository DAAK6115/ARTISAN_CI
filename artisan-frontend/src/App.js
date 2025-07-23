import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// Components
import PrivateRoute from './components/PrivateRoute';

// Auth
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import ForgotPassword from './features/auth/ForgotPassword';
import Dashboard from './features/auth/Dashboard';
import PublicProfile from './pages/ArtisanPublicProfilePage';

// Artisan
import ArtisanNavbar from './components/ArtisanNavbar';
import ArtisanDashboard from './pages/artisan/ArtisanDashboard';
import ArtisanServices from './pages/artisan/ArtisanServices';
import ArtisanAppointments from './pages/artisan/ArtisanAppointments';
import ArtisanPortfolio from './pages/artisan/ArtisanPortfolio';
import ArtisanCertifications from './pages/artisan/ArtisanCertifications';
import ArtisanPaiements from './pages/artisan/ArtisanPaiements';
import ArtisanProfilePage from './pages/artisan/ArtisanProfilePage';
import ArtisanProfileEditPage from './pages/artisan/ArtisanProfileEditPage';
import ListeConversationsArtisanPage from './pages/artisan/ListeConversationsArtisanPage';
import ArtisanChatPage from './pages/artisan/ArtisanChatPage';

// Client
import ClientNavbar from './components/ClientNavbar';
import ClientDashboard from './pages/client/ClientDashboard';
import ArtisansList from './pages/client/ArtisansList';
import ServicesList from './pages/client/ServicesList';
import ServiceDetail from './pages/client/ServiceDetail';
import FavorisPage from './pages/client/FavorisPage';
import MesRendezVous from './pages/client/MesRendezVous';
import PaiementsPage from './pages/client/PaiementsPage';
import ClientNotificationsPage from './pages/client/ClientNotificationsPage';
import DonnerAvisPage from './pages/client/DonnerAvisPage';
import ClientProfilePage from './pages/client/ClientProfilePage';
import ClientProfileEditPage from './pages/client/ClientProfileEditPage';
import NoterArtisanPage from './pages/client/NoterArtisanPage';
// Profil public
import ArtisanPublicProfilePage from './pages/ArtisanPublicProfilePage';
//Chat
import ChatPage from './pages/chat/ChatPage';
import ListeConversationsPage from './pages/chat/ListeConversationsPage';

// Layout Artisan
function ArtisanLayout({ children }) {
  return (
    <>
      <ArtisanNavbar />
      <div className="pt-20 px-6">{children}</div>
    </>
  );
}

// Layout Client
function ClientLayout({ children }) {
  return (
    <div className="flex">
      <ClientNavbar />
      <div className="flex-1 bg-gray-50 p-6">{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Components */}
        <Route path="/client/dashboard" element={<PrivateRoute><ClientLayout><ClientDashboard /></ClientLayout></PrivateRoute>} />
        <Route path="/artisan/dashboard" element={<PrivateRoute><ArtisanLayout><ArtisanDashboard /></ArtisanLayout></PrivateRoute>} />

        {/* Auth */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgotpassword" element={<ForgotPassword />} />

        {/* Dashboards généraux */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/:username" element={<Dashboard />} />

        {/* Profil public */}
        <Route path="/artisans/:username" element={<ClientLayout><ArtisanPublicProfilePage /></ClientLayout>} />

        {/* Artisan Pages */}
        <Route path="/artisan/dashboard" element={<ArtisanLayout><ArtisanDashboard /></ArtisanLayout>} />
        <Route path="/artisan/services" element={<ArtisanLayout><ArtisanServices /></ArtisanLayout>} />
        <Route path="/artisan/rdv" element={<ArtisanLayout><ArtisanAppointments /></ArtisanLayout>} />
        <Route path="/artisan/portfolio" element={<ArtisanLayout><ArtisanPortfolio /></ArtisanLayout>} />
        <Route path="/artisan/certifications" element={<ArtisanLayout><ArtisanCertifications /></ArtisanLayout>} />
        <Route path="/artisan/paiements" element={<ArtisanLayout><ArtisanPaiements /></ArtisanLayout>} />
        <Route path="/artisan/profil" element={<ArtisanLayout><ArtisanProfilePage /></ArtisanLayout>} />
        <Route path="/artisan/profil/edit" element={<ArtisanLayout><ArtisanProfileEditPage /></ArtisanLayout>} />
        <Route path="/artisan/messagerie/:username" element={<ArtisanLayout><ChatPage /></ArtisanLayout>} />
        <Route path="/artisan/mes-conversations" element={<ArtisanLayout><ListeConversationsArtisanPage /></ArtisanLayout>} />
        <Route path="/artisan/messagerie/:username" element={<ArtisanLayout><ArtisanChatPage /></ArtisanLayout>} />

        {/* Client Pages */}
        <Route path="/client/dashboard" element={<ClientLayout><ClientDashboard /></ClientLayout>} />
        <Route path="/client/artisans" element={<ClientLayout><ArtisansList /></ClientLayout>} />
        <Route path="/client/services" element={<ClientLayout><ServicesList /></ClientLayout>} />
        <Route path="/client/services/:id" element={<ClientLayout><ServiceDetail /></ClientLayout>} />
        <Route path="/client/favoris" element={<ClientLayout><FavorisPage /></ClientLayout>} />
        <Route path="/client/rdvs" element={<ClientLayout><MesRendezVous /></ClientLayout>} />
        <Route path="/client/paiements" element={<ClientLayout><PaiementsPage /></ClientLayout>} />
        <Route path="/client/notifications" element={<ClientLayout><ClientNotificationsPage /></ClientLayout>} />
        <Route path="/client/noter-artisan/:rdv_id" element={<ClientLayout><NoterArtisanPage /></ClientLayout>} />
        <Route path="/client/avis" element={<ClientLayout><DonnerAvisPage /></ClientLayout>} />
        <Route path="/client/profil" element={<ClientLayout><ClientProfilePage /></ClientLayout>} />
        <Route path="/client/profil/edit" element=
        {<ClientProfileEditPage />} />
        
        // Chat
        <Route path="/messagerie/:username" element={<ClientLayout><ChatPage /></ClientLayout>} />
        <Route path="/mes-conversations" element={<ClientLayout><ListeConversationsPage /></ClientLayout>} />
      </Routes>
    </Router>
  );
}
