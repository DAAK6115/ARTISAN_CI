import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { MobileShell } from '../components/MobileShell';
import { NetworkBanner } from '../components/NetworkBanner';
import { useAuthStore } from '../features/auth/auth.store';
import { AdminRedirectPage } from '../pages/AdminRedirectPage';
import { ArtisanHomePage } from '../pages/ArtisanHomePage';
import { ArtisanAgendaPage } from '../pages/ArtisanAgendaPage';
import { ArtisanServicesPage } from '../pages/ArtisanServicesPage';
import { ArtisanClientsPage } from '../pages/ArtisanClientsPage';
import { ArtisanPublicProfilePage } from '../pages/ArtisanPublicProfilePage';
import { BookingPage } from '../pages/BookingPage';
import { ClientAppointmentsPage } from '../pages/ClientAppointmentsPage';
import { ClientHomePage } from '../pages/ClientHomePage';
import { ClientMessagesPage } from '../pages/ClientMessagesPage';
import { ChatConversationPage } from '../pages/ChatConversationPage';
import { ClientProfilePage } from '../pages/ClientProfilePage';
import { ClientSearchPage } from '../pages/ClientSearchPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { ServiceDetailPage } from '../pages/ServiceDetailPage';
import { SplashPage } from '../pages/SplashPage';
import type { UserRole } from '../types/auth';

function RoleGate({ allowed }: { allowed: UserRole[] }) {
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.user?.role);

  if (status === 'booting') return <SplashPage />;
  if (status !== 'authenticated' || !role) return <Navigate to="/connexion" replace />;
  if (!allowed.includes(role)) {
    return <Navigate to={role === 'artisan' ? '/artisan' : role === 'client' ? '/client' : '/admin'} replace />;
  }
  return <Outlet />;
}

function AuthenticatedShell() {
  return <MobileShell><Outlet /></MobileShell>;
}

function RootRedirect() {
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.user?.role);
  if (status === 'booting') return <SplashPage />;
  if (status !== 'authenticated' || !role) return <Navigate to="/connexion" replace />;
  return <Navigate to={role === 'artisan' ? '/artisan' : role === 'client' ? '/client' : '/admin'} replace />;
}

export default function App() {
  return (
    <>
      <NetworkBanner />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/inscription" element={<RegisterPage />} />

        <Route element={<RoleGate allowed={['client']} />}>
          <Route element={<AuthenticatedShell />}>
            <Route path="/client" element={<ClientHomePage />} />
            <Route path="/client/recherche" element={<ClientSearchPage />} />
            <Route path="/client/prestations/:id" element={<ServiceDetailPage />} />
            <Route path="/client/prestations/:id/reserver" element={<BookingPage />} />
            <Route path="/client/artisans/:username" element={<ArtisanPublicProfilePage />} />
            <Route path="/client/rendez-vous" element={<ClientAppointmentsPage />} />

            <Route path="/client/messages" element={<ClientMessagesPage />} />
            <Route path="/client/messages/:contactId" element={<ChatConversationPage />} />
            <Route path="/client/profil" element={<ClientProfilePage />} />
            <Route path="/client/artisans" element={<Navigate to="/client/recherche" replace />} />
            <Route path="/client/favoris" element={<PlaceholderPage title="Favoris" />} />
            <Route path="/client/devis" element={<PlaceholderPage title="Mes devis" />} />
            <Route path="/client/paiements" element={<PlaceholderPage title="Paiements" />} />
            <Route path="/client/avis" element={<PlaceholderPage title="Mes avis" />} />
            <Route path="/client/notifications" element={<PlaceholderPage title="Notifications" />} />
            <Route path="/client/support" element={<PlaceholderPage title="Support" />} />

            <Route path="/client/activites" element={<Navigate to="/client/rendez-vous" replace />} />
          </Route>
        </Route>

        <Route element={<RoleGate allowed={['artisan']} />}>
          <Route element={<AuthenticatedShell />}>
            <Route path="/artisan" element={<ArtisanHomePage />} />
            <Route path="/artisan/agenda" element={<ArtisanAgendaPage />} />
            <Route path="/artisan/prestations" element={<ArtisanServicesPage />} />
            <Route path="/artisan/clients" element={<ArtisanClientsPage />} />
            <Route path="/artisan/profil" element={<PlaceholderPage title="Profil professionnel" />} />
            <Route path="/artisan/devis" element={<PlaceholderPage title="Devis" />} />
            <Route path="/artisan/reglements" element={<PlaceholderPage title="Règlements" />} />
            <Route path="/artisan/portfolio" element={<PlaceholderPage title="Portfolio" />} />
            <Route path="/artisan/certifications" element={<PlaceholderPage title="Certifications" />} />
            <Route path="/artisan/messages" element={<PlaceholderPage title="Messages" />} />
            <Route path="/artisan/notifications" element={<PlaceholderPage title="Notifications" />} />
            <Route path="/artisan/support" element={<PlaceholderPage title="Support" />} />
          </Route>
        </Route>

        <Route element={<RoleGate allowed={['admin']} />}>
          <Route path="/admin" element={<AdminRedirectPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
