"use client";

import type { ReactNode } from 'react';
import { useRoleGate } from '../../hooks/useRoleGate';
import { Spinner } from '../../components/ui';

/**
 * Bramka panelu admina/moderatora. Nawigacja żyje w powłoce (components/shell — konsola admina),
 * a szerokość i marginesy każda strona bierze z `consolePage`. Uprawnienia egzekwuje backend.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const gate = useRoleGate(['ADMIN', 'EMPLOYEE']);

  if (gate !== 'granted') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        {gate === 'checking' && <Spinner label="Sprawdzanie uprawnień" />}
      </div>
    );
  }

  return <>{children}</>;
}
