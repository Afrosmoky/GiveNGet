"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { environment } from '../../../config';
import { LuLock } from 'react-icons/lu';
import { AuthCard, AuthNotice, authLinkClass } from '../../../components/auth/AuthCard';
import { Button, Input } from '../../../components/ui';
import { describeErrorCode, parseApiError } from '../../../utils/apiErrors';

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
  const [invalidLink, setInvalidLink] = useState(false);
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
        const response = await fetch(`${environment.apiUrl}/api/reset-password/${encodeURIComponent(code)}`, {
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
          // Rozgałęzienie po code (6.3): nieważny link → komunikat + link do nowego resetu
          const body = await response.text().catch(() => '');
          const apiError = parseApiError(body);
          setInvalidLink(apiError?.code === 'INVALID_RESET_CODE');
          setSubmitMessage({
            type: 'error',
            text: apiError
              ? describeErrorCode(apiError.code, apiError.message)
              : `Błąd serwera: ${response.status}. Spróbuj ponownie za chwilę.`
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

  return (
    <AuthCard
      title="Nowe hasło"
      description="Wprowadź nowe hasło do swojego konta."
      footer={
        <Link href="/login" className={authLinkClass}>
          Wróć do logowania
        </Link>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Nowe hasło"
          type="password"
          name="password"
          autoComplete="new-password"
          size="lg"
          value={formData.password}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder="Co najmniej 6 znaków"
          error={errors.password || undefined}
          leftIcon={<LuLock size={16} />}
        />
        <Input
          label="Potwierdź hasło"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          size="lg"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder="Powtórz nowe hasło"
          error={errors.confirmPassword || undefined}
          leftIcon={<LuLock size={16} />}
        />

        {submitMessage && (
          <AuthNotice tone={submitMessage.type === 'success' ? 'success' : 'danger'}>
            {submitMessage.text}
            {invalidLink && (
              <>
                {' '}
                <Link href="/reset-password" className="font-semibold underline underline-offset-2">
                  Poproś o nowy link
                </Link>
              </>
            )}
          </AuthNotice>
        )}

        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          {isSubmitting ? 'Zapisywanie…' : 'Zmień hasło'}
        </Button>
      </form>
    </AuthCard>
  );
}
