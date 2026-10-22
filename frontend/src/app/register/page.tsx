"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { IconType } from 'react-icons';
import { LuBuilding2, LuChartColumn, LuLeaf, LuLock, LuMail, LuMapPin, LuPhone, LuQrCode, LuUpload, LuUser } from 'react-icons/lu';
import { environment } from '../../config';
import { AuthGuard } from '../../components/AuthGuard';
import LocationMapModal from '../../components/LocationMapModal';
import { AuthNotice, authLinkClass } from '../../components/auth/AuthCard';
import { CONSENT_REQUIRED_MESSAGE, ConsentCheckbox } from '../../components/auth/register/ConsentCheckbox';
import { LocationField, type LocationSuggestion } from '../../components/auth/register/LocationField';
import { PhotoDropzone } from '../../components/auth/register/PhotoDropzone';
import { Button, Card, Chip, Input, Textarea, cn, pageContainer } from '../../components/ui';
import { describeApiError } from '../../utils/apiErrors';

// Typy rejestracji
type RegistrationType = 'user' | 'company';

/** Co daje konto — tylko funkcje, które już działają (rezerwacje, kod odbioru, import, raport). */
const BENEFITS: Record<RegistrationType, { icon: IconType; text: string }[]> = {
  user: [
    { icon: LuMapPin, text: 'Oferty sklepów, piekarni i sąsiadów z Twojej okolicy' },
    { icon: LuQrCode, text: 'Rezerwujesz w aplikacji, odbierasz osobiście z kodem' },
    { icon: LuLeaf, text: 'Płacisz mniej albo nic, a jedzenie nie ląduje w koszu' },
  ],
  company: [
    { icon: LuUpload, text: 'Wystawiasz nadwyżki w kilka minut — pojedynczo albo importem z Excela' },
    { icon: LuQrCode, text: 'Pracownicy potwierdzają odbiór kodem rezerwacji' },
    { icon: LuChartColumn, text: 'Raport pokazuje, ile jedzenia udało się uratować' },
  ],
};

const REGISTRATION_TYPES: { value: RegistrationType; label: string; icon: React.ReactNode }[] = [
  { value: 'user', label: 'Osoba prywatna', icon: <LuUser size={16} aria-hidden /> },
  { value: 'company', label: 'Firma / sklep', icon: <LuBuilding2 size={16} aria-hidden /> },
];

function RegisterPageContent() {
  const router = useRouter();
  const [registrationType, setRegistrationType] = useState<RegistrationType>('user');

  // /register?type=company (np. z „Załóż konto firmy” na stronie głównej) otwiera formularz firmy
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('type') === 'company') {
      setRegistrationType('company');
    }
  }, []);

  const benefits = BENEFITS[registrationType];
  const loginLink = (
    <p className="text-sm text-ink-muted">
      Masz już konto?{' '}
      <Link href="/login" className={authLinkClass}>
        Zaloguj się
      </Link>
    </p>
  );

  return (
    <div className={cn(pageContainer, 'py-8 sm:py-12')}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        {/* Wprowadzenie — na desktopie przyklejone obok długiego formularza */}
        <div className="lg:sticky lg:top-[calc(var(--shell-topbar-h)+2rem)] lg:self-start lg:pt-2">
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Załóż konto</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted sm:text-base">
            {registrationType === 'user'
              ? 'Rezerwuj jedzenie z okolicy taniej albo za darmo i oddawaj to, czego nie zjesz.'
              : 'Sprzedawaj nadwyżki zamiast je wyrzucać. Rejestracja sklepu zajmuje dwa kroki.'}
          </p>
          <ul className="mt-6 hidden space-y-3 lg:block">
            {benefits.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-ink">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ui-sm bg-brand-soft text-brand" aria-hidden>
                  <Icon size={16} />
                </span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 hidden lg:block">{loginLink}</div>
        </div>

        <div>
          <Card padding="none" className="p-5 sm:p-8">
            {/* Przełącznik typu rejestracji */}
            <div role="tablist" aria-label="Typ konta" className="mb-6 grid grid-cols-2 gap-1 rounded-ui-md bg-surface-sunken p-1">
              {REGISTRATION_TYPES.map(type => {
                const active = registrationType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setRegistrationType(type.value)}
                    className={cn(
                      'inline-flex h-10 items-center justify-center gap-2 rounded-ui-sm text-sm font-semibold transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                      active ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink'
                    )}
                  >
                    {type.icon}
                    {type.label}
                  </button>
                );
              })}
            </div>

            {registrationType === 'user' ? <UserRegistrationForm router={router} /> : <CompanyRegistrationForm />}
          </Card>
          <div className="mt-5 text-center lg:hidden">{loginLink}</div>
        </div>
      </div>
    </div>
  );
}

