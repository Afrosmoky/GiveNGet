import React from 'react';
import { useAuth } from '../hooks/useAuth';

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
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            backgroundColor: '#f7fafc'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #fbbf24',
                borderTop: '4px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <div style={{
                color: '#4a5568',
                fontSize: '16px'
              }}>
                Sprawdzanie autoryzacji...
              </div>
            </div>
          </div>
        )}
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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