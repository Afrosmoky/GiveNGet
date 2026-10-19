"use client";

import { useEffect, useState } from 'react';
import {
  addAuthChangeListener,
  AuthTokenData,
  getUserData,
  isAuthenticated,
  removeAuthChangeListener,
} from '../utils/auth';

export type UserType = AuthTokenData['userType'];

interface CurrentUser {
  /** false do pierwszego odczytu localStorage (SSR i pierwszy render) — wtedy nie zgadujemy roli. */
  ready: boolean;
  isLoggedIn: boolean;
  user: Partial<AuthTokenData> | null;
  userType: UserType | null;
}

/**
 * Bieżący użytkownik z utils/auth (localStorage), odświeżany po zalogowaniu/wylogowaniu
 * i po zmianie w innej karcie. Tylko do decyzji o wyglądzie — uprawnienia egzekwuje backend.
 */
export function useCurrentUser(): CurrentUser {
  const [state, setState] = useState<CurrentUser>({ ready: false, isLoggedIn: false, user: null, userType: null });

  useEffect(() => {
    const read = () => {
      const loggedIn = isAuthenticated();
      const user = loggedIn ? getUserData() : null;
      setState({ ready: true, isLoggedIn: loggedIn, user, userType: user?.userType ?? null });
    };

    read();
    addAuthChangeListener(read);
    window.addEventListener('storage', read);
    return () => {
      removeAuthChangeListener(read);
      window.removeEventListener('storage', read);
    };
  }, []);

  return state;
}
