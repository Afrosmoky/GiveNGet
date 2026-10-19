import type { MetadataRoute } from 'next';

/** Manifest aplikacji — podstawa pod PWA (ikony z public/, kolory z tokenów marki). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Biovlo',
    short_name: 'Biovlo',
    description: 'Żywność z krótkim terminem: oddaj, wymień, odbierz taniej w sklepie obok.',
    lang: 'pl',
    start_url: '/',
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
