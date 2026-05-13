# Firebase Cloud Messaging - Przewodnik Integracji

## Backend - Gotowe endpointy

### 1. Aktualizacja FCM Token
```http
POST /api/chatEntities/fcm-token
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "fcmToken": "fcm_token_from_browser"
}
```

### 2. Automatyczne powiadomienia
Backend automatycznie wysyła powiadomienia FCM gdy:
- Użytkownik otrzymuje nową wiadomość
- Użytkownik nie jest nadawcą wiadomości
- Użytkownik ma zapisany FCM token

## Frontend - Konfiguracja

### 1. Dodaj Firebase SDK
```html
<script src="https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js"></script>
```

### 2. Inicjalizacja Firebase
```javascript
// firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyBtkl3lteGgpCnLyo3dOqkpiSTeYKTNp0o",
    authDomain: "gngdev-6fa84.firebaseapp.com",
    projectId: "gngdev-6fa84",
    storageBucket: "gngdev-6fa84.firebasestorage.app",
    messagingSenderId: "359944892362",
    appId: "1:359944892362:web:b5db7116a29e49fede2933",
    measurementId: "G-5VM9FVL7Q8"
};

firebase.initializeApp(firebaseConfig);
```

### 3. Zarejestruj Service Worker
```javascript
// app.js
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
            console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
            console.error('Service Worker registration failed:', error);
        });
}
```

### 4. Poproś o zgodę i pobierz token
```javascript
async function initializeNotifications() {
    try {
        // Poproś o zgodę na powiadomienia
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            // Pobierz FCM token
            const messaging = firebase.messaging();
            const token = await messaging.getToken();
            
            // Wyślij token do backendu
            await updateFcmToken(token);
            
            console.log('FCM Token:', token);
        } else {
            console.log('Brak zgody na powiadomienia');
        }
    } catch (error) {
        console.error('Błąd inicjalizacji powiadomień:', error);
    }
}

async function updateFcmToken(token) {
    const response = await fetch('/api/chatEntities/fcm-token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getJwtToken()}`
        },
        body: JSON.stringify({ fcmToken: token })
    });
    
    if (!response.ok) {
        throw new Error('Failed to update FCM token');
    }
}
```

### 5. Obsługa powiadomień w tle
Service Worker (`firebase-messaging-sw.js`) już obsługuje powiadomienia w tle.

### 6. Obsługa powiadomień gdy aplikacja jest otwarta
```javascript
// app.js
const messaging = firebase.messaging();

messaging.onMessage((payload) => {
    console.log('Message received:', payload);
    
    // Pokaż powiadomienie gdy aplikacja jest otwarta
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: '/icon.png',
            data: payload.data
        });
    }
    
    // Możesz też zaktualizować UI
    updateChatMessages(payload.data.chatId);
});
```

## Konfiguracja Firebase Console

1. **Utwórz projekt** w [Firebase Console](https://console.firebase.google.com/)
2. **Dodaj aplikację web** do projektu
3. **Pobierz konfigurację** (apiKey, authDomain, etc.)
4. **Wygeneruj klucz prywatny** (serviceAccountKey.json)
5. **Umieść serviceAccountKey.json** w `src/main/resources/`

## Testowanie

1. **Uruchom aplikację** z poprawną konfiguracją Firebase
2. **Zaloguj się** i wyraź zgodę na powiadomienia
3. **Wyślij wiadomość** do innego użytkownika
4. **Sprawdź** czy odbiorca otrzymuje powiadomienie

## Uwagi

- **HTTPS wymagane** - FCM działa tylko przez HTTPS
- **Zgoda użytkownika** - powiadomienia wymagają zgody
- **Service Worker** - musi być zarejestrowany
- **Token aktualizacja** - token może się zmieniać, aktualizuj go 