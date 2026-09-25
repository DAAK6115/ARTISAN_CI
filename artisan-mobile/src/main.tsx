import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './app/App';
import { AppProviders } from './app/providers';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import './styles/globals.css';

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;
updateSW = registerSW({
  immediate: true,
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent('artisan:pwa-offline-ready'));
  },
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('artisan:pwa-update', { detail: { updateSW } }));
  },
  onRegisterError(error) {
    if (import.meta.env.DEV) console.error('Service worker ARTISAN_CI', error);
  }
});

const root = document.getElementById('root');
if (!root) throw new Error('Élément racine introuvable.');

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <AppProviders>
          <App />
        </AppProviders>
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>
);
