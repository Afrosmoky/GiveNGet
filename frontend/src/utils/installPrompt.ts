"use client";

import { useEffect, useState } from 'react';

/**
 * Instalacja PWA. Chrome/Edge/Android wysyłają `beforeinstallprompt`, gdy aplikacja spełnia
 * kryteria instalowalności (manifest + service worker + ikony). Zdarzenie przechwytujemy
 * globalnie już przy imporcie modułu — przychodzi raz, często zanim zamontuje się komponent,
 * który chce pokazać przycisk „Zainstaluj”.
 *
 * Safari (iOS/macOS) tego zdarzenia nie ma — tam instalacja to „Dodaj do ekranu początkowego”.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Bez preventDefault Chrome na Androidzie pokazuje własny pasek — wolimy przycisk w aplikacji
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

export function useInstallPrompt() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const update = () => setAvailable(deferredPrompt !== null);
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
    };
  }, []);

  /** Pokazuje systemowe okno instalacji (tylko z obsługi kliknięcia). */
  const install = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const prompt = deferredPrompt;
    if (!prompt) return 'unavailable';
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    // Zdarzenia nie da się użyć drugi raz — Chrome wyśle nowe, jeśli instalacja wciąż możliwa
    deferredPrompt = null;
    notify();
    return outcome;
  };

  return { available, install };
}