// Komponent rejestracji użytkownika
function UserRegistrationForm({ router }: { router: { push: (url: string) => void } }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    phoneNumber: '',
    password: '',
    localization: '',
    lat: undefined as number | undefined,
    lon: undefined as number | undefined,
    profilePhoto: null as File | null,
    bio: ''
  });

  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentError, setConsentError] = useState('');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stan dla wyszukiwania lokalizacji
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSearching, setLocationSearching] = useState(false);
  const isMapUpdate = useRef(false);

  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    phoneNumber: '',
    password: '',
    localization: ''
  });

  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    dateOfBirth: false,
    email: false,
    phoneNumber: false,
    password: false,
    localization: false
  });

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'firstName':
        return value.trim() === '' ? 'Imię jest wymagane' : '';
      case 'lastName':
        return value.trim() === '' ? 'Nazwisko jest wymagane' : '';
      case 'dateOfBirth':
        if (value.trim() === '') return 'Data urodzenia jest wymagana';
        
        // Sprawdź format YYYY-MM-DD
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(value)) {
          return 'Data musi być w formacie YYYY-MM-DD';
        }
        
        // Sprawdź czy data jest prawidłowa
        const date = new Date(value);
        const [year, month, day] = value.split('-').map(Number);
        
        // Sprawdź czy data jest rzeczywista (Date automatycznie poprawia nieprawidłowe daty)
        if (date.getFullYear() !== year || 
            date.getMonth() !== month - 1 || 
            date.getDate() !== day) {
          return 'Podaj prawidłową datę';
        }
        
        // Sprawdź czy data nie jest z przyszłości
        const today = new Date();
        if (date > today) {
          return 'Data urodzenia nie może być z przyszłości';
        }
        
        // Sprawdź czy osoba ma przynajmniej 13 lat
        const minDate = new Date();
        minDate.setFullYear(today.getFullYear() - 13);
        if (date > minDate) {
          return 'Musisz mieć co najmniej 13 lat';
        }
        
        return '';
      case 'email':
        if (value.trim() === '') return 'Email jest wymagany';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !emailRegex.test(value) ? 'Podaj prawidłowy adres email' : '';
      case 'phoneNumber':
        return value.trim() === '' ? 'Numer telefonu jest wymagany' : '';
      case 'password':
        if (value.trim() === '') return 'Hasło jest wymagane';
        return value.length < 6 ? 'Hasło musi mieć co najmniej 6 znaków' : '';
      case 'localization':
        return value.trim() === '' ? 'Lokalizacja jest wymagana' : '';
      default:
        return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (touched[name as keyof typeof touched]) {
      const error = validateField(name, value);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      profilePhoto: file
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setFormData(prev => ({
          ...prev,
          profilePhoto: file
        }));
      }
    }
  };

  const handleLocationSelect = (lat: number, lon: number, address?: string) => {
    isMapUpdate.current = true;
    const locationText = address || `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    setFormData(prev => ({
      ...prev,
      localization: locationText,
      lat: lat,
      lon: lon
    }));
    setIsLocationModalOpen(false);
    setShowLocationSuggestions(false);
    
    // Walidacja po aktualizacji z mapy
    const error = validateField('localization', locationText);
    setErrors(prev => ({
      ...prev,
      localization: error
    }));
    setTouched(prev => ({
      ...prev,
      localization: true
    }));
  };

  // Funkcja wyszukiwania lokalizacji
  const searchLocation = useCallback(async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }
    try {
      setLocationSearching(true);
      const response = await fetch(`${environment.apiUrl}/geocode/search?text=${encodeURIComponent(query)}`, {
        method: 'GET',
        mode: 'cors'
      });
      if (response.ok) {
        const data: LocationSuggestion[] = await response.json();
        setLocationSuggestions(data);
        setShowLocationSuggestions(data.length > 0);
      } else {
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      }
    } catch (error) {
      console.error('Błąd połączenia z API lokalizacji:', error);
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    } finally {
      setLocationSearching(false);
    }
  }, []);

  // Debounced search dla lokalizacji
  useEffect(() => {
    // Jeśli to jest aktualizacja z mapy, zresetuj flagę i nie uruchamiaj wyszukiwania
    if (isMapUpdate.current) {
      isMapUpdate.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      if (formData.localization.length >= 3) {
        searchLocation(formData.localization);
      } else {
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [formData.localization, searchLocation]);

  // Funkcja do obsługi wyboru sugestii z listy
  const handleSuggestionSelect = (suggestion: LocationSuggestion) => {
    const locationText = suggestion.formatted;
    const { lon, lat } = suggestion;
    
    setFormData(prev => ({
      ...prev,
      localization: locationText,
      lat: lat,
      lon: lon
    }));
    setShowLocationSuggestions(false);
    
    // Walidacja po wyborze sugestii
    const error = validateField('localization', locationText);
    setErrors(prev => ({
      ...prev,
      localization: error
    }));
    setTouched(prev => ({
      ...prev,
      localization: true
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSubmitMessage(null);
    
    const newErrors = {
      firstName: validateField('firstName', formData.firstName),
      lastName: validateField('lastName', formData.lastName),
      dateOfBirth: validateField('dateOfBirth', formData.dateOfBirth),
      email: validateField('email', formData.email),
      phoneNumber: validateField('phoneNumber', formData.phoneNumber),
      password: validateField('password', formData.password),
      localization: validateField('localization', formData.localization)
    };
    
    setTouched({
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      email: true,
      phoneNumber: true,
      password: true,
      localization: true
    });
    
    setErrors(newErrors);
    
    const hasErrors = Object.values(newErrors).some(error => error !== '');
    // Zgoda jest wymagana — bez niej nie wysyłamy (backend i tak odrzuci z CONSENT_REQUIRED)
    const consentMissing = !consentAccepted;
    setConsentError(consentMissing ? CONSENT_REQUIRED_MESSAGE : '');
    
    if (!hasErrors && !consentMissing) {
      setIsSubmitting(true);
      
      try {
        const formDataToSend = new FormData();
        
        formDataToSend.append('firstName', formData.firstName);
        formDataToSend.append('lastName', formData.lastName);
        formDataToSend.append('dateOfBirth', formData.dateOfBirth);
        formDataToSend.append('email', formData.email);
        formDataToSend.append('phoneNumber', formData.phoneNumber);
        formDataToSend.append('password', formData.password);
        formDataToSend.append('address', formData.localization);
        formDataToSend.append('bio', formData.bio);
        formDataToSend.append('termsAccepted', String(consentAccepted));
        formDataToSend.append('privacyAccepted', String(consentAccepted));
        
        // Dodajemy współrzędne geograficzne
        if (formData.lat !== undefined && formData.lon !== undefined) {
          formDataToSend.append('lat', formData.lat.toString());
          formDataToSend.append('lon', formData.lon.toString());
        }
        
        if (formData.profilePhoto) {
          formDataToSend.append('profilePhoto', formData.profilePhoto);
        }
        
        const response = await fetch(`${environment.apiUrl}/api/registerUser`, {
          method: 'POST',
          body: formDataToSend,
          mode: 'cors'
        });
        
        if (response.ok) {
          router.push('/register/success');
        } else {
          const errorData = await response.text();
          setSubmitMessage({
            type: 'error',
            text: describeApiError(errorData, `Błąd serwera: ${response.status}`)
          });
        }
        
      } catch (error) {
        console.error('Błąd rejestracji użytkownika:', error);
        setSubmitMessage({
          type: 'error',
          text: error instanceof Error && error.message 
            ? `Błąd: ${error.message}` 
            : 'Błąd połączenia z serwerem. Sprawdź połączenie internetowe.'
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Zakres daty urodzenia: 13–100 lat (ta sama reguła co walidacja pola)
  const dateLimits = (() => {
    const today = new Date();
    const max = new Date();
    max.setFullYear(today.getFullYear() - 13);
    const min = new Date();
    min.setFullYear(today.getFullYear() - 100);
    return { max: max.toISOString().split('T')[0], min: min.toISOString().split('T')[0] };
  })();

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Imię" name="firstName" autoComplete="given-name" value={formData.firstName} onChange={handleInputChange} onBlur={handleBlur} error={errors.firstName || undefined} />
        <Input label="Nazwisko" name="lastName" autoComplete="family-name" value={formData.lastName} onChange={handleInputChange} onBlur={handleBlur} error={errors.lastName || undefined} />
      </div>

      <Input
        label="Data urodzenia"
        type="date"
        name="dateOfBirth"
        autoComplete="bday"
        value={formData.dateOfBirth}
        onChange={handleInputChange}
        onBlur={handleBlur}
        max={dateLimits.max}
        min={dateLimits.min}
        error={errors.dateOfBirth || undefined}
        hint="Musisz mieć co najmniej 13 lat."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="E-mail" type="email" name="email" autoComplete="email" inputMode="email" value={formData.email} onChange={handleInputChange} onBlur={handleBlur} error={errors.email || undefined} leftIcon={<LuMail size={16} />} placeholder="ty@przyklad.pl" />
        <Input label="Numer telefonu" type="tel" name="phoneNumber" autoComplete="tel" value={formData.phoneNumber} onChange={handleInputChange} onBlur={handleBlur} error={errors.phoneNumber || undefined} leftIcon={<LuPhone size={16} />} />
      </div>

      <Input label="Hasło" type="password" name="password" autoComplete="new-password" value={formData.password} onChange={handleInputChange} onBlur={handleBlur} error={errors.password || undefined} hint="Co najmniej 6 znaków." leftIcon={<LuLock size={16} />} />

      <LocationField
        value={formData.localization}
        error={errors.localization}
        searching={locationSearching}
        suggestions={locationSuggestions}
        showSuggestions={showLocationSuggestions}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onSelectSuggestion={handleSuggestionSelect}
        onOpenMap={() => setIsLocationModalOpen(true)}
      />

      <Textarea
        label={<>Bio <span className="font-normal text-ink-subtle">(opcjonalnie)</span></>}
        name="bio"
        value={formData.bio}
        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
        placeholder="Opisz siebie w kilku słowach…"
        rows={3}
      />

      <PhotoDropzone
        label="Zdjęcie profilowe"
        changeLabel="Zmień zdjęcie"
        file={formData.profilePhoto}
        isDragOver={isDragOver}
        inputRef={fileInputRef}
        onFileChange={handleFileChange}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />

      <ConsentCheckbox
        checked={consentAccepted}
        error={consentError}
        onChange={(checked) => {
          setConsentAccepted(checked);
          if (checked) setConsentError('');
        }}
      />

      {submitMessage && (
        <AuthNotice tone={submitMessage.type === 'success' ? 'success' : 'danger'}>{submitMessage.text}</AuthNotice>
      )}

      <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
        {isSubmitting ? 'Wysyłanie…' : 'Załóż konto'}
      </Button>

      {/* Modal mapy lokalizacji */}
      {isLocationModalOpen && (
        <LocationMapModal
          initialLat={formData.lat}
          initialLon={formData.lon}
          onLocationSelect={handleLocationSelect}
          onClose={() => setIsLocationModalOpen(false)}
        />
      )}
    </form>
  );
}

// Komponent rejestracji firmy
function CompanyRegistrationForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: '',
    companyDescription: '',
    localization: '',
    lat: undefined as number | undefined,
    lon: undefined as number | undefined,
    socialLinks: [{ label: '', url: '' }] as Array<{ label: string; url: string }>,
    category: '',
    tags: '',
    companyLogo: null as File | null,
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: ''
  });

  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentError, setConsentError] = useState('');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const companyLogoInputRef = useRef<HTMLInputElement>(null);

  // Stan dla wyszukiwania lokalizacji
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSearching, setLocationSearching] = useState(false);
  const isMapUpdate = useRef(false);

  const [errors, setErrors] = useState({
    companyName: '',
    companyDescription: '',
    localization: '',
    category: '',
    tags: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: ''
  });

  const [touched, setTouched] = useState({
    companyName: false,
    companyDescription: false,
    localization: false,
    category: false,
    tags: false,
    firstName: false,
    lastName: false,
    email: false,
    phoneNumber: false,
    password: false
  });

  const [socialLinksErrors, setSocialLinksErrors] = useState<Array<{ label: string; url: string }>>([]);

  const categories = [
    'Restauracja', 'Kawiarnia', 'Pizzeria', 'Bar/Pub', 'Fast Food',
    'Catering', 'Piekarnia', 'Cukiernia', 'Sklep spożywczy', 'Inne'
  ];

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'companyName':
        return value.trim() === '' ? 'Nazwa firmy jest wymagana' : '';
      case 'companyDescription':
        return value.trim() === '' ? 'Informacje o firmie są wymagane' : '';
      case 'localization':
        return value.trim() === '' ? 'Lokalizacja jest wymagana' : '';
      case 'category':
        return value.trim() === '' ? 'Kategoria działalności jest wymagana' : '';
      case 'firstName':
        return value.trim() === '' ? 'Imię jest wymagane' : '';
      case 'lastName':
        return value.trim() === '' ? 'Nazwisko jest wymagane' : '';
      case 'email':
        if (value.trim() === '') return 'Email jest wymagany';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !emailRegex.test(value) ? 'Podaj prawidłowy adres email' : '';
      case 'phoneNumber':
        return value.trim() === '' ? 'Numer telefonu jest wymagany' : '';
      case 'password':
        if (value.trim() === '') return 'Hasło jest wymagane';
        if (value.length < 6) return 'Hasło musi mieć co najmniej 6 znaków';
        return '';
      case 'tags':
        if (value.trim() === '') return ''; // Tagi są opcjonalne
        const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
        if (tags.length > 5) return 'Maksymalnie 5 tagów jest dozwolonych';
        return '';
      default:
        return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (touched[name as keyof typeof touched]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, companyLogo: file }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setFormData(prev => ({ ...prev, companyLogo: file }));
      }
    }
  };

  // Walidacja linków społecznościowych
  const validateSocialLinks = () => {
    const newErrors: Array<{ label: string; url: string }> = [];
    
    formData.socialLinks.forEach((link, index) => {
      const labelFilled = link.label.trim() !== '';
      const urlFilled = link.url.trim() !== '';
      
      let labelError = '';
      let urlError = '';
      
      // Sprawdzenie zakazanych znaków w etykiecie
      if (labelFilled && (link.label.includes(',') || link.label.includes(';'))) {
        labelError = 'Etykieta nie może zawierać znaków "," lub ";"';
      }
      
      // Sprawdzenie zakazanych znaków w URL
      if (urlFilled && (link.url.includes(',') || link.url.includes(';'))) {
        urlError = 'Link nie może zawierać znaków "," lub ";"';
      }
      
      // Jeśli jedno pole jest wypełnione, drugie też musi być
      if (labelFilled && !urlFilled && !labelError) {
        urlError = 'Link jest wymagany gdy podano etykietę';
      } else if (!labelFilled && urlFilled && !urlError) {
        labelError = 'Etykieta jest wymagana gdy podano link';
      }
      
      // Walidacja URL jeśli jest wypełniony i nie ma innych błędów
      if (urlFilled && !urlError) {
        try {
          new URL(link.url);
        } catch {
          urlError = 'Podaj prawidłowy URL';
        }
      }
      
      newErrors[index] = { label: labelError, url: urlError };
    });
    
    setSocialLinksErrors(newErrors);
    return newErrors.some(error => error.label || error.url);
  };

  // Funkcje do obsługi dynamicznych linków społecznościowych
  const handleSocialLinkChange = (index: number, field: 'label' | 'url', value: string) => {
    setFormData(prev => {
      const newSocialLinks = [...prev.socialLinks];
      newSocialLinks[index] = { ...newSocialLinks[index], [field]: value };
      
      // Jeśli wypełniono jakiekolwiek pole w ostatnim linku i nie ma jeszcze 10 linków, dodaj nowy
      const lastIndex = newSocialLinks.length - 1;
      const lastLink = newSocialLinks[lastIndex];
      if ((lastLink.label || lastLink.url) && newSocialLinks.length < 10) {
        newSocialLinks.push({ label: '', url: '' });
      }
      
      return { ...prev, socialLinks: newSocialLinks };
    });
    
    // Waliduj linki po zmianie
    setTimeout(() => validateSocialLinks(), 0);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (touched[name as keyof typeof touched]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleLocationSelect = (lat: number, lon: number, address?: string) => {
    isMapUpdate.current = true;
    const locationText = address || `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    setFormData(prev => ({
      ...prev,
      localization: locationText,
      lat: lat,
      lon: lon
    }));
    setIsLocationModalOpen(false);
    setShowLocationSuggestions(false);
    
    // Walidacja po aktualizacji z mapy
    const error = validateField('localization', locationText);
    setErrors(prev => ({
      ...prev,
      localization: error
    }));
    setTouched(prev => ({
      ...prev,
      localization: true
    }));
  };

  // Funkcja wyszukiwania lokalizacji
  const searchLocation = useCallback(async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }
    try {
      setLocationSearching(true);
      const response = await fetch(`${environment.apiUrl}/geocode/search?text=${encodeURIComponent(query)}`, {
        method: 'GET',
        mode: 'cors'
      });
      if (response.ok) {
        const data: LocationSuggestion[] = await response.json();
        setLocationSuggestions(data);
        setShowLocationSuggestions(data.length > 0);
      } else {
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      }
    } catch (error) {
      console.error('Błąd połączenia z API lokalizacji:', error);
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    } finally {
      setLocationSearching(false);
    }
  }, []);

  // Debounced search dla lokalizacji
  useEffect(() => {
    // Jeśli to jest aktualizacja z mapy, zresetuj flagę i nie uruchamiaj wyszukiwania
    if (isMapUpdate.current) {
      isMapUpdate.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      if (formData.localization.length >= 3) {
        searchLocation(formData.localization);
      } else {
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [formData.localization, searchLocation]);

  // Funkcja do obsługi wyboru sugestii z listy
  const handleSuggestionSelect = (suggestion: LocationSuggestion) => {
    const locationText = suggestion.formatted;
    const { lon, lat } = suggestion;
    
    setFormData(prev => ({
      ...prev,
      localization: locationText,
      lat: lat,
      lon: lon
    }));
    setShowLocationSuggestions(false);
    
    // Walidacja po wyborze sugestii
    const error = validateField('localization', locationText);
    setErrors(prev => ({
      ...prev,
      localization: error
    }));
    setTouched(prev => ({
      ...prev,
      localization: true
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitMessage(null);

    if (currentStep === 1) {
      const newErrors = {
        ...errors,
        companyName: validateField('companyName', formData.companyName),
        companyDescription: validateField('companyDescription', formData.companyDescription),
        localization: validateField('localization', formData.localization),
        category: validateField('category', formData.category),
        tags: validateField('tags', formData.tags)
      };

      setTouched(prev => ({
        ...prev,
        companyName: true,
        companyDescription: true,
        localization: true,
        category: true,
        tags: true
      }));

      setErrors(newErrors);

      // Waliduj także linki społecznościowe
      const hasSocialLinksErrors = validateSocialLinks();

      // Sprawdź czy są jakieś błędy w pierwszym kroku
      const firstStepErrors = [newErrors.companyName, newErrors.companyDescription, newErrors.localization, newErrors.category, newErrors.tags];
      const hasErrors = firstStepErrors.some(error => error !== '') || hasSocialLinksErrors;

      if (!hasErrors) {
        setCurrentStep(2);
      }
      return;
    }

    const newErrors = {
      ...errors,
      firstName: validateField('firstName', formData.firstName),
      lastName: validateField('lastName', formData.lastName),
      email: validateField('email', formData.email),
      phoneNumber: validateField('phoneNumber', formData.phoneNumber),
      password: validateField('password', formData.password)
    };

    setTouched(prev => ({
      ...prev,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      password: true
    }));

    setErrors(newErrors);

    // Sprawdź czy użytkownik wybrał lokalizację na mapie (lat/lon wymagane)
    if (formData.lat === undefined || formData.lon === undefined) {
      setErrors(prev => ({
        ...prev,
        localization: 'Wybierz lokalizację z listy podpowiedzi, aby pobrać współrzędne'
      }));
      setCurrentStep(1);
      return;
    }

    const secondStepErrors = [newErrors.firstName, newErrors.lastName, newErrors.email, newErrors.phoneNumber, newErrors.password];
    const hasErrors = secondStepErrors.some(error => error !== '');
    // Zgoda jest wymagana — bez niej nie wysyłamy (backend i tak odrzuci z CONSENT_REQUIRED)
    const consentMissing = !consentAccepted;
    setConsentError(consentMissing ? CONSENT_REQUIRED_MESSAGE : '');

    if (!hasErrors && !consentMissing) {
      setIsSubmitting(true);

      try {
        const formDataToSend = new FormData();

        formDataToSend.append('companyName', formData.companyName);
        formDataToSend.append('companyDescription', formData.companyDescription);
        formDataToSend.append('address', formData.localization);
        
        // Dodajemy współrzędne geograficzne
        if (formData.lat !== undefined && formData.lon !== undefined) {
          formDataToSend.append('lat', formData.lat.toString());
          formDataToSend.append('lon', formData.lon.toString());
        }
        
        // Wysyłanie social links jako jeden string w formacie: etykieta1,link1;etykieta2,link2
        const validSocialLinks = formData.socialLinks.filter(link => link.label.trim() && link.url.trim());
        const socialLinksString = validSocialLinks
          .map(link => `${link.label.trim()},${link.url.trim()}`)
          .join(';');
        formDataToSend.append('socialLinks', socialLinksString);
        
        formDataToSend.append('category', formData.category);
        formDataToSend.append('tags', formData.tags);
        formDataToSend.append('firstName', formData.firstName);
        formDataToSend.append('lastName', formData.lastName);
        formDataToSend.append('email', formData.email);
        formDataToSend.append('phoneNumber', formData.phoneNumber);
        formDataToSend.append('password', formData.password);
        formDataToSend.append('address', formData.localization);
        formDataToSend.append('termsAccepted', String(consentAccepted));
        formDataToSend.append('privacyAccepted', String(consentAccepted));

        if (formData.companyLogo) {
          formDataToSend.append('companyLogo', formData.companyLogo);
        }

        const response = await fetch(`${environment.apiUrl}/api/registerCompany`, {
          method: 'POST',
          body: formDataToSend,
          mode: 'cors'
        });

        if (response.ok) {
          router.push('/register/success');
        } else {
          const errorData = await response.text();
          setSubmitMessage({
            type: 'error',
            text: describeApiError(errorData, `Błąd serwera: ${response.status}`)
          });
        }

              } catch (error) {
          console.error('Błąd rejestracji firmy:', error);
          setSubmitMessage({
            type: 'error',
            text: error instanceof Error && error.message 
              ? `Błąd: ${error.message}` 
              : 'Błąd połączenia z serwerem. Sprawdź połączenie internetowe.'
          });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const STEPS = ['Dane firmy', 'Osoba kontaktowa'];

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Postęp kroków */}
      <ol className="mb-2 grid grid-cols-2 gap-2" aria-label="Kroki rejestracji firmy">
        {STEPS.map((label, index) => {
          const step = index + 1;
          const state = step < currentStep ? 'done' : step === currentStep ? 'current' : 'todo';
          return (
            <li key={label} aria-current={state === 'current' ? 'step' : undefined}>
              <div className={cn('h-1 rounded-full', state === 'todo' ? 'bg-line' : 'bg-brand')} />
              <p className={cn('mt-1.5 text-xs font-medium', state === 'todo' ? 'text-ink-subtle' : 'text-ink')}>
                Krok {step}<span className="hidden sm:inline"> z {STEPS.length}</span> · {label}
              </p>
            </li>
          );
        })}
      </ol>

      {currentStep === 1 && (
        <>
          <Input label="Nazwa firmy" name="companyName" autoComplete="organization" value={formData.companyName} onChange={handleInputChange} onBlur={handleBlur} error={errors.companyName || undefined} />

          <Textarea
            label="Informacje o firmie"
            name="companyDescription"
            value={formData.companyDescription}
            onChange={handleTextareaChange}
            onBlur={handleBlur}
            rows={3}
            placeholder="Czym się zajmujecie, co zwykle oferujecie, godziny odbioru…"
            error={errors.companyDescription || undefined}
          />

          <LocationField
            value={formData.localization}
            error={errors.localization}
            hint="Wybierz adres z listy podpowiedzi albo na mapie — potrzebujemy współrzędnych."
            searching={locationSearching}
            suggestions={locationSuggestions}
            showSuggestions={showLocationSuggestions}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onSelectSuggestion={handleSuggestionSelect}
            onOpenMap={() => setIsLocationModalOpen(true)}
          />

          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-ink">Kategoria działalności</legend>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <Chip
                  key={category}
                  selected={formData.category === category}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, category }));
                    setTouched(prev => ({ ...prev, category: true }));
                    setErrors(prev => ({ ...prev, category: validateField('category', category) }));
                  }}
                >
                  {category}
                </Chip>
              ))}
            </div>
            {errors.category && (
              <p role="alert" className="mt-1 text-xs text-danger">
                {errors.category}
              </p>
            )}
          </fieldset>

          <Input
            label={<>Firmowe tagi <span className="font-normal text-ink-subtle">(opcjonalnie, max 5)</span></>}
            name="tags"
            value={formData.tags}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder="np. pieczywo, wypieki, wege"
            hint="Oddziel przecinkami."
            error={errors.tags || undefined}
          />

          <PhotoDropzone
            label="Logo firmy"
            changeLabel="Zmień logo"
            file={formData.companyLogo}
            isDragOver={isDragOver}
            inputRef={companyLogoInputRef}
            onFileChange={handleFileChange}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />

          {/* Linki społecznościowe / strona — kolejny wiersz pojawia się po wypełnieniu ostatniego */}
          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-ink">
              Linki społecznościowe / strona <span className="font-normal text-ink-subtle">(opcjonalnie)</span>
            </legend>
            <div className="space-y-2">
              {formData.socialLinks.map((link, index) => (
                <div key={index} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
                  <Input
                    aria-label={`Etykieta linku ${index + 1}`}
                    placeholder="np. Facebook"
                    value={link.label}
                    onChange={(e) => handleSocialLinkChange(index, 'label', e.target.value)}
                    error={socialLinksErrors[index]?.label || undefined}
                  />
                  <Input
                    aria-label={`Adres linku ${index + 1}`}
                    type="url"
                    inputMode="url"
                    placeholder="https://…"
                    value={link.url}
                    onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)}
                    error={socialLinksErrors[index]?.url || undefined}
                  />
                </div>
              ))}
            </div>
          </fieldset>
        </>
      )}

      {currentStep === 2 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Imię" name="firstName" autoComplete="given-name" value={formData.firstName} onChange={handleInputChange} onBlur={handleBlur} error={errors.firstName || undefined} />
            <Input label="Nazwisko" name="lastName" autoComplete="family-name" value={formData.lastName} onChange={handleInputChange} onBlur={handleBlur} error={errors.lastName || undefined} />
          </div>
          <Input label="E-mail" type="email" name="email" autoComplete="email" inputMode="email" value={formData.email} onChange={handleInputChange} onBlur={handleBlur} error={errors.email || undefined} leftIcon={<LuMail size={16} />} placeholder="sklep@przyklad.pl" />
          <Input label="Numer telefonu" type="tel" name="phoneNumber" autoComplete="tel" value={formData.phoneNumber} onChange={handleInputChange} onBlur={handleBlur} error={errors.phoneNumber || undefined} leftIcon={<LuPhone size={16} />} />
          <Input label="Hasło" type="password" name="password" autoComplete="new-password" value={formData.password} onChange={handleInputChange} onBlur={handleBlur} error={errors.password || undefined} hint="Co najmniej 6 znaków." leftIcon={<LuLock size={16} />} />

          <ConsentCheckbox
            checked={consentAccepted}
            error={consentError}
            onChange={(checked) => {
              setConsentAccepted(checked);
              if (checked) setConsentError('');
            }}
          />
        </>
      )}

      {submitMessage && (
        <AuthNotice tone={submitMessage.type === 'success' ? 'success' : 'danger'}>{submitMessage.text}</AuthNotice>
      )}

      <div className="flex gap-3">
        {currentStep === 2 && (
          <Button type="button" variant="secondary" size="lg" onClick={handleBack} className="flex-1">
            Wstecz
          </Button>
        )}
        <Button type="submit" size="lg" loading={isSubmitting} className="flex-[2]">
          {isSubmitting ? 'Wysyłanie…' : currentStep === 1 ? 'Dalej' : 'Załóż konto firmy'}
        </Button>
      </div>

      {/* Modal mapy lokalizacji */}
      {isLocationModalOpen && (
        <LocationMapModal
          initialLat={formData.lat}
          initialLon={formData.lon}
          onLocationSelect={handleLocationSelect}
          onClose={() => setIsLocationModalOpen(false)}
        />
      )}
    </form>
  );
}

export default function RegisterPage() {
  return (
    <AuthGuard requireAuth={false}>
      <RegisterPageContent />
    </AuthGuard>
  );
} 