"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { environment } from '../../config';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [emailError, setEmailError] = useState('');
  const [touched, setTouched] = useState(false);

  const validateEmail = (email: string) => {
    if (email.trim() === '') return 'Email jest wymagany';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !emailRegex.test(email) ? 'Podaj prawidłowy adres email' : '';
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // Jeśli pole było już touched, waliduj na bieżąco
    if (touched) {
      const error = validateEmail(value);
      setEmailError(error);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    const error = validateEmail(email);
    setEmailError(error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Wyczyść poprzednie komunikaty
    setSubmitMessage(null);
    
    // Waliduj email
    const error = validateEmail(email);
    setTouched(true);
    setEmailError(error);
    
    if (error) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${environment.apiUrl}/api/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: email,
        mode: 'cors'
      });
      
      if (response.ok) {
        setSubmitMessage({
          type: 'success',
          text: 'Link do resetowania hasła został wysłany na podany adres email.'
        });
        setEmail('');
        setTouched(false);
        setEmailError('');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setSubmitMessage({
          type: 'error',
          text: errorData.message || `Błąd serwera: ${response.status}`
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

  const getInputStyle = () => ({
    width: '100%',
    padding: '16px',
    border: 'none',
    borderBottom: `2px solid ${emailError ? '#ef4444' : '#e2e8f0'}`,
    fontSize: '16px',
    backgroundColor: 'transparent',
    outline: 'none',
    transition: 'border-color 0.3s',
    color: '#2d3748'
  });

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!emailError) {
      e.target.style.borderBottomColor = '#fbbf24';
    }
  };

  const handleInputBlurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!emailError) {
      e.target.style.borderBottomColor = '#e2e8f0';
    }
  };

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
        maxWidth: '400px',
        padding: '40px',
        textAlign: 'center'
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <Image
            src="/images/logo.png"
            alt="GnG Logo"
            width={150}
            height={75}
            style={{ objectFit: 'contain' }}
          />
        </div>

        {/* Tytuł */}
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#2d3748',
          marginBottom: '10px'
        }}>
          Resetowanie hasła
        </h1>

        <p style={{
          color: '#4a5568',
          fontSize: '14px',
          marginBottom: '30px',
          lineHeight: '1.4'
        }}>
          Podaj swój adres email, a wyślemy Ci link do resetowania hasła.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#4a5568',
              fontSize: '16px'
            }}>
              Adres email
            </label>
            <input
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={(e) => {
                handleBlur();
                handleInputBlurStyle(e);
              }}
              onFocus={handleInputFocus}
              style={getInputStyle()}
              placeholder="Wprowadź swój adres email"
            />
            {emailError && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {emailError}
              </div>
            )}
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
              textAlign: 'center',
              fontSize: '14px'
            }}>
              {submitMessage.text}
            </div>
          )}

          {/* Przycisk Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`btn-primary ${isSubmitting ? 'btn-loading' : ''}`}
            style={{ marginBottom: '20px' }}
          >
            {isSubmitting && (
              <div className="loading-spinner" />
            )}
            {isSubmitting ? 'Wysyłanie...' : 'Wyślij link resetowania'}
          </button>
        </form>

        {/* Linki nawigacyjne */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          alignItems: 'center'
        }}>
          <Link 
            href="/login"
            style={{
              color: '#4a5568',
              textDecoration: 'none',
              fontSize: '14px'
            }}
          >
            Powrót do logowania
          </Link>
          <Link 
            href="/register"
            style={{
              color: '#4a5568',
              textDecoration: 'none',
              fontSize: '14px'
            }}
          >
            Nie masz konta? Zarejestruj się
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 