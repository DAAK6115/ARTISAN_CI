import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './app/App';
import { AppProviders } from './app/providers';
import './styles/globals.css';

registerSW({ immediate: true });

const root = document.getElementById('root');
if (!root) throw new Error('Élément racine introuvable.');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>
);
