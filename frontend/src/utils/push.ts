"use client";

import { environment } from '../config';
import { loadFirebase } from '../firebase-config';
import { authorizedFetch, isAuthenticated } from './auth';

/**
 * Powiadomienia push w przeglądarce (FCM Web Push).
 *
 * Przepływ: zgoda użytkownika (tylko po kliknięciu — nigdy automatycznie przy starcie) →
 * rejestracja /firebase-messaging-sw.js na WŁASNYM scope → token FCM → POST /api/v1/push/tokens.
 * Backend wiąże token z kontem z JWT, więc zmiana użytkownika na tym samym urządzeniu przepina go.
 *
 * Scope osobny od „/”, bo tam działa service worker PWA (Serwist, /sw.js) — jedna rejestracja
 * na scope, więc wspólny scope oznaczałby, że jeden worker wypiera drugi.
 */

const PUSH_SW_URL = '/firebase-messaging-sw.js';
const PUSH_SW_SCOPE = '/firebase-cloud-messaging-push-scope';
/** Klucz publiczny Web Push projektu Firebase (publiczny z definicji — można go nadpisać ENV). */
const VAPID_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
  'BPaLGRwSqM-_4RZcpGBFw5Izs5l7Z_9TX1kh-MErOEjKKb_vpEDToBSteL7e6rjvIpz8MFHaA2eC621bunCbaPM';
/** Ostatni token tego urządzenia — backend podmienia nim wpis przy rotacji tokenu. */
export const FCM_TOKEN_KEY = 'fcmToken';
/** Dla którego konta token był już odświeżony w tej sesji przeglądarki. */
const SYNC_MARKER_KEY = 'fcmSyncedForUser';

export type PushPermission = 'unsupported' | 'default' | 'granted' | 'denied';

export type EnablePushResult =
  | { ok: true; deliveryEnabled: boolean }
  | { ok: false; reason: 'unsupported' | 'denied' | 'dismissed' | 'error'; message: string };

/**
 * Stan uprawnień w tej przeglądarce. „unsupported” także bez bezpiecznego kontekstu (HTTP poza
 * localhostem) i na iOS poza aplikacją dodaną do ekranu początkowego.
 */
export function getPushPermission(): PushPermission {
  if (typeof window === 'undefined') return 'unsupported';
  if (!window.isSecureContext || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }
  return Notification.permission as PushPermission;
}

/** Prosi o zgodę i rejestruje urządzenie. Wywoływać wyłącznie z obsługi kliknięcia. */
export async function enablePush(): Promise<EnablePushResult> {
  const state = getPushPermission();
  if (state === 'unsupported') {
    return { ok: false, reason: 'unsupported', message: 'Ta przeglądarka nie obsługuje powiadomień push.' };
  }
  if (state === 'denied') {
    return {
      ok: false,
      reason: 'denied',
      message: 'Powiadomienia są zablokowane. Włącz je w ustawieniach strony (ikona kłódki obok adresu).',
    };
  }

  const permission = state === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') {
    return permission === 'denied'
      ? { ok: false, reason: 'denied', message: 'Zablokowano powiadomienia. Możesz je włączyć w ustawieniach strony.' }
      : { ok: false, reason: 'dismissed', message: 'Nie włączono powiadomień.' };
  }

  try {
    const deliveryEnabled = await registerDevice();
    return { ok: true, deliveryEnabled };
  } catch (error) {
    console.error('Push: rejestracja urządzenia nie powiodła się', error);
    return { ok: false, reason: 'error', message: 'Nie udało się włączyć powiadomień. Spróbuj ponownie za chwilę.' };
  }
}

/**
 * Ciche odświeżenie tokenu po starcie / zalogowaniu — tylko gdy zgoda już jest. Wiąże urządzenie
 * z aktualnie zalogowanym kontem i przedłuża ważność wpisu w backendzie.
 */
export async function syncPushToken(userId: number | null): Promise<void> {
  if (!isAuthenticated() || getPushPermission() !== 'granted') return;
  // Raz na sesję przeglądarki dla danego konta — nie przy każdym przeładowaniu strony.
  // Zmiana konta (inne userId) wymusza ponowną rejestrację, czyli przepięcie tokenu.
  const marker = `${userId ?? 'unknown'}`;
  if (sessionStorage.getItem(SYNC_MARKER_KEY) === marker) return;
  try {
    await registerDevice();
    sessionStorage.setItem(SYNC_MARKER_KEY, marker);
  } catch (error) {
    console.warn('Push: odświeżenie tokenu nie powiodło się', error);
  }
}

async function registerDevice(): Promise<boolean> {
  await removeLegacyRootWorker();

  const registration = await navigator.serviceWorker.register(PUSH_SW_URL, { scope: PUSH_SW_SCOPE });
  await waitUntilActive(registration);

  const { messaging } = await loadFirebase();
  if (!messaging) throw new Error('Firebase Messaging niedostępny');
  const { getToken } = await import('firebase/messaging');
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) throw new Error('FCM nie zwrócił tokenu');

  const previousToken = localStorage.getItem(FCM_TOKEN_KEY);
  const response = await authorizedFetch(`${environment.apiUrl}/api/v1/push/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      previousToken: previousToken && previousToken !== token ? previousToken : null,
      deviceName: navigator.userAgent,
    }),
  });
  if (!response.ok) throw new Error(`Rejestracja tokenu: HTTP ${response.status}`);

  localStorage.setItem(FCM_TOKEN_KEY, token);
  const body = (await response.json()) as { deliveryEnabled?: boolean };
  return body.deliveryEnabled !== false;
}

/**
 * Starsza wersja aplikacji rejestrowała firebase-messaging-sw.js na „/”. Usuwamy taką rejestrację
 * tylko wtedy, gdy NIE ma w niej workera PWA (/sw.js). Jeśli Serwist już ją aktualizuje
 * (stary worker aktywny, /sw.js w instalacji), sam ją zastąpi — wyrejestrowanie w tym momencie
 * skasowałoby też nowy worker PWA.
 */
async function removeLegacyRootWorker(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  const rootScope = `${window.location.origin}/`;
  await Promise.all(
    registrations
      .filter((reg) => reg.scope === rootScope)
      .filter((reg) => {
        const scripts = [reg.active, reg.waiting, reg.installing].filter(Boolean).map((w) => w!.scriptURL);
        return scripts.length > 0 && scripts.every((url) => url.endsWith(PUSH_SW_URL));
      })
      .map((reg) => reg.unregister())
  );
}

function waitUntilActive(registration: ServiceWorkerRegistration): Promise<void> {
  if (registration.active) return Promise.resolve();
  const worker = registration.installing || registration.waiting;
  if (!worker) return Promise.resolve();
  return new Promise((resolve) => {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') resolve();
    });
  });
}
