"use client";

import React, { useState } from 'react';
import { LuMail } from 'react-icons/lu';
import Link from 'next/link';
import { environment } from '../../config';
import { AuthCard, AuthNotice, authLinkClass } from '../../components/auth/AuthCard';
import { Button, Input } from '../../components/ui';

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

  return (
    <AuthCard
      title="Resetowanie hasła"
      description="Podaj adres e-mail konta, a wyślemy Ci link do ustawienia nowego hasła."
      footer={
        <div className="flex flex-col items-center gap-2">
          <Link href="/login" className={authLinkClass}>
            Wróć do logowania
          </Link>
          <span>
            Nie masz konta?{' '}
            <Link href="/register" className={authLinkClass}>
              Zarejestruj się
            </Link>
          </span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Adres e-mail"
          type="email"
          autoComplete="email"
          size="lg"
          value={email}
          onChange={handleEmailChange}
          onBlur={handleBlur}
          placeholder="ty@przyklad.pl"
          error={emailError || undefined}
          leftIcon={<LuMail size={16} />}
        />

        {submitMessage && (
          <AuthNotice tone={submitMessage.type === 'success' ? 'success' : 'danger'}>{submitMessage.text}</AuthNotice>
        )}

        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          {isSubmitting ? 'Wysyłanie…' : 'Wyślij link resetowania'}
        </Button>
      </form>
    </AuthCard>
  );
}
