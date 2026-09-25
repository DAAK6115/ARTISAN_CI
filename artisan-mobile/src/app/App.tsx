import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { MobileShell } from '../components/MobileShell';
import { NetworkBanner } from '../components/NetworkBanner';
import { PwaStatusToast } from '../components/PwaStatusToast';
import { PwaInstallPrompt } from '../components/PwaInstallPrompt';
import { RouteErrorBoundary } from '../components/RouteErrorBoundary';
import { useAuthStore } from '../features/auth/auth.store';
import { RealtimeProvider } from '../features/chat/RealtimeProvider';
import { AdminRedirectPage } from '../pages/AdminRedirectPage';
import { ArtisanHomePage } from '../pages/ArtisanHomePage';
import { ArtisanAgendaPage } from '../pages/ArtisanAgendaPage';
import { ArtisanServicesPage } from '../pages/ArtisanServicesPage';
import { ArtisanClientsPage } from '../pages/ArtisanClientsPage';
import { ArtisanPublicProfilePage } from '../pages/ArtisanPublicProfilePage';
import { ArtisanProfilePage } from '../pages/ArtisanProfilePage';
import { ArtisanPortfolioPage } from '../pages/ArtisanPortfolioPage';
import { ArtisanQuotesPage } from '../pages/ArtisanQuotesPage';
import { ArtisanPaymentsPage } from '../pages/ArtisanPaymentsPage';
import { ArtisanMessagesPage } from '../pages/ArtisanMessagesPage';
import { ArtisanCertificationsPage } from '../pages/ArtisanCertificationsPage';
import { BookingPage } from '../pages/BookingPage';
import { ClientAppointmentsPage } from '../pages/ClientAppointmentsPage';
import { ClientFavoritesPage } from '../pages/ClientFavoritesPage';
import { ClientNearbyArtisansPage } from '../pages/ClientNearbyArtisansPage';
import { ClientPaymentsPage } from '../pages/ClientPaymentsPage';
import { ClientQuotesPage } from '../pages/ClientQuotesPage';
import { ClientReviewsPage } from '../pages/ClientReviewsPage';
import { ClientHomePage } from '../pages/ClientHomePage';
import { ClientMessagesPage } from '../pages/ClientMessagesPage';
import { ChatConversationPage } from '../pages/ChatConversationPage';
import { ClientProfilePage } from '../pages/ClientProfilePage';
import { ClientSearchPage } from '../pages/ClientSearchPage';
import { LoginPage } from '../pages/LoginPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ServiceDetailPage } from '../pages/ServiceDetailPage';
import { SplashPage } from '../pages/SplashPage';
import { SupportPage } from '../pages/SupportPage';
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
  return <RealtimeProvider><MobileShell><Outlet /></MobileShell></RealtimeProvider>;
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
      <PwaStatusToast />
      <PwaInstallPrompt />
      <RouteErrorBoundary>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/inscription" element={<RegisterPage />} />
        <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />

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
            <Route path="/client/artisans" element={<ClientNearbyArtisansPage />} />
            <Route path="/client/favoris" element={<ClientFavoritesPage />} />
            <Route path="/client/devis" element={<ClientQuotesPage />} />
            <Route path="/client/paiements" element={<ClientPaymentsPage />} />
            <Route path="/client/avis" element={<ClientReviewsPage />} />
            <Route path="/client/notifications" element={<NotificationsPage />} />
            <Route path="/client/support" element={<SupportPage />} />

            <Route path="/client/activites" element={<Navigate to="/client/rendez-vous" replace />} />
          </Route>
        </Route>

        <Route element={<RoleGate allowed={['artisan']} />}>
          <Route element={<AuthenticatedShell />}>
            <Route path="/artisan" element={<ArtisanHomePage />} />
            <Route path="/artisan/agenda" element={<ArtisanAgendaPage />} />
            <Route path="/artisan/prestations" element={<ArtisanServicesPage />} />
            <Route path="/artisan/clients" element={<ArtisanClientsPage />} />
            <Route path="/artisan/profil" element={<ArtisanProfilePage />} />
            <Route path="/artisan/devis" element={<ArtisanQuotesPage />} />
            <Route path="/artisan/reglements" element={<ArtisanPaymentsPage />} />
            <Route path="/artisan/portfolio" element={<ArtisanPortfolioPage />} />
            <Route path="/artisan/certifications" element={<ArtisanCertificationsPage />} />
            <Route path="/artisan/messages" element={<ArtisanMessagesPage />} />
            <Route path="/artisan/messages/:contactId" element={<ChatConversationPage />} />
            <Route path="/artisan/notifications" element={<NotificationsPage />} />
            <Route path="/artisan/support" element={<SupportPage />} />
          </Route>
        </Route>

        <Route element={<RoleGate allowed={['admin']} />}>
          <Route path="/admin" element={<AdminRedirectPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </RouteErrorBoundary>
    </>
  );
}
