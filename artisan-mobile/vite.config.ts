import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'branding/logo-artisan-ci.png'],
      manifest: {
        name: 'ARTISAN_CI',
        short_name: 'ARTISAN_CI',
        description: 'Trouvez et réservez des artisans de confiance en Côte d’Ivoire.',
        lang: 'fr-CI',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#FAF9F6',
        theme_color: '#0B6B50',
        categories: ['business', 'lifestyle', 'utilities'],
        icons: [
          {
            src: '/branding/logo-artisan-ci.png',
            sizes: '1254x1254',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'artisan-ci-images-v2',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 7
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  server: {
    host: true,
    port: 5173
  },
  preview: {
    host: true,
    port: 4173
  }
});
