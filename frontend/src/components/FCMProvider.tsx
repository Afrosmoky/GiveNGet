"use client";

import { useEffect, type ReactNode } from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { syncPushToken } from '../utils/push';

/**
 * Utrzymuje rejestrację urządzenia do powiadomień push.
 *
 * NIE prosi o zgodę — to robi przycisk w PushOptIn (po kliknięciu; przeglądarki karzą prośby
 * bez gestu użytkownika, a gość i tak nie ma czego dostawać). Tu tylko, gdy zgoda już jest:
 * po starcie i po każdym zalogowaniu odświeżamy token i wiążemy go z bieżącym kontem.
 */
export default function FCMProvider({ children }: { children: ReactNode }) {
  const { ready, isLoggedIn, user } = useCurrentUser();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (ready && isLoggedIn) {
      void syncPushToken(userId);
    }
    // userId w zależnościach: przelogowanie na inne konto bez przeładowania też przepina token
  }, [ready, isLoggedIn, userId]);

  return <>{children}</>;
}
