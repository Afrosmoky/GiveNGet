/// <reference lib="webworker" />
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist } from "serwist";

/**
 * Service worker PWA Biovlo (Serwist).
 *
 * Zasada: cache'ujemy WYŁĄCZNIE statyki builda i ikony marki. Żadnych odpowiedzi z danymi —
 * API (oferty, rezerwacje, czat, profil), RSC, obrazy z backendu (zdjęcia profilowe) i strony
 * HTML zawsze idą do sieci. Offline pokazujemy powłokę „/~offline”.
 *
 * Celowo NIE używamy `defaultCache` z @serwist/next — zawiera regułę NetworkFirst dla
 * same-origin `/api/`, czyli trzymałby w cache odpowiedzi z danymi użytkownika.
 *
 * Push (FCM) obsługuje osobny public/firebase-messaging-sw.js na własnym scope — ten worker
 * nie ma handlera `push`, więc obie rejestracje nie wchodzą sobie w drogę.
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Lista plików do precache wstrzykiwana przy buildzie przez @serwist/next
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const ONE_YEAR = 365 * 24 * 60 * 60;

/** Żądania, które nigdy nie trafiają do cache — dane i rzeczy zależne od sesji. */
const isSensitive = (url: URL, request: Request): boolean =>
  url.pathname.startsWith("/api/") ||
  url.pathname.startsWith("/backend-assets/") ||
  url.pathname.startsWith("/_next/image") ||
  url.pathname.startsWith("/ws") ||
  request.headers.get("RSC") === "1" ||
  url.searchParams.has("_rsc");

const runtimeCaching: RuntimeCaching[] = [
  {
    // Najpierw wykluczenia — Serwist bierze pierwszą pasującą regułę
    matcher: ({ url, request }) => isSensitive(url, request),
    handler: new NetworkOnly(),
  },
  {
    // Statyki builda mają hash w nazwie — bezpiecznie trzymać długo (część i tak jest w precache)
    matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/_next/static/"),
    handler: new CacheFirst({
      cacheName: "next-static",
      plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: ONE_YEAR })],
    }),
  },
  {
    // Ikony i grafiki marki z public/ (nie zdjęcia użytkowników)
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && /^\/(brand\/|icon-|apple-touch-icon|favicon|images\/)/.test(url.pathname),
    handler: new CacheFirst({
      cacheName: "brand-assets",
      plugins: [new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 30 * 24 * 60 * 60 })],
    }),
  },
  {
    // Strony HTML zawsze z sieci; bez sieci — powłoka offline (fallbacks niżej)
    matcher: ({ request }) => request.mode === "navigate",
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
