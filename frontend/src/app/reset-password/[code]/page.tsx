"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { environment } from '../../../config';
import Image from 'next/image';

export default function ResetPasswordWithCodePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [errors, setErrors] = useState({
    password: '',
    confirmPassword: ''
  });
  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false
  });

  const validatePassword = (password: string) => {
    if (password.trim() === '') return 'Hasło jest wymagane';
    return password.length < 6 ? 'Hasło musi mieć co najmniej 6 znaków' : '';
  };

  const validateConfirmPassword = (confirmPassword: string, password: string) => {
    if (confirmPassword.trim() === '') return 'Potwierdzenie hasła jest wymagane';
    return confirmPassword !== password ? 'Hasła muszą być identyczne' : '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Jeśli pole było już touched, waliduj na bieżąco
    if (touched[name as keyof typeof touched]) {
      let error = '';
      if (name === 'password') {
        error = validatePassword(value);
        // Również sprawdź confirmPassword jeśli już było touched
        if (touched.confirmPassword) {
          const confirmError = validateConfirmPassword(formData.confirmPassword, value);
          setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
        }
      } else if (name === 'confirmPassword') {
        error = validateConfirmPassword(value, formData.password);
      }
      
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fieldName = name as keyof typeof touched;
    
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));
    
    let error = '';
    if (name === 'password') {
      error = validatePassword(value);
    } else if (name === 'confirmPassword') {
      error = validateConfirmPassword(value, formData.password);
    }
    
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Wyczyść poprzednie komunikaty
    setSubmitMessage(null);
    
    // Waliduj wszystkie pola naraz
    const passwordError = validatePassword(formData.password);
    const confirmPasswordError = validateConfirmPassword(formData.confirmPassword, formData.password);
    
    const newErrors = {
      password: passwordError,
      confirmPassword: confirmPasswordError
    };
    
    // Oznacz wszystkie pola jako touched
    setTouched({
      password: true,
      confirmPassword: true
    });
    
    setErrors(newErrors);
    
    // Sprawdź czy są jakieś błędy
    const hasErrors = Object.values(newErrors).some(error => error !== '');
    
    if (!hasErrors) {
      setIsSubmitting(true);
      
      try {
        const response = await fetch(`${environment.apiUrl}/api/reset-password/ ${code}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: formData.password,
          mode: 'cors'
        });
        
        if (response.ok) {
          setSubmitMessage({
            type: 'success',
            text: 'Hasło zostało pomyślnie zmienione. Za chwilę zostaniesz przekierowany na stronę logowania.'
          });
          
          // Przekieruj na stronę logowania po 3 sekundach
          setTimeout(() => {
            router.push('/login?message=password-reset-success');
          }, 3000);
          
        } else {
          const errorData = await response.json().catch(() => ({}));
          setSubmitMessage({
            type: 'error',
            text: errorData.message || `Błąd serwera: ${response.status}. Link może być nieprawidłowy lub wygasły.`
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
    }
  };

  const getInputStyle = (fieldName: keyof typeof errors) => ({
    width: '100%',
    padding: '16px',
    border: 'none',
    borderBottom: `2px solid ${errors[fieldName] ? '#ef4444' : '#e2e8f0'}`,
    fontSize: '16px',
    backgroundColor: 'transparent',
    outline: 'none',
    transition: 'border-color 0.3s',
    color: '#2d3748'
  });

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>, fieldName: keyof typeof errors) => {
    if (!errors[fieldName]) {
      e.target.style.borderBottomColor = '#fbbf24';
    }
  };

  const handleInputBlurStyle = (e: React.FocusEvent<HTMLInputElement>, fieldName: keyof typeof errors) => {
    if (!errors[fieldName]) {
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
          Nowe hasło
        </h1>

        <p style={{
          color: '#4a5568',
          fontSize: '14px',
          marginBottom: '30px',
          lineHeight: '1.4'
        }}>
          Wprowadź nowe hasło dla swojego konta.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#4a5568',
              fontSize: '16px'
            }}>
              Nowe hasło
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              onBlur={(e) => {
                handleBlur(e);
                handleInputBlurStyle(e, 'password');
              }}
              onFocus={(e) => handleInputFocus(e, 'password')}
              style={getInputStyle('password')}
              placeholder="Wprowadź nowe hasło"
            />
            {errors.password && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.password}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#4a5568',
              fontSize: '16px'
            }}>
              Potwierdź hasło
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              onBlur={(e) => {
                handleBlur(e);
                handleInputBlurStyle(e, 'confirmPassword');
              }}
              onFocus={(e) => handleInputFocus(e, 'confirmPassword')}
              style={getInputStyle('confirmPassword')}
              placeholder="Potwierdź nowe hasło"
            />
            {errors.confirmPassword && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.confirmPassword}
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
              gap: '8px',
              marginBottom: '20px'
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
            {isSubmitting ? 'Zmieniam hasło...' : 'Zmień hasło'}
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