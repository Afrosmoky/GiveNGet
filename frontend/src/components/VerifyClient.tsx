"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { environment } from '../config';
import Image from 'next/image';

type Props = {
  code: string;
};


export default function VerifyClient({ code }: Props) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!code) return;
    const storageKey = `verified_${code}`;
    const cached = sessionStorage.getItem(storageKey);

    // Jeśli mamy już wynik z poprzedniej instancji — przywróć go od razu
    if (cached === 'success') {
      setStatus('success');
      setMessage('Rejestracja przebiegła pomyślnie!');
      return;
    }
    if (cached === 'error') {
      setStatus('error');
      setMessage('Podany kod jest niepoprawny lub wygasł.');
      return;
    }

    // Jeśli request jest w toku (inna instancja go wysłała) — czekaj na wynik
    if (cached === 'pending') {
      const interval = setInterval(() => {
        const result = sessionStorage.getItem(storageKey);
        if (result === 'success') {
          clearInterval(interval);
          setStatus('success');
          setMessage('Rejestracja przebiegła pomyślnie!');
        } else if (result === 'error') {
          clearInterval(interval);
          setStatus('error');
          setMessage('Podany kod jest niepoprawny lub wygasł.');
        }
      }, 100);
      return () => clearInterval(interval);
    }

    // Pierwszy raz — oznacz jako w toku i wyślij request
    sessionStorage.setItem(storageKey, 'pending');

    const verifyCode = async () => {
      try {
        const response = await fetch(`${environment.apiUrl}/api/verify/${code}`, {
          method: 'GET',
          mode: 'cors'
        });

        if (response.ok) {
          sessionStorage.setItem(storageKey, 'success');
          setStatus('success');
          setMessage('Rejestracja przebiegła pomyślnie!');
        } else if (response.status === 400) {
          sessionStorage.setItem(storageKey, 'error');
          setStatus('error');
          setMessage('Podany kod jest niepoprawny lub wygasł.');
        } else {
          sessionStorage.setItem(storageKey, 'error');
          setStatus('error');
          setMessage('Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.');
        }
      } catch (error) {
        console.error('Błąd podczas weryfikacji:', error);
        sessionStorage.removeItem(storageKey); // pozwól na retry przy błędzie sieci
        setStatus('error');
        setMessage('Błąd połączenia z serwerem. Sprawdź połączenie internetowe.');
      }
    };

    verifyCode();
  }, [code]);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return (
          <div style={{
            width: '64px',
            height: '64px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #fbbf24',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        );
      case 'success':
        return (
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#68d391',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6L9 17L4 12"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#f87171',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        );
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading': return '#4a5568';
      case 'success': return '#2d3748';
      case 'error': return '#dc2626';
      default: return '#4a5568';
    }
  };

  const getBackgroundColor = () => {
    switch (status) {
      case 'success': return '#f0fff4';
      case 'error': return '#fef2f2';
      default: return '#f7fafc';
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 160px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: getBackgroundColor(),
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '500px',
        padding: '40px',
        textAlign: 'center'
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '30px'
        }}>
          <Image
            src="/images/logo.png"
            alt="GnG Logo"
            width={150}
            height={75}
            style={{ objectFit: 'contain' }}
          />
        </div>

        {/* Status Icon */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '30px'
        }}>
          {getStatusIcon()}
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: getStatusColor(),
          marginBottom: '16px',
          margin: 0
        }}>
          {status === 'loading' ? 'Weryfikacja w toku...' : 
           status === 'success' ? 'Weryfikacja zakończona!' : 
           'Błąd weryfikacji'}
        </h1>

        {/* Message */}
        <p style={{
          fontSize: '16px',
          color: getStatusColor(),
          marginBottom: '30px',
          lineHeight: '1.5'
        }}>
          {status === 'loading' ? 'Sprawdzam podany kod weryfikacyjny...' : message}
        </p>

        {/* Verification Code Display */}
        {code && (
          <div style={{
            backgroundColor: '#f7fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '30px'
          }}>
            <div style={{
              fontSize: '14px',
              color: '#4a5568',
              marginBottom: '4px'
            }}>
              Kod weryfikacyjny:
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#2d3748',
              fontFamily: 'monospace'
            }}>
              {code}
            </div>
          </div>
        )}

        {/* Action Button */}
        {status !== 'loading' && (
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center'
          }}>
            {status === 'success' ? (
              <Link 
                href="/login"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  backgroundColor: '#fbbf24',
                  color: '#1a202c',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  transition: 'background-color 0.3s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f59e0b';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#fbbf24';
                }}
              >
                Przejdź do logowania
              </Link>
            ) : (
              <>
                <Link 
                  href="/register"
                  style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    backgroundColor: '#fbbf24',
                    color: '#1a202c',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    transition: 'background-color 0.3s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f59e0b';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#fbbf24';
                  }}
                >
                  Zarejestruj się ponownie
                </Link>
                <Link 
                  href="/"
                  style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    backgroundColor: 'transparent',
                    color: '#4a5568',
                    textDecoration: 'none',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '16px',
                    transition: 'all 0.3s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f7fafc';
                    e.currentTarget.style.borderColor = '#cbd5e0';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  Strona główna
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 