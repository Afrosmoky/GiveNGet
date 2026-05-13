"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { environment } from '../../config';
import Image from 'next/image';

export default function UserNotConfirmedPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  const resendVerificationEmail = async () => {
    if (!email.trim()) {
      setSubmitMessage({
        type: 'error',
        text: 'Proszę podać adres email.'
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      console.log('Wysyłam żądanie ponownego wysłania linku aktywacyjnego na:', `${environment.apiUrl}/api/resentVerification`);

      const response = await fetch(`${environment.apiUrl}/api/resentVerification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: email.trim(),
        mode: 'cors'
      });

      console.log('Odpowiedź:', response);

      if (response.ok) {
        setSubmitMessage({
          type: 'success',
          text: 'Link aktywacyjny został ponownie wysłany na Twój adres email!'
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Błąd serwera:', errorData);
        setSubmitMessage({
          type: 'error',
          text: errorData.message || `Błąd podczas wysyłania: ${response.status}`
        });
      }

    } catch (error) {
      console.error('Błąd połączenia:', error);
      setSubmitMessage({
        type: 'error',
        text: 'Błąd połączenia z serwerem. Sprawdź połączenie internetowe.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
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

        {/* Ikona ostrzeżenia */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '30px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#fbbf24',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
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
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#2d3748',
          marginBottom: '16px',
          margin: 0
        }}>
          Konto nieaktywowane
        </h1>

        {/* Opis */}
        <p style={{
          fontSize: '16px',
          color: '#4a5568',
          marginBottom: '30px',
          lineHeight: '1.5'
        }}>
          Twoje konto nie zostało jeszcze aktywowane. Sprawdź swoją skrzynkę email i kliknij w link aktywacyjny.
          <br /><br />
          Nie otrzymałeś/łaś emaila? Podaj swój adres email i wyślemy ponownie link aktywacyjny.
        </p>

        {/* Pole email */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: '#4a5568',
            fontSize: '16px',
            textAlign: 'left'
          }}>
            Adres email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Wprowadź swój adres email"
            style={{
              width: '100%',
              padding: '16px',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '16px',
              backgroundColor: 'white',
              outline: 'none',
              transition: 'border-color 0.3s',
              color: '#2d3748'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#fbbf24';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0';
            }}
          />
        </div>

        {/* Komunikat o wyniku wysyłania */}
        {submitMessage && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            backgroundColor: submitMessage.type === 'success' ? '#f0fff4' : '#fef2f2',
            border: `1px solid ${submitMessage.type === 'success' ? '#68d391' : '#f87171'}`,
            color: submitMessage.type === 'success' ? '#2d3748' : '#dc2626',
            textAlign: 'center'
          }}>
            {submitMessage.text}
          </div>
        )}

        {/* Przyciski akcji */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Przycisk ponownego wysłania */}
          <button
            onClick={resendVerificationEmail}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: isSubmitting ? '#a0aec0' : '#fbbf24',
              color: isSubmitting ? '#4a5568' : '#1a202c',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = '#f59e0b';
              }
            }}
            onMouseOut={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = '#fbbf24';
              }
            }}
          >
            {isSubmitting && (
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #1a202c',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            )}
            {isSubmitting ? 'Wysyłanie...' : 'Wyślij ponownie link aktywacyjny'}
          </button>

          {/* Przycisk powrotu do logowania */}
          <Link 
            href="/login"
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
            Powróć do logowania
          </Link>

          {/* Link do rejestracji */}
          <div style={{
            textAlign: 'center',
            marginTop: '10px'
          }}>
            <span style={{ color: '#4a5568', fontSize: '14px' }}>
              Nie masz jeszcze konta?{' '}
            </span>
            <Link 
              href="/register"
              style={{
                color: '#fbbf24',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Zarejestruj się
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 