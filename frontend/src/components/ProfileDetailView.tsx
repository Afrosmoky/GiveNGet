import React, { useState } from 'react';
import { LuCamera, LuCreditCard, LuLock, LuMail, LuMapPin, LuUpload, LuUser } from 'react-icons/lu';
import { environment } from '../config';
import { authorizedFetch } from '../utils/auth';
import { EmailDetailView } from './EmailDetailView';
import { AddressDetailView } from './AddressDetailView';
import { PaymentDetailView } from './PaymentDetailView';
import { Alert, Avatar, Button, Card, CardHeader, Chip, Input, Textarea, cn } from './ui';

interface ProfileDetailViewProps {
  userData: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    userPhotoUrl: string | null;
    bio?: string;
  };
  profileImageUrl: string | null;
  showPhotoUpload: boolean;
  selectedPhoto: File | null;
  isDragOver: boolean;
  isUploading: boolean;
  onPhotoClick: () => void;
  onAbortUpload: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onChangePhoto: () => void;
}

type Tab = 'profile' | 'email' | 'security' | 'address' | 'payment';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Dane osobowe', icon: <LuUser size={15} aria-hidden /> },
  { id: 'email', label: 'E-mail', icon: <LuMail size={15} aria-hidden /> },
  { id: 'security', label: 'Hasło', icon: <LuLock size={15} aria-hidden /> },
  { id: 'address', label: 'Adres', icon: <LuMapPin size={15} aria-hidden /> },
  { id: 'payment', label: 'Płatności', icon: <LuCreditCard size={15} aria-hidden /> },
];

type Message = { type: 'success' | 'error' | ''; text: string };

function FormMessage({ message }: { message: Message }) {
  if (!message.text) return null;
  return <Alert tone={message.type === 'success' ? 'success' : 'danger'}>{message.text}</Alert>;
}

