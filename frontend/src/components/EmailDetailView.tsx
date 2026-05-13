import React, { useState } from 'react';
import { environment } from '../config';
import { authorizedFetch } from '../utils/auth';

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
  const [message, setMessage] = useState({ type: '', text: '' });

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
    <div style={{
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      {/* Email Section */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '0',
          boxShadow: 'none',
          padding: '30px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#9ca3af',
                fontSize: '12px',
                textTransform: 'uppercase'
              }}>
                Email
              </label>
              <input
                type="email"
                name="newEmail"
                value={emailData.newEmail}
                onChange={handleEmailDataChange}
                style={{
                  width: '100%',
                  padding: '0 0 8px 0',
                  border: 'none',
                  borderBottom: '1px solid #e2e8f0',
                  fontSize: '16px',
                  backgroundColor: 'transparent',
                  color: '#2d3748',
                  outline: 'none'
                }}
              />
            </div>
            
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#9ca3af',
                fontSize: '12px',
                textTransform: 'uppercase'
              }}>
                Current password
              </label>
              <input
                type="password"
                name="currentPassword"
                value={emailData.currentPassword}
                onChange={handleEmailDataChange}
                style={{
                  width: '100%',
                  padding: '0 0 8px 0',
                  border: 'none',
                  borderBottom: '1px solid #e2e8f0',
                  fontSize: '16px',
                  backgroundColor: 'transparent',
                  color: '#2d3748',
                  outline: 'none'
                }}
              />
            </div>
          </div>
          
          {/* Komunikat */}
          {message.text && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              backgroundColor: message.type === 'success' ? '#f0fff4' : '#fef2f2',
              border: `1px solid ${message.type === 'success' ? '#68d391' : '#f87171'}`,
              color: message.type === 'success' ? '#2d3748' : '#dc2626',
              textAlign: 'center'
            }}>
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={handleChangeEmail}
              disabled={loading}
              style={{
                width: '200px',
                padding: '12px',
                backgroundColor: loading ? '#a0aec0' : '#fbbf24',
                color: '#1a202c',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#f59e0b';
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#fbbf24';
                }
              }}
            >
              {loading && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #1a202c',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
              {loading ? 'Zmienianie...' : 'Change Email'}
            </button>
                     </div>
         </div>
       </div>
   );
 }; 