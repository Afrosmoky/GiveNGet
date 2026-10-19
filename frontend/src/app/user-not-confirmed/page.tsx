"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { environment } from '../../config';
import { LuMail, LuMailWarning } from 'react-icons/lu';
import { AuthCard, AuthNotice, authLinkClass } from '../../components/auth/AuthCard';
import { Button, Input } from '../../components/ui';

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
      const response = await fetch(`${environment.apiUrl}/api/resentVerification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: email.trim(),
        mode: 'cors'
      });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resendVerificationEmail();
  };

  return (
    <AuthCard
      icon={<LuMailWarning size={24} />}
      tone="warning"
      showLogo={false}
      title="Konto nieaktywowane"
      description="Twoje konto nie zostało jeszcze aktywowane. Sprawdź skrzynkę e-mail i kliknij link aktywacyjny."
      footer={
        <>
          Nie masz jeszcze konta?{' '}
          <Link href="/register" className={authLinkClass}>
            Zarejestruj się
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <p className="text-sm text-ink-muted">Nie dostałeś e-maila? Podaj adres, a wyślemy link ponownie.</p>
        <Input
          label="Adres e-mail"
          type="email"
          autoComplete="email"
          size="lg"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ty@przyklad.pl"
          leftIcon={<LuMail size={16} />}
        />

        {submitMessage && (
          <AuthNotice tone={submitMessage.type === 'success' ? 'success' : 'danger'}>{submitMessage.text}</AuthNotice>
        )}

        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          {isSubmitting ? 'Wysyłanie…' : 'Wyślij ponownie link aktywacyjny'}
        </Button>
        <Button href="/login" variant="secondary" size="lg" fullWidth>
          Wróć do logowania
        </Button>
      </form>
    </AuthCard>
  );
}