export const ProfileDetailView: React.FC<ProfileDetailViewProps> = ({
  userData,
  profileImageUrl,
  showPhotoUpload,
  selectedPhoto,
  isDragOver,
  isUploading,
  onPhotoClick,
  onAbortUpload,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onChangePhoto
}) => {
  // State dla formularza danych osobowych
  const [personalData, setPersonalData] = useState({
    firstName: userData.firstName,
    lastName: userData.lastName,
    phoneNumber: userData.phoneNumber,
    bio: userData.bio || ''
  });

  // State dla formularza hasła
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // State dla komunikatów
  const [messages, setMessages] = useState<{ personalInfo: Message; password: Message }>({
    personalInfo: { type: '', text: '' },
    password: { type: '', text: '' }
  });

  // State dla loading
  const [loading, setLoading] = useState({
    personalInfo: false,
    password: false
  });

  // Aktywna zakładka
  const [currentView, setCurrentView] = useState<Tab>('profile');

  // Aktualizacja danych personalnych przy zmianie userData
  React.useEffect(() => {
    setPersonalData({
      firstName: userData.firstName,
      lastName: userData.lastName,
      phoneNumber: userData.phoneNumber,
      bio: userData.bio || ''
    });
  }, [userData]);

  // Handler dla zmiany danych personalnych
  const handlePersonalDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPersonalData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handler dla zmiany danych hasła
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Funkcja do zapisywania danych personalnych
  const handleSavePersonalData = async () => {
    setLoading(prev => ({ ...prev, personalInfo: true }));
    setMessages(prev => ({ ...prev, personalInfo: { type: '', text: '' } }));

    try {
      const response = await authorizedFetch(`${environment.apiUrl}/api/user/personalData`, {
        method: 'PUT',
        body: JSON.stringify({
          firstName: personalData.firstName,
          lastName: personalData.lastName,
          phoneNumber: personalData.phoneNumber,
          bio: personalData.bio
        })
      });

      if (response.ok) {
        setMessages(prev => ({
          ...prev,
          personalInfo: { type: 'success', text: 'Dane zostały zaktualizowane pomyślnie!' }
        }));
        // Aktualizuj dane w localStorage jeśli są tam przechowywane
        localStorage.setItem('userFirstName', personalData.firstName);
        localStorage.setItem('userLastName', personalData.lastName);
        localStorage.setItem('userPhoneNumber', personalData.phoneNumber);
        localStorage.setItem('userBio', personalData.bio);
        userData.firstName = personalData.firstName;
        userData.lastName = personalData.lastName;
        userData.phoneNumber = personalData.phoneNumber;
        userData.bio = personalData.bio;
      } else {
        setMessages(prev => ({
          ...prev,
          personalInfo: { type: 'error', text: 'Błąd podczas aktualizacji danych' }
        }));
      }
    } catch {
      setMessages(prev => ({
        ...prev,
        personalInfo: { type: 'error', text: 'Błąd połączenia z serwerem' }
      }));
    } finally {
      setLoading(prev => ({ ...prev, personalInfo: false }));
    }
  };

  // Funkcja do zmiany hasła
  const handleChangePassword = async () => {
    // Walidacja
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessages(prev => ({
        ...prev,
        password: { type: 'error', text: 'Nowe hasło i potwierdzenie hasła muszą być takie same!' }
      }));
      return;
    }

    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setMessages(prev => ({
        ...prev,
        password: { type: 'error', text: 'Wszystkie pola są wymagane!' }
      }));
      return;
    }

    setLoading(prev => ({ ...prev, password: true }));
    setMessages(prev => ({ ...prev, password: { type: '', text: '' } }));

    try {
      const response = await authorizedFetch(`${environment.apiUrl}/api/user/changePassword`, {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (response.ok) {
        setMessages(prev => ({
          ...prev,
          password: { type: 'success', text: 'Hasło zostało zmienione pomyślnie!' }
        }));
        // Wyczyść formularz
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const errorText = await response.text();
        setMessages(prev => ({
          ...prev,
          password: { type: 'error', text: errorText || 'Błąd podczas zmiany hasła' }
        }));
      }
    } catch {
      setMessages(prev => ({
        ...prev,
        password: { type: 'error', text: 'Błąd połączenia z serwerem' }
      }));
    } finally {
      setLoading(prev => ({ ...prev, password: false }));
    }
  };

  const fullName = [userData.firstName, userData.lastName].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-4">
      {/* Zdjęcie profilowe */}
      <Card className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onPhotoClick}
          className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          aria-label="Zmień zdjęcie profilowe"
        >
          <Avatar name={fullName || userData.email} src={profileImageUrl} size="lg" className="!h-20 !w-20 !text-xl" />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-brand text-brand-contrast">
            <LuCamera size={14} aria-hidden />
          </span>
        </button>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="truncate text-lg font-semibold text-ink">{fullName || 'Uzupełnij imię i nazwisko'}</p>
          <p className="truncate text-sm text-ink-muted">{userData.email}</p>
        </div>
        {!showPhotoUpload && (
          <Button variant="secondary" size="sm" leftIcon={<LuCamera size={15} />} onClick={onPhotoClick}>
            Zmień zdjęcie
          </Button>
        )}
      </Card>

      {showPhotoUpload && (
        <Card>
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={cn(
              'flex flex-col items-center gap-3 rounded-ui-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
              isDragOver ? 'border-brand bg-brand-soft' : 'border-line bg-surface-muted'
            )}
          >
            <LuUpload size={22} className="text-ink-subtle" aria-hidden />
            <p className="text-sm text-ink-muted">
              {selectedPhoto ? (
                <>
                  Wybrane: <span className="font-medium text-ink">{selectedPhoto.name}</span>
                </>
              ) : (
                'Przeciągnij zdjęcie tutaj albo wybierz plik'
              )}
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={onFileSelect}
              className="block w-full max-w-xs text-sm text-ink-muted file:mr-3 file:rounded-ui-sm file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-strong hover:file:bg-brand-soft/70"
            />
          </div>
          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onAbortUpload}>
              Anuluj
            </Button>
            <Button onClick={onChangePhoto} disabled={!selectedPhoto || isUploading} loading={isUploading}>
              {isUploading ? 'Wysyłanie…' : 'Zapisz zdjęcie'}
            </Button>
          </div>
        </Card>
      )}

      {/* Zakładki ustawień konta */}
      <div role="tablist" aria-label="Ustawienia konta" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {TABS.map((tab) => (
          <Chip
            key={tab.id}
            role="tab"
            aria-selected={currentView === tab.id}
            selected={currentView === tab.id}
            icon={tab.icon}
            onClick={() => setCurrentView(tab.id)}
            className="shrink-0"
          >
            {tab.label}
          </Chip>
        ))}
      </div>

      {currentView === 'email' && <EmailDetailView userData={{ email: userData.email }} />}
      {currentView === 'address' && <AddressDetailView />}
      {currentView === 'payment' && <PaymentDetailView />}

      {currentView === 'profile' && (
        <Card padding="lg">
          <CardHeader title="Dane osobowe" description="Imię, nazwisko, telefon i kilka słów o sobie." />
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSavePersonalData();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Imię" name="firstName" value={personalData.firstName} onChange={handlePersonalDataChange} autoComplete="given-name" />
              <Input label="Nazwisko" name="lastName" value={personalData.lastName} onChange={handlePersonalDataChange} autoComplete="family-name" />
              <Input label="Telefon" type="tel" name="phoneNumber" value={personalData.phoneNumber} onChange={handlePersonalDataChange} autoComplete="tel" />
            </div>
            <Textarea
              label="O mnie"
              name="bio"
              value={personalData.bio}
              onChange={handlePersonalDataChange}
              placeholder="Opisz siebie w kilku słowach..."
              rows={4}
            />
            <FormMessage message={messages.personalInfo} />
            <div className="flex justify-end">
              <Button type="submit" loading={loading.personalInfo} className="w-full sm:w-auto">
                {loading.personalInfo ? 'Zapisywanie…' : 'Zapisz zmiany'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {currentView === 'security' && (
        <Card padding="lg">
          <CardHeader title="Zmiana hasła" description="Do zmiany potrzebne jest obecne hasło." />
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleChangePassword();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Obecne hasło"
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                autoComplete="current-password"
              />
              <Input
                label="Nowe hasło"
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                autoComplete="new-password"
              />
              <Input
                label="Powtórz nowe hasło"
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                autoComplete="new-password"
              />
            </div>
            <FormMessage message={messages.password} />
            <div className="flex justify-end">
              <Button type="submit" loading={loading.password} className="w-full sm:w-auto">
                {loading.password ? 'Zmienianie…' : 'Zmień hasło'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};
