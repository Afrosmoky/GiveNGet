import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from './ui';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  loadingComponent?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requireAuth = true,
  loadingComponent 
}) => {
  const { isLoading, isAuthValid } = useAuth({ requireAuth });

  if (isLoading) {
    return (
      <>
        {loadingComponent || (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
            <Spinner className="h-7 w-7 text-brand" label="Sprawdzanie autoryzacji" />
            <p className="text-sm text-ink-muted">Sprawdzanie autoryzacji…</p>
          </div>
        )}
      </>
    );
  }

  if (!requireAuth || isAuthValid) {
    return <>{children}</>;
  }

  // Jeśli autoryzacja jest wymagana ale nieprawidłowa, 
  // hook useAuth już przekierował na stronę logowania
  return null;
}; 