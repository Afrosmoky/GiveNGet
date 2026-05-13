// Service Worker dla Firebase Cloud Messaging
// Ten plik będzie przetwarzany przez bundler

self.addEventListener('install', function(event) {
  console.log('FCM Service Worker: Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('FCM Service Worker: Activating...');
  event.waitUntil(self.clients.claim());
});

// Obsługa powiadomień w tle
self.addEventListener('push', function(event) {
  console.log('FCM Service Worker: Push event received', event);
  
  if (event.data) {
    const payload = event.data.json();
    console.log('FCM Service Worker: Payload received', payload);
    
    const notificationTitle = payload.data?.title || payload.notification?.title || 'Nowa wiadomość';
    const notificationOptions = {
      body: payload.data?.body || payload.notification?.body || '',
      icon: '/icon.png',
      data: {
        url: payload.data?.click_action || '/chats'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  }
});

// Obsługa kliknięcia w powiadomienie
self.addEventListener('notificationclick', function(event) {
  console.log('FCM Service Worker: Notification clicked', event);
  
  event.notification.close();
  let url = '/chats';
  
  if (event.notification.data && event.notification.data.url) {
    url = event.notification.data.url;
  }
  
  if (!url.startsWith('http')) {
    url = self.location.origin + url;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});