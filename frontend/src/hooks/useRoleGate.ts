"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserData, isAuthenticated, type AuthTokenData } from '../utils/auth';

export type RoleGateState = 'checking' | 'granted' | 'denied';

/**
 * Bramka roli dla stron panelu. AuthGuard zna tylko fakt zalogowania, więc rolę sprawdzamy
 * tutaj: gość → /login, inna rola → /unauthorized. To wyłącznie UX — uprawnienia egzekwuje
 * backend (reguła w SecurityConfig + sprawdzenie w serwisie).
 */
export function useRoleGate(allowed: AuthTokenData['userType'] | AuthTokenData['userType'][]): RoleGateState {
  const router = useRouter();
  const [state, setState] = useState<RoleGateState>('checking');
  const allowedKey = Array.isArray(allowed) ? allowed.join(',') : allowed;

  useEffect(() => {
    if (!isAuthenticated()) {
      setState('denied');
      router.replace('/login');
      return;
    }
    const userType = getUserData()?.userType;
    if (!userType || !allowedKey.split(',').includes(userType)) {
      setState('denied');
      router.replace('/unauthorized');
      return;
    }
    setState('granted');
  }, [router, allowedKey]);

  return state;
}
