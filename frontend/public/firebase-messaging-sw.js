// Service worker powiadomień push (FCM / Web Push).
//
// Rejestrowany przez src/utils/push.ts na WŁASNYM scope (/firebase-cloud-messaging-push-scope),
// a nie na „/” — tam działa service worker PWA (Serwist, /sw.js). Dwa workery na różnych
// scope'ach nie konkurują: subskrypcja push należy do tej rejestracji, więc zdarzenia „push”
// trafiają tylko tutaj, a fetch/cache obsługuje /sw.js.
//
// Bez SDK Firebase — FCM dostarcza zwykłe Web Push, a wiadomość z backendu ma blok
// notification + pola danych (url, type, reservationId). Każdy push musi pokazać
// powiadomienie (wymóg przeglądarek), więc pokazujemy zawsze.

const DEFAULT_URL = '/reservations';
const ICON = '/icon-192.png';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { notification: { title: 'Biovlo', body: event.data ? event.data.text() : '' } };
  }

  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || 'Biovlo';
  const tag = notification.tag || data.tag || (data.reservationId ? 'reservation-' + data.reservationId : undefined);

  event.waitUntil(
    self.registration.showNotification(title, {
      body: notification.body || data.body || '',
      icon: ICON,
      badge: ICON,
      tag,
      // Nowe powiadomienie o tej samej rezerwacji podmienia poprzednie, ale znów zwraca uwagę
      renotify: Boolean(tag),
      data: { url: data.url || data.click_action || DEFAULT_URL, type: data.type || null },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || DEFAULT_URL;
  const target = new URL(path, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // Otwarta karta aplikacji — przełącz ją na cel zamiast otwierać nową
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          return client.focus().then((focused) => (focused && 'navigate' in focused ? focused.navigate(target) : focused));
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
    })
  );
});
