import { environment } from './src/config/index';
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const isLocal = environment.environmentName === 'local';

const nextConfig: NextConfig = {
  output: 'standalone', // To pozostaje
  reactStrictMode: false, // Wyłączone — zapobiega podwójnemu odpalaniu useEffect (podwójny upload zdjęć, podwójna weryfikacja)

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },

  images: {
    unoptimized: isLocal,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost', 
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1', 
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost', 
        port: '',
        pathname: '/api/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost', 
        port: '',
        pathname: '/api/static/**',
      },
      {
        protocol: 'http',
        hostname: '194.164.17.166', 
        port: '',
        pathname: '/backend-assets/**',
      },
      {
        protocol: 'https', 
        hostname: '194.164.17.166',
        port: '',
        pathname: '/backend-assets/**',
      },
      {
        protocol: 'http',
        hostname: 'www.gngdev.pl',
        port: '',
        pathname: '/backend-assets/**',
      },
      {
        protocol: 'https',
        hostname: 'www.gngdev.pl',
        port: '',
        pathname: '/backend-assets/**',
      },
    ],
  },

  async rewrites() {
    return [
      {
        source: '/backend-assets/:path*', 
        destination: `http://backend:8080/uploads/:path*`, 
      },
      {
        source: '/api/:path*',
        destination: 'http://backend:8080/api/:path*',
      },
    ];
  },
};

/**
 * Service worker PWA (Serwist): offline-shell + cache statyków. Źródło: src/app/sw.ts,
 * wynik: public/sw.js (generowany przy `next build`, w .gitignore). W `next dev` wyłączony —
 * cache SW w trakcie pracy podaje stare pliki.
 *
 * Z public/ precache'ujemy tylko ikony i znak marki — reszta (dźwięki, duże grafiki, ads.txt)
 * nie jest potrzebna offline. Uwaga: @serwist/next bierze globPublicPatterns tylko wtedy, gdy
 * NIE ma additionalPrecacheEntries, więc pliki wymieniamy tu jawnie, razem ze stroną offline.
 * Push FCM obsługuje osobny public/firebase-messaging-sw.js.
 */
const PRECACHE_REVISION = `${Date.now()}`;
const PRECACHED_PUBLIC_FILES = [
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
  "/brand/biovlo-mark-96.png",
  "/brand/biovlo-logo-trim.png",
];

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  // Przeładowanie po powrocie sieci skasowałoby wpisane dane (formularz oferty, rezerwacja)
  reloadOnOnline: false,
  additionalPrecacheEntries: [
    // Strona offline z App Routera nie jest plikiem w public/
    { url: "/~offline", revision: PRECACHE_REVISION },
    ...PRECACHED_PUBLIC_FILES.map((url) => ({ url, revision: PRECACHE_REVISION })),
  ],
});

export default withSerwist(nextConfig);