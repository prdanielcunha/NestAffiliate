import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { App } from './App';
import { PublicLegalPage } from './features/PublicLegalPage';
import { PublicAboutPage } from './features/PublicHomePage';
import { MercadoLivreOAuthCallback } from './features/MercadoLivreOAuthCallback';
import { PinterestOAuthCallback } from './features/PinterestOAuthCallback';
import './styles.css';
import './premium-experience.css';

const publicLegalRoutes = {
  '/privacy': 'privacy',
  '/terms': 'terms',
  '/data-deletion': 'data-deletion',
} as const;

const legalKind=publicLegalRoutes[window.location.pathname as keyof typeof publicLegalRoutes];
const isMeliCallback=window.location.pathname==='/integrations/meli/callback';
const isPublicAbout=window.location.pathname==='/about';
const isPinterestCallback=window.location.pathname==='/integrations/pinterest/callback';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {legalKind ? (
        <PublicLegalPage kind={legalKind} />
      ) : isMeliCallback ? (
        <MercadoLivreOAuthCallback />
      ) : isPinterestCallback ? (
        <AuthProvider><PinterestOAuthCallback /></AuthProvider>
      ) : isPublicAbout ? (
        <PublicAboutPage />
      ) : (
        <AuthProvider>
          <App />
        </AuthProvider>
      )}
    </BrowserRouter>
  </React.StrictMode>,
);


if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
