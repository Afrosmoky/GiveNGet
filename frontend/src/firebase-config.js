// Konfiguracja webowa projektu Firebase givenget-b5ef0 (identyfikatory publiczne z definicji —
// nie są sekretem; sekretem jest klucz serwisowy backendu). Nazwa projektu zostaje „givenget”,
// bo zmiana projektu oznaczałaby nowe tokeny dla wszystkich urządzeń.
const firebaseConfig = {
  apiKey: "AIzaSyBWlkfy4_pjDQUDwKNZtzHW3q3lfvYArOY",
  authDomain: "givenget-b5ef0.firebaseapp.com",
  projectId: "givenget-b5ef0",
  storageBucket: "givenget-b5ef0.firebasestorage.app",
  messagingSenderId: "334767460846",
  appId: "1:334767460846:web:35c8bcf7872e5c1f257eff"
};

/**
 * Zwraca aplikację Firebase i Messaging (jedna instancja na kartę).
 * Dynamiczne importy — firebase/messaging jest tylko przeglądarkowy i statyczny import
 * na poziomie modułu wysadza SSR w Node.js.
 */
export async function loadFirebase() {
  if (typeof window === 'undefined') {
    return { app: null, messaging: null };
  }

  try {
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { getMessaging, isSupported } = await import('firebase/messaging');

    if (!(await isSupported())) {
      return { app: null, messaging: null };
    }

    // Wielokrotne wywołanie nie może inicjalizować aplikacji drugi raz („already exists”)
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    return { app, messaging: getMessaging(app) };
  } catch (error) {
    console.error('FCM: błąd inicjalizacji Firebase:', error);
    return { app: null, messaging: null };
  }
}
