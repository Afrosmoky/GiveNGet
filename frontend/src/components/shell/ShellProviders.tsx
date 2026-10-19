"use client";

import type { ReactNode } from 'react';
import { WebSocketProvider } from '../../context/WebSocketContext';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import FCMProvider from '../FCMProvider';

/**
 * Jedna instancja FCM + WebSocket dla całej aplikacji (wcześniej były dwie: osobno
 * dla layoutu mobilnego i desktopowego). Musi leżeć NAD AppShell, żeby zmiana powłoki
 * (np. po zalogowaniu) nie zrywała połączenia.
 */
export function ShellProviders({ children }: { children: ReactNode }) {
  const { isLoggedIn, user } = useCurrentUser();
  // Jak dotąd: WS tylko dla zalogowanego z poprawnym id
  const userId = isLoggedIn && user?.id && user.id > 0 ? user.id : null;

  return (
    <FCMProvider>
      <WebSocketProvider userId={userId}>{children}</WebSocketProvider>
    </FCMProvider>
  );
}
