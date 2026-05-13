  "use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function RegisterSuccessPage() {
  return (
    <div style={{
      minHeight: 'calc(100vh - 160px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f0fff4',
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

        {/* Success Icon */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '30px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#68d391',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(104, 211, 145, 0.3)'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6L9 17L4 12"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#2d3748',
          marginBottom: '20px',
          margin: 0
        }}>
          Rejestracja zakończona sukcesem!
        </h1>

        {/* Main Message */}
        <div style={{
          fontSize: '16px',
          color: '#4a5568',
          marginBottom: '30px',
          lineHeight: '1.6'
        }}>
          <p style={{ margin: '0 0 16px 0' }}>
            Twoje konto zostało utworzone pomyślnie.
          </p>
          <p style={{ margin: '0 0 16px 0' }}>
            Na podany adres email został wysłany <strong>link aktywacyjny</strong>. 
            Sprawdź swoją skrzynkę pocztową i kliknij w link, aby aktywować konto.
          </p>
          <p style={{ margin: 0, fontSize: '14px', color: '#718096' }}>
            Pamiętaj, aby sprawdzić także folder spam/wiadomości niepożądane.
          </p>
        </div>

        {/* Email Icon with decoration */}
        <div style={{
          backgroundColor: '#f7fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: '#fbbf24',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="22,6 12,13 2,6"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#2d3748'
            }}>
              Email aktywacyjny wysłany
            </div>
            <div style={{
              fontSize: '14px',
              color: '#4a5568'
            }}>
              Sprawdź swoją skrzynkę pocztową
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <Link 
            href="/"
            style={{
              display: 'inline-block',
              padding: '16px 24px',
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
            Przejdź do strony logowania
          </Link>
          
          <div style={{
            fontSize: '14px',
            color: '#4a5568',
            marginTop: '8px'
          }}>
            Po aktywacji konta będziesz mógł się zalogować
          </div>
        </div>

        {/* Additional Info */}
        <div style={{
          marginTop: '30px',
          padding: '16px',
          backgroundColor: '#fffbeb',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#92400e'
        }}>
          <strong>Uwaga:</strong> Link aktywacyjny ma ograniczony czas ważności. 
          Jeśli nie otrzymałeś emaila w ciągu kilku minut, 
          spróbuj zarejestrować się ponownie.
        </div>
      </div>
    </div>
  );
} 