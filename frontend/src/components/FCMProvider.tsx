"use client";

import { loadFirebase } from '../firebase-config';
import React, { useEffect } from 'react';
import { authorizedFetch } from '@/utils/auth';
import { environment } from '@/config/environment';

// Usunięto 'declare global' dla window.firebase - nie potrzebujemy globalnego obiektu

interface FirebaseError {
  code?: string;
  message?: string;
}

function getJwtToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
}

async function updateFcmToken(token: string) {
  const jwt = getJwtToken();
  if (!jwt) return;
  
  // Pobierz nazwę urządzenia
  const deviceName = typeof window !== 'undefined' ? 
    window.navigator.userAgent || 'Unknown Device' : 
    'Unknown Device';
  
  // Pobierz stary token z localStorage
  const oldFcmToken = typeof window !== 'undefined' ? 
    localStorage.getItem('fcmToken') : 
    null;
  
  console.log('FCM: updateFcmToken', token, jwt, deviceName, oldFcmToken);
  const response = await authorizedFetch(`${environment.apiUrl}/api/chats/fcm-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`
    },
    body: JSON.stringify({ 
      fcmToken: token,
      oldFcmToken: oldFcmToken,
      deviceName: deviceName
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to update FCM token');
  }
  
  // Zapisz nowy token w localStorage
  if (typeof window !== 'undefined') {
    console.log('FCM: Zapisuję nowy token w localStorage', token);
    localStorage.setItem('fcmToken', token);
  }
}

async function initializeNotifications() {
  console.log('FCM: initializeNotifications start');
  if (typeof window === 'undefined') return;

  // loadFirebase powinno teraz zwracać obiekt z instancją aplikacji i messaging
  const { app, messaging } = await loadFirebase(); 
  
  if (!app || !messaging) { 
    console.log('FCM: Firebase app or messaging not available');
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Używamy modularnego API Firebase
      const { getToken } = await import('firebase/messaging');
      try {
        const token: string = await getToken(messaging, { vapidKey: 'BPaLGRwSqM-_4RZcpGBFw5Izs5l7Z_9TX1kh-MErOEjKKb_vpEDToBSteL7e6rjvIpz8MFHaA2eC621bunCbaPM' });
        await updateFcmToken(token);
        console.log('FCM Token:', token);
      } catch (tokenError: unknown) {
        // Sprawdź czy to błąd PERMISSION_DENIED z localhost (częsty w środowisku deweloperskim)
        const error = tokenError as FirebaseError;
        if (error?.code === 'installations/request-failed' || 
            error?.message?.includes('PERMISSION_DENIED') ||
            error?.message?.includes('localhost')) {
          console.log('FCM: Firebase blokuje żądania z localhost. To normalne w środowisku deweloperskim.');
          console.log('FCM: Powiadomienia będą działać w środowisku produkcyjnym.');
        } else {
          console.error('FCM: Błąd pobierania tokenu:', tokenError);
        }
      }
    } else {
      console.log('Brak zgody na powiadomienia');
    }
  } catch (error: unknown) {
    // Sprawdź czy to błąd PERMISSION_DENIED z localhost
    const firebaseError = error as FirebaseError;
    if (firebaseError?.code === 'installations/request-failed' || 
        firebaseError?.message?.includes('PERMISSION_DENIED') ||
        firebaseError?.message?.includes('localhost')) {
      console.log('FCM: Firebase blokuje żądania z localhost. To normalne w środowisku deweloperskim.');
      console.log('FCM: Powiadomienia będą działać w środowisku produkcyjnym.');
    } else {
      console.error('Błąd inicjalizacji powiadomień:', error);
    }
  }
}

// Typ dla payload z FCM (Firebase Cloud Messaging)
export interface FcmMessagePayload {
  data?: {
    title?: string;
    body?: string;
    click_action?: string;
  };
  notification?: {
    title?: string;
    body?: string;
  };
  from?: string;
  collapseKey?: string;
  messageId?: string;
  messageType?: string;
}

export default function FCMProvider({ children }: { children: React.ReactNode }) {
  console.log('FCM: FCMProvider startuje!');
  
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('FCM: Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('FCM: Service Worker registration failed:', error);
        });
    } else {
      console.log('FCM: Service Worker not supported');
    }

    initializeNotifications();

    loadFirebase().then(async ({ app, messaging }) => { // Pobieramy messaging bezpośrednio
      if (app && messaging) { 
        // Używamy modularnego API Firebase
        const { onMessage } = await import('firebase/messaging');
        onMessage(messaging, (payload: FcmMessagePayload) => {
          // Pokazuj powiadomienie tylko, gdy aplikacja NIE jest aktywna
          if (document.visibilityState === 'visible') {
            console.log('FCM: Aplikacja aktywna – nie pokazuję powiadomienia');
            // Możesz tu zaktualizować UI, np. dodać wiadomość do czatu
          } else {
            const notificationTitle = payload.data?.title || payload.notification?.title || 'Nowa wiadomość';
            const notificationOptions = {
              body: payload.data?.body || payload.notification?.body || '',
              icon: '/icon.png',
              data: {
                url: payload.data?.click_action || '/chats'
              }
            };
            new Notification(notificationTitle, notificationOptions);
          }
        });
      } else {
        console.log('FCM: Firebase app or messaging not available in onMessage callback');
      }
    });
  }, []); 
  
  return <>{children}</>;
}