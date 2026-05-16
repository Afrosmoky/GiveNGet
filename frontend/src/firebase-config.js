// const firebaseConfig = {
//   apiKey: "AIzaSyBtkl3lteGgpCnLyo3dOqkpiSTeYKTNp0o",
//   authDomain: "gngdev-6fa84.firebaseapp.com",
//   projectId: "gngdev-6fa84",
//   storageBucket: "gngdev-6fa84.firebasestorage.app",
//   messagingSenderId: "359944892362",
//   appId: "1:359944892362:web:b5db7116a29e49fede2933",
//   measurementId: "G-5VM9FVL7Q8"
// };
const firebaseConfig = {
  apiKey: "AIzaSyBWlkfy4_pjDQUDwKNZtzHW3q3lfvYArOY",
  authDomain: "givenget-b5ef0.firebaseapp.com",
  projectId: "givenget-b5ef0",
  storageBucket: "givenget-b5ef0.firebasestorage.app",
  messagingSenderId: "334767460846",
  appId: "1:334767460846:web:35c8bcf7872e5c1f257eff"
};

export async function loadFirebase() {
  if (typeof window === 'undefined') {
    console.log('FCM: window is undefined, nie ładuję Firebase');
    return { app: null, messaging: null };
  }

  try {
    // Dynamiczne importy — firebase/messaging jest browser-only i nie może być
    // ładowany statycznie na poziomie modułu (crashuje SSR w Node.js)
    const { initializeApp } = await import('firebase/app');
    const { getMessaging } = await import('firebase/messaging');

    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    console.log('FCM: Firebase zainicjalizowany z pakietów npm', { app, messaging });
    return { app, messaging };
  } catch (error) {
    console.error('FCM: Błąd inicjalizacji Firebase:', error);
    return { app: null, messaging: null };
  }
} 