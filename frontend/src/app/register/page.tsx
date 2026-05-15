"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaLocationCrosshairs } from 'react-icons/fa6';
import { environment } from '../../config';
import { AuthGuard } from '../../components/AuthGuard';
import LocationMapModal from '../../components/LocationMapModal';

// Typy rejestracji
type RegistrationType = 'user' | 'company';

// Interfejs dla sugestii lokalizacji
interface LocationSuggestion {
    country: string;
    country_code: string;
    state: string;
    county: string | null;
    city: string;
    lon: number;
    lat: number;
    formatted: string;
}

function RegisterPageContent() {
  const router = useRouter();
  const [registrationType, setRegistrationType] = useState<RegistrationType>('user');

  return (
          <div className="page-container">
      <div 
        className="form-container-wide"
        style={{
          maxWidth: registrationType === 'user' ? '500px' : '600px',
          transition: 'max-width 0.3s ease'
        }}
      >
        {/* Obrazek courier - nad logiem */}
        <div style={{
          width: '100%',
          marginTop: '20px',
          marginBottom: '20px',
          padding: '0'
        }}>
          <Image
            src="/images/courier.svg"
            alt="Courier"
            width={500}
            height={150}
            style={{ 
              objectFit: 'contain', 
              width: '100%', 
              height: 'auto',
              display: 'block'
            }}
          />
        </div>

        {/* Logo na górze */}
        <div className="flex justify-center mt-4 mb-5">
          <Image
            src="/images/logo.png"
            alt="ELocApp Logo"
            width={200}
            height={100}
            style={{ objectFit: 'contain' }}
          />
        </div>

        {/* Przełącznik typu rejestracji */}
        <div className="btn-toggle-container mb-8 px-10">
          <button
            onClick={() => setRegistrationType('user')}
            className={`btn-toggle ${registrationType === 'user' ? 'active' : 'inactive'}`}
          >
            Rejestracja użytkownika
          </button>
          <button
            onClick={() => setRegistrationType('company')}
            className={`btn-toggle ${registrationType === 'company' ? 'active' : 'inactive'}`}
          >
            Rejestracja firmy
          </button>
        </div>

        {/* Zawartość formularza */}
        <div className="px-10 pb-10">
          <div className="text-center mb-8 text-primary text-lg font-bold">
            {registrationType === 'user' ? 'Rejestracja konta użytkownika' : 'Rejestracja konta firmy'}
          </div>

          {registrationType === 'user' ? <UserRegistrationForm router={router} /> : <CompanyRegistrationForm />}

          {/* Link do logowania */}
          <div className="text-center mt-5">
            <Link
              href="/login"
              className="text-secondary text-sm"
              style={{ textDecoration: 'none' }}
            >
              Masz już konto? Zaloguj się
            </Link>
          </div>
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
    
    if (!hasErrors) {
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
            text: errorData || `Błąd serwera: ${response.status}`
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

  const handleDateInputMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    const rect = input.getBoundingClientRect();
    const iconStart = rect.right - 40; // Obszar 40px od prawej strony
    const iconEnd = rect.right - 8;
    const mouseX = e.clientX;

    if (mouseX >= iconStart && mouseX <= iconEnd) {
      input.classList.add('date-icon-hover');
    } else {
      input.classList.remove('date-icon-hover');
    }
  };

  const handleDateInputMouseLeave = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    input.classList.remove('date-icon-hover');
  };

  return (
    <>
      {/* Tekst motywacyjny dla rejestracji użytkownika */}
      <div className="text-center mb-8 text-primary text-base">
        Wymieniaj<br />
        jedzenie!
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-5">
          <label className="form-label">
            Imię
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="form-input"
            style={getInputStyle('firstName')}
            onFocus={(e) => handleInputFocus(e, 'firstName')}
          />
          {errors.firstName && (
            <div className="error-message">
              {errors.firstName}
            </div>
          )}
        </div>

        <div className="mb-5">
          <label className="form-label">
            Nazwisko
          </label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="form-input"
            style={getInputStyle('lastName')}
            onFocus={(e) => handleInputFocus(e, 'lastName')}
          />
          {errors.lastName && (
            <div className="error-message">
              {errors.lastName}
            </div>
          )}
        </div>

        <div className="mb-5">
          <label className="form-label">
            Data urodzenia
          </label>
          <input
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="form-input"
            style={getInputStyle('dateOfBirth')}
            onFocus={(e) => handleInputFocus(e, 'dateOfBirth')}
            onMouseMove={handleDateInputMouseMove}
            onMouseLeave={handleDateInputMouseLeave}
            max={(() => {
              const today = new Date();
              const maxDate = new Date();
              maxDate.setFullYear(today.getFullYear() - 13);
              return maxDate.toISOString().split('T')[0];
            })()}
            min={(() => {
              const today = new Date();
              const minDate = new Date();
              minDate.setFullYear(today.getFullYear() - 100);
              return minDate.toISOString().split('T')[0];
            })()}
          />
          {errors.dateOfBirth && (
            <div className="error-message">
              {errors.dateOfBirth}
            </div>
          )}
        </div>

        <div className="mb-5">
          <label className="form-label">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="form-input"
            style={getInputStyle('email')}
            onFocus={(e) => handleInputFocus(e, 'email')}
          />
          {errors.email && (
            <div className="error-message">
              {errors.email}
            </div>
          )}
        </div>

        <div className="mb-5">
          <label className="form-label">
            Numer telefonu
          </label>
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="form-input"
            style={getInputStyle('phoneNumber')}
            onFocus={(e) => handleInputFocus(e, 'phoneNumber')}
          />
          {errors.phoneNumber && (
            <div className="error-message">
              {errors.phoneNumber}
            </div>
          )}
        </div>

        <div className="mb-5">
          <label className="form-label">
            Hasło
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="form-input"
            style={getInputStyle('password')}
            onFocus={(e) => handleInputFocus(e, 'password')}
          />
          {errors.password && (
            <div className="error-message">
              {errors.password}
            </div>
          )}
        </div>

        <div className="mb-5">
          <label className="form-label">
            Lokalizacja
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              name="localization"
              value={formData.localization}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="Wprowadź lokalizację lub kliknij ikonę GPS"
              autoComplete="off"
              className="form-input"
              style={{
                ...getInputStyle('localization'),
                paddingRight: '50px' // Dodajemy padding po prawej dla ikony
              }}
              onFocus={(e) => handleInputFocus(e, 'localization')}
            />
            {locationSearching && (
              <div style={{
                position: 'absolute',
                right: '44px',
                top: '50%',
                transform: 'translateY(-50%)'
              }}>
                <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
              </div>
            )}
            <div
              className="location-icon"
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                color: '#6b7280',
                transition: 'color 0.2s, transform 0.2s',
                zIndex: 10
              }}
              onClick={() => setIsLocationModalOpen(true)}
              title="Wybierz lokalizację na mapie"
            >
              <FaLocationCrosshairs size={20} />
            </div>
            {showLocationSuggestions && (
              <div style={{
                position: 'absolute',
                zIndex: 20,
                width: '100%',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                maxHeight: '240px',
                overflowY: 'auto',
                marginTop: '4px'
              }}>
                {locationSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 16px',
                      border: 'none',
                      borderBottom: index < locationSuggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#2d3748'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {suggestion.formatted}
                  </button>
                ))}
              </div>
            )}
          </div>
          {errors.localization && (
            <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
              {errors.localization}
            </div>
          )}
        </div>

        {/* Pole Bio */}
        <div className="mb-5">
          <label className="form-label">
            Bio
          </label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="Opisz siebie w kilku słowach..."
            rows={3}
            style={{
              width: '100%',
              padding: '16px',
              border: 'none',
              borderBottom: '2px solid #e2e8f0',
              fontSize: '16px',
              backgroundColor: 'transparent',
              outline: 'none',
              transition: 'border-color 0.3s',
              color: '#2d3748',
              resize: 'vertical',
              minHeight: '80px'
            }}
            onFocus={(e) => {
              e.target.style.borderBottomColor = '#fbbf24';
            }}
            onBlur={(e) => {
              e.target.style.borderBottomColor = '#e2e8f0';
            }}
          />
        </div>

        {/* Sekcja zdjęcia profilowego */}
        <div className="mb-8">
          <label className="form-label">
            Zdjęcie profilowe
          </label>
          
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${isDragOver ? '#fbbf24' : '#e2e8f0'}`,
              borderRadius: '12px',
              padding: '30px 20px',
              textAlign: 'center',
              backgroundColor: isDragOver ? '#fffbeb' : '#f9fafb',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              position: 'relative'
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="text-sm text-secondary font-bold">
                {formData.profilePhoto ? 'Zmień zdjęcie' : 'Prześlij zdjęcie'}
              </div>
              <div className="text-xs text-secondary">
                Przeciągnij i upuść plik lub kliknij aby wybrać
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
          
          {formData.profilePhoto && (
            <div className="message-box success mt-3 text-center text-sm">
              <strong>Wybrano:</strong> {formData.profilePhoto.name}
            </div>
          )}
        </div>

        {/* Komunikat o wyniku wysyłania */}
        {submitMessage && (
          <div className={`message-box ${submitMessage.type} mb-5 text-center`}>
            {submitMessage.text}
          </div>
        )}

        {/* Przycisk Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`btn-primary ${isSubmitting ? 'btn-loading' : ''}`}
        >
          {isSubmitting && (
            <div className="loading-spinner" />
          )}
          {isSubmitting ? 'Wysyłanie...' : 'Send request'}
        </button>

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
    </>
  );
}

// Komponent rejestracji firmy
function CompanyRegistrationForm() {
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

    if (!hasErrors) {
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

        if (formData.companyLogo) {
          formDataToSend.append('companyLogo', formData.companyLogo);
        }

        const response = await fetch(`${environment.apiUrl}/api/registerCompany`, {
          method: 'POST',
          body: formDataToSend,
          mode: 'cors'
        });

        if (response.ok) {
          setSubmitMessage({
            type: 'success',
            text: 'Firma została zarejestrowana pomyślnie!'
          });
        } else {
          const errorData = await response.text();
          setSubmitMessage({
            type: 'error',
            text: errorData || `Błąd serwera: ${response.status}`
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

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>, fieldName: keyof typeof errors) => {
    if (!errors[fieldName]) {
      e.target.style.borderBottomColor = '#fbbf24';
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {currentStep === 1 && (
        <>
          {/* Nazwa firmy */}
                  <div className="mb-5">
          <label className="form-label-small">
            Nazwa firmy
          </label>
          <input
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="form-input"
            style={getInputStyle('companyName')}
            onFocus={(e) => handleInputFocus(e, 'companyName')}
          />
          {errors.companyName && (
            <div className="error-message">
              {errors.companyName}
            </div>
          )}
        </div>

          {/* Informacje o firmie */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#9ca3af',
              fontSize: '14px'
            }}>
              Informacje o firmie
            </label>
            <textarea
              name="companyDescription"
              value={formData.companyDescription}
              onChange={handleTextareaChange}
              onBlur={handleBlur}
              rows={1}
              style={{
                ...getInputStyle('companyDescription'),
                resize: 'none',
                overflow: 'hidden',
                minHeight: '50px'
              }}
              onFocus={(e) => handleInputFocus(e, 'companyDescription')}
            />
            {errors.companyDescription && (
              <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                {errors.companyDescription}
              </div>
            )}
          </div>

          {/* Lokalizacja */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#9ca3af',
              fontSize: '14px'
            }}>
              Lokalizacja
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                name="localization"
                value={formData.localization}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder="Wprowadź lokalizację lub kliknij ikonę GPS"
                autoComplete="off"
                className="form-input"
                style={{
                  ...getInputStyle('localization'),
                  paddingRight: '50px' // Dodajemy padding po prawej dla ikony
                }}
                onFocus={(e) => handleInputFocus(e, 'localization')}
              />
              {locationSearching && (
                <div style={{
                  position: 'absolute',
                  right: '44px',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}>
                  <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
                </div>
              )}
              <div
                className="location-icon"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  color: '#6b7280',
                  transition: 'color 0.2s, transform 0.2s',
                  zIndex: 10
                }}
                onClick={() => setIsLocationModalOpen(true)}
                title="Wybierz lokalizację na mapie"
              >
                <FaLocationCrosshairs size={20} />
              </div>
              {showLocationSuggestions && (
                <div style={{
                  position: 'absolute',
                  zIndex: 20,
                  width: '100%',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  maxHeight: '240px',
                  overflowY: 'auto',
                  marginTop: '4px'
                }}>
                  {locationSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 16px',
                        border: 'none',
                        borderBottom: index < locationSuggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#2d3748'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {suggestion.formatted}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.localization && (
              <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                {errors.localization}
              </div>
            )}
          </div>

          {/* Logo firmy */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#9ca3af',
              fontSize: '14px'
            }}>
              Logo firmy
            </label>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${isDragOver ? '#fbbf24' : '#e2e8f0'}`,
                borderRadius: '12px',
                padding: '30px 20px',
                textAlign: 'center',
                backgroundColor: isDragOver ? '#fffbeb' : '#f9fafb',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative'
              }}
              onClick={() => companyLogoInputRef.current?.click()}
            >
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#4a5568',
                  fontWeight: 'bold'
                }}>
                  {formData.companyLogo ? 'Zmień logo' : 'Prześlij zdjęcie'}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#4a5568'
                }}>
                  Przeciągnij i upuść plik lub kliknij aby wybrać
                </div>
              </div>

              <input
                ref={companyLogoInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            {formData.companyLogo && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#f0fff4',
                border: '1px solid #68d391',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '14px',
                color: '#2d3748'
              }}>
                <strong>Wybrano:</strong> {formData.companyLogo.name}
              </div>
            )}
          </div>

          {/* Linki społecznościowe / strona */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#9ca3af',
              fontSize: '14px'
            }}>
              linki społecznościowe / strona
            </label>
            {formData.socialLinks.map((link, index) => (
              <div key={index} style={{ marginBottom: '15px' }}>
                <div style={{ 
                  display: 'flex', 
                  gap: '10px', 
                  marginBottom: '5px' 
                }}>
                  <input
                    type="text"
                    placeholder="Etykieta, np. Facebook"
                    value={link.label}
                    onChange={(e) => handleSocialLinkChange(index, 'label', e.target.value)}
                    style={{
                      flex: '0 0 20%',
                      padding: '16px',
                      border: 'none',
                      borderBottom: `2px solid ${(socialLinksErrors[index]?.label) ? '#ef4444' : '#e2e8f0'}`,
                      fontSize: '14px',
                      backgroundColor: 'transparent',
                      outline: 'none',
                      transition: 'border-color 0.3s',
                      color: '#2d3748'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderBottomColor = '#fbbf24';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderBottomColor = (socialLinksErrors[index]?.label) ? '#ef4444' : '#e2e8f0';
                    }}
                  />
                  <input
                    type="url"
                    placeholder="Link, np. https://www.facebook.com/"
                    value={link.url}
                    onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)}
                    style={{
                      flex: '1',
                      padding: '16px',
                      border: 'none',
                      borderBottom: `2px solid ${(socialLinksErrors[index]?.url) ? '#ef4444' : '#e2e8f0'}`,
                      fontSize: '14px',
                      backgroundColor: 'transparent',
                      outline: 'none',
                      transition: 'border-color 0.3s',
                      color: '#2d3748'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderBottomColor = '#fbbf24';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderBottomColor = (socialLinksErrors[index]?.url) ? '#ef4444' : '#e2e8f0';
                    }}
                  />
                </div>
                {/* Wyświetlanie błędów dla tego wiersza */}
                {(socialLinksErrors[index]?.label || socialLinksErrors[index]?.url) && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '10px',
                    fontSize: '12px',
                    color: '#ef4444',
                    marginTop: '2px'
                  }}>
                    <div style={{ flex: '0 0 20%' }}>
                      {socialLinksErrors[index]?.label}
                    </div>
                    <div style={{ flex: '1' }}>
                      {socialLinksErrors[index]?.url}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Kategoria działalności */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#9ca3af',
              fontSize: '14px'
            }}>
              Kategoria działalności
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              onBlur={handleBlur}
              style={{
                width: '100%',
                padding: '16px',
                border: 'none',
                borderBottom: `2px solid ${errors.category ? '#ef4444' : '#e2e8f0'}`,
                fontSize: '16px',
                backgroundColor: 'transparent',
                outline: 'none',
                transition: 'border-color 0.3s',
                color: '#2d3748',
                cursor: 'pointer'
              }}
              onFocus={(e) => {
                if (!errors.category) {
                  e.target.style.borderBottomColor = '#fbbf24';
                }
              }}
            >
              <option value="" disabled>Wybierz kategorię</option>
              {categories.map((category, index) => (
                <option key={index} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {errors.category && (
              <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                {errors.category}
              </div>
            )}
          </div>

          {/* Firmowe tagi */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#9ca3af',
              fontSize: '14px'
            }}>
              Firmowe tagi (max 5)
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="np. fast food, pizza, dostawa..."
              style={getInputStyle('tags')}
              onFocus={(e) => handleInputFocus(e, 'tags')}
            />
            {errors.tags && (
              <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                {errors.tags}
              </div>
            )}
          </div>
        </>
      )}

      {currentStep === 2 && (
        <>
          {/* Imię */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#9ca3af',
              fontSize: '14px'
            }}>
              Imię
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              onBlur={handleBlur}
              style={getInputStyle('firstName')}
              onFocus={(e) => handleInputFocus(e, 'firstName')}
            />
            {errors.firstName && (
              <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                {errors.firstName}
              </div>
            )}
          </div>

          {/* Nazwisko */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#9ca3af',
              fontSize: '14px'
            }}>
              Nazwisko
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              onBlur={handleBlur}
              style={getInputStyle('lastName')}
              onFocus={(e) => handleInputFocus(e, 'lastName')}
            />
            {errors.lastName && (
              <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                {errors.lastName}
              </div>
            )}
          </div>

          {/* Email */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#9ca3af',
              fontSize: '14px'
            }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleBlur}
              style={getInputStyle('email')}
              onFocus={(e) => handleInputFocus(e, 'email')}
            />
            {errors.email && (
              <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                {errors.email}
              </div>
            )}
          </div>

          {/* Numer telefonu */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#9ca3af',
              fontSize: '14px'
            }}>
              Nr telefonu
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              onBlur={handleBlur}
              style={getInputStyle('phoneNumber')}
              onFocus={(e) => handleInputFocus(e, 'phoneNumber')}
            />
            {errors.phoneNumber && (
              <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                {errors.phoneNumber}
              </div>
            )}
          </div>

          {/* Hasło */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#9ca3af',
              fontSize: '14px'
            }}>
              Hasło
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              onBlur={handleBlur}
              style={getInputStyle('password')}
              onFocus={(e) => handleInputFocus(e, 'password')}
            />
            {errors.password && (
              <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                {errors.password}
              </div>
            )}
          </div>

          {/* Przycisk Wstecz dla kroku 2 */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={handleBack}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              Wstecz
            </button>
          </div>
        </>
      )}

      {/* Komunikat o wyniku wysyłania */}
      {submitMessage && (
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '20px',
          backgroundColor: submitMessage.type === 'success' ? '#f0fff4' : '#fef2f2',
          border: `1px solid ${submitMessage.type === 'success' ? '#68d391' : '#f87171'}`,
          color: submitMessage.type === 'success' ? '#2d3748' : '#dc2626',
          textAlign: 'center'
        }}>
          {submitMessage.text}
        </div>
      )}

      {/* Przycisk Następne/Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={`btn-primary ${isSubmitting ? 'btn-loading' : ''}`}
      >
        {isSubmitting && (
          <div className="loading-spinner" />
        )}
        {isSubmitting ? 'Wysyłanie...' : (currentStep === 1 ? 'Następne' : 'Send request')}
      </button>

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