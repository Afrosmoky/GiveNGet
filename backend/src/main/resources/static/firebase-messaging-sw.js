// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js');

// Konfiguracja Firebase dla projektu gngdev-6fa84
const firebaseConfig = {
    apiKey: "AIzaSyBtkl3lteGgpCnLyo3dOqkpiSTeYKTNp0o",
    authDomain: "gngdev-6fa84.firebaseapp.com",
    projectId: "gngdev-6fa84",
    storageBucket: "gngdev-6fa84.firebasestorage.app",
    messagingSenderId: "359944892362",
    appId: "1:359944892362:web:b5db7116a29e49fede2933",
    measurementId: "G-5VM9FVL7Q8"
  };

const messaging = firebase.messaging();

// Obsługa powiadomień w tle
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);
    
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon.png',
        badge: '/badge.png',
        tag: 'chat-notification',
        data: payload.data,
        actions: [
            {
                action: 'open',
                title: 'Otwórz'
            },
            {
                action: 'close',
                title: 'Zamknij'
            }
        ]
    };
    
    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Obsługa kliknięcia w powiadomienie
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        // Otwórz aplikację lub konkretny czat
        const urlToOpen = event.notification.data?.click_action || '/';
        
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    // Sprawdź czy aplikacja jest już otwarta
                    for (const client of clientList) {
                        if (client.url.includes(urlToOpen) && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    
                    // Otwórz nowe okno jeśli aplikacja nie jest otwarta
                    if (clients.openWindow) {
                        return clients.openWindow(urlToOpen);
                    }
                })
        );
    }
}); 