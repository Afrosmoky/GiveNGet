"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function UnauthorizedPage() {
  return (
    <div style={{
      minHeight: 'calc(100vh - 160px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f7fafc',
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

        {/* Ikona zabronionego dostępu */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '30px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#f87171',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path
                d="M18.364 5.636L5.636 18.364M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Tytuł */}
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#dc2626',
          marginBottom: '16px',
          margin: 0
        }}>
          Brak autoryzacji
        </h1>

        {/* Opis */}
        <p style={{
          fontSize: '16px',
          color: '#4a5568',
          marginBottom: '30px',
          lineHeight: '1.6'
        }}>
          Dostęp do tej strony jest ograniczony tylko dla zalogowanych użytkowników.
          <br /><br />
          Aby uzyskać dostęp do dashboard, musisz się najpierw zalogować.
        </p>

        {/* Przyciski akcji */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Przycisk logowania */}
          <Link 
            href="/login"
            style={{
              display: 'inline-block',
              width: '100%',
              padding: '16px',
              backgroundColor: '#fbbf24',
              color: '#1a202c',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              textAlign: 'center',
              transition: 'background-color 0.3s',
              boxSizing: 'border-box'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f59e0b';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#fbbf24';
            }}
          >
            🔑 Zaloguj się
          </Link>

          {/* Przycisk rejestracji */}
          <Link 
            href="/register"
            style={{
              display: 'inline-block',
              width: '100%',
              padding: '16px',
              backgroundColor: 'transparent',
              color: '#4a5568',
              textDecoration: 'none',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '16px',
              textAlign: 'center',
              transition: 'all 0.3s',
              boxSizing: 'border-box'
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
            📝 Utwórz nowe konto
          </Link>

          {/* Przycisk powrotu do strony głównej */}
          <Link 
            href="/"
            style={{
              display: 'inline-block',
              width: '100%',
              padding: '12px',
              backgroundColor: 'transparent',
              color: '#718096',
              textDecoration: 'none',
              fontSize: '14px',
              textAlign: 'center',
              transition: 'color 0.3s',
              marginTop: '10px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#4a5568';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = '#718096';
            }}
          >
            ← Powróć do strony głównej
          </Link>
        </div>

        {/* Dodatkowe informacje */}
        <div style={{
          marginTop: '30px',
          padding: '16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#7f1d1d',
            fontWeight: 'bold',
            marginBottom: '4px'
          }}>
            💡 Wskazówka
          </div>
          <div style={{
            fontSize: '13px',
            color: '#991b1b',
            lineHeight: '1.4'
          }}>
            Jeśli masz już konto, ale nadal widzisz ten komunikat, spróbuj wylogować się i zalogować ponownie.
          </div>
        </div>
      </div>
    </div>
  );
} 