import type { MetadataRoute } from 'next';

/**
 * Manifest PWA (ikony z public/, kolory z tokenów marki). Razem z service workerem
 * (src/app/sw.ts, Serwist) daje instalowalną aplikację.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Biovlo',
    short_name: 'Biovlo',
    description: 'Żywność z krótkim terminem: oddaj, wymień, odbierz taniej w sklepie obok.',
    lang: 'pl',
    // Stały identyfikator instalacji — zmiana start_url nie utworzy „drugiej” aplikacji
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#0C6B4C',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
