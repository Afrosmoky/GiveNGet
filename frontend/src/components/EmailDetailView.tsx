import React, { useState } from 'react';
import { environment } from '../config';
import { authorizedFetch } from '../utils/auth';
import { Alert, Button, Card, CardHeader, Input } from './ui';

interface EmailDetailViewProps {
  userData: {
    email: string;
  };
}

export const EmailDetailView: React.FC<EmailDetailViewProps> = ({
  userData
}) => {
  // State dla formularza Email
  const [emailData, setEmailData] = useState({
    newEmail: userData.email,
    currentPassword: ''
  });

  // State dla komunikatów
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  // State dla loading
  const [loading, setLoading] = useState(false);

  // Handler dla zmiany danych email
  const handleEmailDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmailData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Funkcja do zmiany email
  const handleChangeEmail = async () => {
    if (!emailData.currentPassword) {
      setMessage({ type: 'error', text: 'Hasło jest wymagane!' });
      return;
    }

    if (!emailData.newEmail || emailData.newEmail === userData.email) {
      setMessage({ type: 'error', text: 'Podaj nowy adres email!' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await authorizedFetch(`${environment.apiUrl}/api/user/changeEmail`, {
        method: 'PUT',
        body: JSON.stringify({
          newEmail: emailData.newEmail,
          currentPassword: emailData.currentPassword
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Email został zmieniony pomyślnie!' });
        // Aktualizuj localStorage
        localStorage.setItem('userEmail', emailData.newEmail);
        // Wyczyść hasło
        setEmailData(prev => ({ ...prev, currentPassword: '' }));
      } else {
        const errorText = await response.text();
        setMessage({ type: 'error', text: errorText || 'Błąd podczas zmiany email' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Błąd połączenia z serwerem' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding="lg">
      <CardHeader title="Adres e-mail" description="Na ten adres wysyłamy potwierdzenia i odzyskiwanie hasła." />
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleChangeEmail();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nowy e-mail" type="email" name="newEmail" value={emailData.newEmail} onChange={handleEmailDataChange} autoComplete="email" />
          <Input
            label="Obecne hasło"
            type="password"
            name="currentPassword"
            value={emailData.currentPassword}
            onChange={handleEmailDataChange}
            autoComplete="current-password"
          />
        </div>
        {message.text && <Alert tone={message.type === 'success' ? 'success' : 'danger'}>{message.text}</Alert>}
        <div className="flex justify-end">
          <Button type="submit" loading={loading} className="w-full sm:w-auto">
            {loading ? 'Zmienianie…' : 'Zmień e-mail'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
