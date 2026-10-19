"use client";

import { useState, useEffect } from 'react';
import { LuCircleCheck, LuCircleX } from 'react-icons/lu';
import { environment } from '../config';
import { AuthCard } from './auth/AuthCard';
import { Button, Spinner } from './ui';

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

  const title =
    status === 'loading' ? 'Weryfikacja w toku…' : status === 'success' ? 'Konto aktywowane!' : 'Błąd weryfikacji';

  return (
    <AuthCard
      icon={
        status === 'loading' ? (
          <Spinner className="h-6 w-6" />
        ) : status === 'success' ? (
          <LuCircleCheck size={28} />
        ) : (
          <LuCircleX size={28} />
        )
      }
      tone={status === 'loading' ? 'neutral' : status === 'success' ? 'success' : 'danger'}
      showLogo={false}
      title={title}
      description={
        <span aria-live="polite">{status === 'loading' ? 'Sprawdzam link aktywacyjny…' : message}</span>
      }
    >
      {status === 'success' && (
        <Button href="/login" size="lg" fullWidth>
          Przejdź do logowania
        </Button>
      )}
      {status === 'error' && (
        <div className="space-y-3">
          <Button href="/register" size="lg" fullWidth>
            Zarejestruj się ponownie
          </Button>
          <Button href="/" variant="secondary" size="lg" fullWidth>
            Strona główna
          </Button>
        </div>
      )}
    </AuthCard>
  );
}
