import React, { useState } from 'react';
import { environment } from '../config';
import { authorizedFetch } from '../utils/auth';
import { EmailDetailView } from './EmailDetailView';
import { SecurityDetailView } from './SecurityDetailView';
import { AddressDetailView } from './AddressDetailView';
import { PaymentDetailView } from './PaymentDetailView';
import Image from 'next/image';
import { useScreenSize } from '../config/breakpoints';

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
  onBackClick: () => void;
  onPhotoClick: () => void;
  onAbortUpload: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onChangePhoto: () => void;
}

export const ProfileDetailView: React.FC<ProfileDetailViewProps> = ({
  userData,
  profileImageUrl,
  showPhotoUpload,
  selectedPhoto,
  isDragOver,
  isUploading,
  onBackClick,
  onPhotoClick,
  onAbortUpload,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onChangePhoto
}) => {
  
  // Hook do sprawdzania rozmiaru ekranu
  const screenSize = useScreenSize();
  const isSmallScreen = screenSize === 'mobile';
  const isMediumScreen = screenSize === 'mobile' || screenSize === 'tablet';
  
  // State dla formularza Personal Information
  const [personalData, setPersonalData] = useState({
    firstName: userData.firstName,
    lastName: userData.lastName,
    phoneNumber: userData.phoneNumber,
    bio: userData.bio || ''
  });

  // State dla formularza Password
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // State dla komunikatów
  const [messages, setMessages] = useState({
    personalInfo: { type: '', text: '' },
    password: { type: '', text: '' }
  });

  // State dla loading
  const [loading, setLoading] = useState({
    personalInfo: false,
    password: false
  });

  // State dla zarządzania widokami
  const [currentView, setCurrentView] = useState<'profile' | 'email' | 'security' | 'address' | 'payment'>('profile');
  
  // State dla animacji
  const [isAnimating, setIsAnimating] = useState(false);
  const [showContent, setShowContent] = useState(true);

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

  // Handlery dla przełączania widoków
  const handleEmailClick = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setShowContent(false);
    
    setTimeout(() => {
      setCurrentView('email');
      setShowContent(true);
      setIsAnimating(false);
    }, 300);
  };

  const handleSecurityClick = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setShowContent(false);
    
    setTimeout(() => {
      setCurrentView('security');
      setShowContent(true);
      setIsAnimating(false);
    }, 300);
  };

  const handleAddressClick = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setShowContent(false);
    
    setTimeout(() => {
      setCurrentView('address');
      setShowContent(true);
      setIsAnimating(false);
    }, 300);
  };

  const handlePaymentClick = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setShowContent(false);
    
    setTimeout(() => {
      setCurrentView('payment');
      setShowContent(true);
      setIsAnimating(false);
    }, 300);
  };

  const handleBackToProfile = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setShowContent(false);
    
    setTimeout(() => {
      setCurrentView('profile');
      setShowContent(true);
      setIsAnimating(false);
    }, 300);
  };

  // Funkcja do generowania stylów dla przycisków opcji
  const getOptionStyle = (optionName: string) => {
    const isActive = (
      (currentView === 'email' && optionName === 'Email') ||
      (currentView === 'security' && optionName === 'Security') ||
      (currentView === 'address' && optionName === 'Address') ||
      (currentView === 'payment' && optionName === 'Payment')
    );
    
    return {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      cursor: 'pointer',
      padding: isSmallScreen ? '20px 15px' : '40px 25px',
      borderRadius: '12px',
      backgroundColor: isActive ? '#f7fafc' : '#ffffff',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      transition: 'transform 0.2s',
      minWidth: isSmallScreen ? '100px' : '120px',
      maxWidth: isSmallScreen ? '120px' : '150px',
      flex: isSmallScreen ? '1 1 auto' : '0 0 auto',
      opacity: isActive ? 0.7 : 1
    };
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 160px)',
      backgroundColor: '#f7fafc',
      padding: '20px 10px',
      transition: 'opacity 0.3s ease'
    }}>
      <div style={{
        maxWidth: '800px',
        width: '100%',
        margin: '0 auto',
        padding: '0 10px'
      }}>
        {/* Main Content - Left and Right Layout */}
        <div style={{
          display: 'flex',
          flexDirection: isMediumScreen ? 'column' : 'row',
          gap: '20px',
          alignItems: isMediumScreen ? 'center' : 'flex-start',
          justifyContent: 'center',
          marginBottom: '30px',
          width: '100%'
        }}>
          {/* Left Side - Profile Picture with Upload */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: '300px',
            padding: '30px',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            border: '3px solid white',
            alignSelf: isMediumScreen ? 'center' : 'flex-start'
          }}>
            <div style={{
              position: 'relative',
              marginBottom: '20px',
              transition: 'all 0.3s ease'
            }}>
              {!showPhotoUpload ? (
                <div style={{ position: 'relative' }}>
                  <div 
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      backgroundColor: '#e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '3px solid white',
                      position: 'relative'
                    }}
                    onClick={onPhotoClick}
                  >
                    {profileImageUrl ? (
                       <Image
                        src={profileImageUrl}
                        alt="Profile"
                        width={120}
                        height={120}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#cbd5e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
                            fill="#a0aec0"
                          />
                        </svg>
                      </div>
                    )}
                    
                    {/* Upload Icon */}
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#fbbf24',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid white',
                      cursor: 'pointer'
                    }}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M21 15V19C21 19.5 20.5 20 20 20H4C3.5 20 3 19.5 3 19V15M17 8L12 3M12 3L7 8M12 3V15"
                          stroke="#1a202c"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  width: '200px',
                  padding: '20px',
                  border: `2px dashed ${isDragOver ? '#fbbf24' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  textAlign: 'center',
                  backgroundColor: isDragOver ? '#fffbeb' : '#f9fafb',
                  transition: 'all 0.3s ease'
                }}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                >
                  <div style={{
                    marginBottom: '16px',
                    color: '#4a5568',
                    fontSize: '14px'
                  }}>
                    {selectedPhoto ? `Selected: ${selectedPhoto.name}` : 'Drag & drop your photo here'}
                  </div>
                  
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onFileSelect}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      marginBottom: '16px'
                    }}
                  />
                  
                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'center'
                  }}>
                    <button
                      onClick={onAbortUpload}
                      className="btn-secondary"
                      style={{ fontSize: '14px', padding: '8px 16px' }}
                    >
                      Abort
                    </button>
                    <button
                      onClick={onChangePhoto}
                      disabled={!selectedPhoto || isUploading}
                      className={`btn-primary ${isUploading ? 'btn-loading' : ''}`}
                      style={{ fontSize: '14px', padding: '8px 16px' }}
                    >
                      {isUploading ? 'Uploading...' : 'Change photo'}
                    </button>
                  </div>
                        </div>
          )}
        </div>

            <div style={{
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#2d3748',
                marginBottom: '4px'
              }}>
                {userData.firstName || "Current User's"}
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#2d3748',
                marginBottom: '4px'
              }}>
                {userData.lastName || "Current User's"}
              </div>
              <div style={{
                fontSize: '14px',
                color: '#718096'
              }}>
                {userData.email || "Current User's email"}
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header z przyciskiem powrotu nad prawą sekcją */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '30px',
              position: 'relative'
            }}>
              <button
                onClick={currentView === 'email' ? handleBackToProfile : onBackClick}
                className="btn-icon"
                style={{ position: 'absolute', left: '0' }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M19 12H5M12 19L5 12L12 5"
                    stroke="#4a5568"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <h1 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#2d3748',
                margin: '0'
              }}>
                {currentView === 'email' ? 'Email' : 
                 currentView === 'security' ? 'Security' :
                 currentView === 'address' ? 'Address' :
                 currentView === 'payment' ? 'Payment' :
                 'My Profile'}
              </h1>
            </div>

            {/* Options w jednym rzędzie */}
            <div style={{
              display: 'flex',
              flexWrap: isSmallScreen ? 'wrap' : 'nowrap',
              gap: '15px',
              marginBottom: '30px',
              justifyContent: isMediumScreen ? 'center' : (isSmallScreen ? 'center' : 'flex-start'),
              overflowX: isSmallScreen ? 'visible' : 'auto'
            }}>
              {[
                { name: 'Email', icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="#4a5568" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 6L12 13L2 6" stroke="#4a5568" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ), onClick: handleEmailClick },
                { name: 'Security', icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="#4a5568" strokeWidth="2"/>
                    <circle cx="12" cy="16" r="1" fill="#4a5568"/>
                    <path d="M7 11V7A5 5 0 0 1 17 7V11" stroke="#4a5568" strokeWidth="2"/>
                  </svg>
                ), onClick: handleSecurityClick },
                { name: 'Address', icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 10C21 17 12 23 12 23S3 17 3 10A9 9 0 0 1 12 1A9 9 0 0 1 21 10Z" stroke="#4a5568" strokeWidth="2"/>
                    <circle cx="12" cy="10" r="3" stroke="#4a5568" strokeWidth="2"/>
                  </svg>
                ), onClick: handleAddressClick },
                { name: 'Payment', icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="#4a5568" strokeWidth="2"/>
                    <line x1="1" y1="10" x2="23" y2="10" stroke="#4a5568" strokeWidth="2"/>
                  </svg>
                ), onClick: handlePaymentClick }
                              ].map((option) => (
                <div key={option.name} style={getOptionStyle(option.name)}
                onClick={option.onClick || undefined}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                >
                  <div style={{
                    width: isSmallScreen ? '50px' : '60px',
                    height: isSmallScreen ? '50px' : '60px',
                    backgroundColor: '#f7fafc',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: isSmallScreen ? '12px' : '16px'
                  }}>
                    {option.icon}
                  </div>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#2d3748'
                  }}>
                    {option.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Animowany kontener dla sekcji */}
        <div style={{
          opacity: showContent ? 1 : 0,
          transition: 'opacity 0.3s ease',
          minHeight: '400px'
        }}>
          {/* Email Section - pokazuj tylko gdy currentView === 'email' */}
          {currentView === 'email' && (
            <EmailDetailView userData={{ email: userData.email }} />
          )}

          {/* Security Section - pokazuj tylko gdy currentView === 'security' */}
          {currentView === 'security' && (
            <SecurityDetailView userData={{ email: userData.email }} />
          )}

          {/* Address Section - pokazuj tylko gdy currentView === 'address' */}
          {currentView === 'address' && (
            <AddressDetailView userData={{ email: userData.email }} />
          )}

          {/* Payment Section - pokazuj tylko gdy currentView === 'payment' */}
          {currentView === 'payment' && (
            <PaymentDetailView userData={{ email: userData.email }} />
          )}

          {/* Personal Information Section - ukryj gdy currentView === 'email' */}
          {currentView === 'profile' && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '0',
          boxShadow: 'none',
          padding: '30px',
          marginBottom: '30px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#2d3748',
            marginBottom: '30px'
          }}>
            Personal Information
          </h2>
          
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#9ca3af',
                fontSize: '12px',
                textTransform: 'uppercase'
              }}>
                First name
              </label>
              <input
                type="text"
                name="firstName"
                value={personalData.firstName}
                onChange={handlePersonalDataChange}
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
            
            <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#9ca3af',
                fontSize: '12px',
                textTransform: 'uppercase'
              }}>
                Last name
              </label>
              <input
                type="text"
                name="lastName"
                value={personalData.lastName}
                onChange={handlePersonalDataChange}
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
            
            <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#9ca3af',
                fontSize: '12px',
                textTransform: 'uppercase'
              }}>
                Phone
              </label>
              <input
                type="text"
                name="phoneNumber"
                value={personalData.phoneNumber}
                onChange={handlePersonalDataChange}
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
          
          {/* Bio Section */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#9ca3af',
              fontSize: '12px',
              textTransform: 'uppercase'
            }}>
              Bio
            </label>
            <textarea
              name="bio"
              value={personalData.bio}
              onChange={handlePersonalDataChange}
              placeholder="Opisz siebie w kilku słowach..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: '#ffffff',
                color: '#2d3748',
                outline: 'none',
                resize: 'vertical',
                minHeight: '100px',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#fbbf24';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
              }}
            />
          </div>
          
          {/* Komunikat dla Personal Information */}
          {messages.personalInfo.text && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              backgroundColor: messages.personalInfo.type === 'success' ? '#f0fff4' : '#fef2f2',
              border: `1px solid ${messages.personalInfo.type === 'success' ? '#68d391' : '#f87171'}`,
              color: messages.personalInfo.type === 'success' ? '#2d3748' : '#dc2626',
              textAlign: 'center'
            }}>
              {messages.personalInfo.text}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={handleSavePersonalData}
              disabled={loading.personalInfo}
              className={`btn-primary ${loading.personalInfo ? 'btn-loading' : ''}`}
              style={{ width: '200px' }}
            >
              {loading.personalInfo && (
                <div className="loading-spinner" />
              )}
              {loading.personalInfo ? 'Zapisywanie...' : 'Save'}
            </button>
          </div>
        </div>
        )}

        {/* Password Section - ukryj gdy currentView === 'email' */}
        {currentView === 'profile' && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '0',
          boxShadow: 'none',
          padding: '30px'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#2d3748',
            marginBottom: '30px'
          }}>
            Password
          </h2>
          
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
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
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
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
            
            <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#9ca3af',
                fontSize: '12px',
                textTransform: 'uppercase'
              }}>
                New password
              </label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
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
            
            <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#9ca3af',
                fontSize: '12px',
                textTransform: 'uppercase'
              }}>
                Confirm password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
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
          
          {/* Komunikat dla Password */}
          {messages.password.text && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              backgroundColor: messages.password.type === 'success' ? '#f0fff4' : '#fef2f2',
              border: `1px solid ${messages.password.type === 'success' ? '#68d391' : '#f87171'}`,
              color: messages.password.type === 'success' ? '#2d3748' : '#dc2626',
              textAlign: 'center'
            }}>
              {messages.password.text}
            </div>
          )}
            
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={handleChangePassword}
              disabled={loading.password}
              style={{
                width: '200px',
                padding: '12px',
                backgroundColor: loading.password ? '#a0aec0' : '#fbbf24',
                color: '#1a202c',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading.password ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                if (!loading.password) {
                  e.currentTarget.style.backgroundColor = '#f59e0b';
                }
              }}
              onMouseOut={(e) => {
                if (!loading.password) {
                  e.currentTarget.style.backgroundColor = '#fbbf24';
                }
              }}
            >
              {loading.password && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #1a202c',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
              {loading.password ? 'Zmienianie...' : 'Change Password'}
            </button>
          </div>
        </div>
        )}
        </div>
      </div>
    </div>
  );
}; 