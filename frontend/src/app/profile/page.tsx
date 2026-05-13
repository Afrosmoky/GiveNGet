"use client";

import React, { useState, useEffect } from 'react';
import { getUserData, authorizedFetch, logout, fetchCurrentUserData } from '../../utils/auth';
import { useSearchParams } from 'next/navigation'; 
import { environment } from '../../config';
import { getImageUrl } from '../../utils/imageUtils';
import { AuthGuard } from '../../components/AuthGuard';
import { ProfileDetailView } from '../../components/ProfileDetailView';
import { OrdersDetailView } from '../../components/OrdersDetailView';
import { NotificationsDetailView } from '../../components/NotificationsDetailView';
import { FavoritesDetailView } from '../../components/FavoritesDetailView';
import { MyOffersDetailView } from '../../components/MyOffersDetailView';
import { MdLocalOffer } from "react-icons/md";
import Image from 'next/image';
import { useScreenSize } from '../../config/breakpoints';
import UserRankBadge from '../../components/UserRankBadge';
import FreeOffersCounter from '../../components/FreeOffersCounter';

function ProfilePageContent() {
  const searchParams = useSearchParams();
  
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    userPhotoUrl: null as string | null,
    bio: '',
    userRank: 'STARTER' as string,
    trustPoints: 0,
    freeOffersCount: 5
  });
  
  const [currentView, setCurrentView] = useState<'main' | 'profile' | 'orders' | 'notifications' | 'favorites' | 'myOffers'>('main');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showContent, setShowContent] = useState(true);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Hook do sprawdzania rozmiaru ekranu
  const screenSize = useScreenSize();
  const isSmallScreen = screenSize === 'mobile';
  const isMediumScreen = screenSize === 'mobile' || screenSize === 'tablet';

  useEffect(() => {
    const user = getUserData();

    if (user) {
      setUserData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        userPhotoUrl: user.profilePhotoUrl || null,
        bio: user.bio || '',
        userRank: user.userRank || 'STARTER',
        trustPoints: user.trustPoints || 0,
        freeOffersCount: user.freeOffersCount || 5
      });
      
      // Pobierz aktualne dane użytkownika z backendu
      fetchCurrentUserData().then(() => {
        // Po pobraniu danych z backendu, zaktualizuj stan
        const updatedUser = getUserData();
        if (updatedUser) {
        setUserData({
          firstName: updatedUser.firstName || '',
          lastName: updatedUser.lastName || '',
          email: updatedUser.email || '',
          phoneNumber: updatedUser.phoneNumber || '',
          userPhotoUrl: updatedUser.profilePhotoUrl || null,
          bio: updatedUser.bio || '',
          userRank: updatedUser.userRank || 'STARTER',
          trustPoints: updatedUser.trustPoints || 0,
          freeOffersCount: updatedUser.freeOffersCount || 5
        });
        }
      });
    }
  }, []);

  // Obsługa parametru URL view
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'myOffers') {
      setCurrentView('myOffers');
    }
  }, [searchParams]);

  // Funkcja do generowania URL obrazków
  const profileImageUrl = getImageUrl(userData.userPhotoUrl);
    
  console.log('User photo URL:', userData.userPhotoUrl);
  console.log('Full profile image URL:', profileImageUrl);

  const handleProfileClick = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setShowContent(false);
    
    setTimeout(() => {
      setCurrentView('profile');
      setShowContent(true);
      setIsAnimating(false);
    }, 300);
  };

  const handleBackClick = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setShowContent(false);
    
    setTimeout(() => {
      setCurrentView('main');
      setShowContent(true);
      setIsAnimating(false);
    }, 300);
  };

  const handleOrdersClick = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setShowContent(false);
    
    setTimeout(() => {
      setCurrentView('orders');
      setShowContent(true);
      setIsAnimating(false);
    }, 300);
  };

  const handleNotificationsClick = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setShowContent(false);
    
    setTimeout(() => {
      setCurrentView('notifications');
      setShowContent(true);
      setIsAnimating(false);
    }, 300);
  };

  const handleFavoritesClick = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setShowContent(false);
    
    setTimeout(() => {
      setCurrentView('favorites');
      setShowContent(true);
      setIsAnimating(false);
    }, 300);
  };

  const handleMyOffersClick = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setShowContent(false);
    
    setTimeout(() => {
      setCurrentView('myOffers');
      setShowContent(true);
      setIsAnimating(false);
    }, 300);
  };

  const handlePhotoClick = () => {
    setShowPhotoUpload(true);
  };

  const handleAbortUpload = () => {
    setShowPhotoUpload(false);
    setSelectedPhoto(null);
    setIsDragOver(false);
  };

  // Usuwanie konta
  const openDeleteModal = () => {
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setShowDeleteModal(false);
    setDeleteError(null);
  };

  const confirmDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      setDeleteError(null);
      const response = await authorizedFetch(`${environment.apiUrl}/api/user/account`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || 'Nie udało się zainicjować usuwania konta');
      }
      setShowDeleteModal(false);
      // Wyloguj użytkownika po potwierdzeniu usunięcia
      logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login?message=account-deletion-started';
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Wystąpił błąd';
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedPhoto(file);
    }
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
        setSelectedPhoto(file);
      }
    }
  };

  const handleChangePhoto = async () => {
    if (!selectedPhoto) return;
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('profilePhoto', selectedPhoto);
      
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${environment.apiUrl}/api/user/uploadPhoto`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        mode: 'cors'
      });
      
      if (response.ok) {
        const newPhotoUrl = await response.text();
        console.log('New photo URL:', newPhotoUrl);
        localStorage.setItem('userPhotoUrl', newPhotoUrl);
        setUserData(prev => ({
          ...prev,
          userPhotoUrl: newPhotoUrl
        }));
        
        setShowPhotoUpload(false);
        setSelectedPhoto(null);
      } else {
        console.error('Błąd podczas zmiany zdjęcia profilowego');
      }
    } catch (error) {
      console.error('Błąd połączenia:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Funkcja do obliczania odpowiedniej wielkości czcionki na podstawie długości tekstu
  const calculateFontSize = (text: string): number => {
    const baseSize = 16;
    const maxCharacters = 8;
    
    if (text.length <= maxCharacters) {
      return baseSize;
    }
    
    // Oblicz proporcjonalną redukcję wielkości czcionki
    const reductionFactor = Math.max(0.6, maxCharacters / text.length);
    return Math.max(10, Math.floor(baseSize * reductionFactor));
  };

  // Funkcja do generowania stylów dla przycisków
  const getButtonStyle = () => {
    return {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      padding: isSmallScreen ? '20px 15px' : '40px 25px',
      borderRadius: '12px',
      backgroundColor: '#ffffff',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      transition: 'transform 0.2s',
      minWidth: isSmallScreen ? '100px' : '120px',
      maxWidth: isSmallScreen ? '120px' : '150px',
      flex: isSmallScreen ? '1 1 auto' : '0 0 auto'
    };
  };


  if (currentView === 'profile') {
    return (
      <div style={{
        opacity: showContent ? 1 : 0,
        transition: 'opacity 0.3s ease',
        minHeight: '400px',
        marginBottom: 48
      }}>
        <ProfileDetailView
          userData={userData}
          profileImageUrl={profileImageUrl}
          showPhotoUpload={showPhotoUpload}
          selectedPhoto={selectedPhoto}
          isDragOver={isDragOver}
          isUploading={isUploading}
          onBackClick={handleBackClick}
          onPhotoClick={handlePhotoClick}
          onAbortUpload={handleAbortUpload}
          onFileSelect={handleFileSelect}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onChangePhoto={handleChangePhoto}
        />
        {/* Sekcja: Usuń konto */}
        <div style={{ maxWidth: 800, width: '100%', margin: '24px auto 0 auto', padding: '0 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={openDeleteModal}
              style={{
                padding: '12px 20px',
                backgroundColor: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Usuń konto
            </button>
          </div>
        </div>

        {/* Modal potwierdzenia usunięcia */}
        {showDeleteModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <div style={{
              backgroundColor: '#fff', borderRadius: 16, padding: 24,
              width: '90%', maxWidth: 520
            }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1f2937' }}>Potwierdzenie usunięcia</h2>
              <p style={{ marginTop: 12, marginBottom: 8, color: '#374151' }}>
                Czy na pewno chcesz usunąć konto? Usunięcie zostanie zrealizowane po 14 dniach nieaktywności.
                Po kliknięciu przycisku <strong>Usuń konto</strong> zostaniesz natychmiast wylogowany.
              </p>
              {deleteError && (
                <div style={{ marginTop: 8, marginBottom: 8, color: '#b91c1c', fontSize: 13 }}>{deleteError}</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <button onClick={closeDeleteModal} disabled={isDeleting} style={{
                  padding: '10px 16px', background: '#e5e7eb', color: '#111827', border: 'none', borderRadius: 8,
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
                }}>Anuluj</button>
                <button onClick={confirmDeleteAccount} disabled={isDeleting} style={{
                  padding: '10px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8,
                  fontWeight: 700, cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.7 : 1
                }}>{isDeleting ? 'Usuwanie...' : 'Usuń konto'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (currentView === 'orders') {
    return (
      <div style={{
        minHeight: 'calc(100vh - 160px)',
        backgroundColor: '#f7fafc',
        padding: '40px 20px',
        opacity: showContent ? 1 : 0,
        transition: 'opacity 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '30px', position: 'relative' }}>
          <button
            onClick={handleBackClick}
            className="btn-icon"
            style={{ position: 'absolute', left: '0' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="#4a5568" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2d3748', margin: '0' }}>Orders</h1>
        </div>
        <OrdersDetailView userData={{ email: userData.email }} />
      </div>
    );
  }

  if (currentView === 'notifications') {
    return (
      <div style={{
        minHeight: 'calc(100vh - 160px)',
        backgroundColor: '#f7fafc',
        padding: '40px 20px',
        opacity: showContent ? 1 : 0,
        transition: 'opacity 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '30px', position: 'relative' }}>
          <button
            onClick={handleBackClick}
            className="btn-icon"
            style={{ position: 'absolute', left: '0' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="#4a5568" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2d3748', margin: '0' }}>Notifications</h1>
        </div>
        <NotificationsDetailView userData={{ email: userData.email }} />
      </div>
    );
  }

  if (currentView === 'favorites') {
    return (
      <div style={{
        minHeight: 'calc(100vh - 160px)',
        backgroundColor: '#f7fafc',
        padding: '40px 20px',
        opacity: showContent ? 1 : 0,
        transition: 'opacity 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '30px', position: 'relative' }}>
          <button
            onClick={handleBackClick}
            className="btn-icon"
            style={{ position: 'absolute', left: '0' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="#4a5568" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2d3748', margin: '0' }}>Favorites</h1>
        </div>
        <FavoritesDetailView userData={{ email: userData.email }} />
      </div>
    );
  }

  if (currentView === 'myOffers') {
    return (
      <div style={{
        minHeight: 'calc(100vh - 160px)',
        backgroundColor: '#f7fafc',
        padding: '40px 20px',
        opacity: showContent ? 1 : 0,
        transition: 'opacity 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '30px', position: 'relative' }}>
          <button
            onClick={handleBackClick}
            className="btn-icon"
            style={{ position: 'absolute', left: '0' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="#4a5568" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2d3748', margin: '0' }}>Moje oferty</h1>
        </div>
        <MyOffersDetailView />
      </div>
    );
  }

  // Main view
  return (
    <div style={{
      minHeight: 'calc(100vh - 160px)',
      backgroundColor: '#f7fafc',
      padding: '20px 10px',
      opacity: showContent ? 1 : 0,
      transition: 'opacity 0.3s ease'
    }}>
      <div style={{
        maxWidth: '800px',
        width: '100%',
        margin: '0 auto',
        padding: '0 10px'
      }}>
        {/* Main Content - Left and Right Layout */}
        <div
          style={{
            display: 'flex',
            flexDirection: isMediumScreen ? 'column' : 'row',
            gap: '20px',
            alignItems: isMediumScreen ? 'center' : 'flex-start',
            justifyContent: 'center',
            width: '100%'
          }}
        >
          {/* Left Side - Avatar with User Info */}
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
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              backgroundColor: '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              marginBottom: '20px',
              border: '3px solid white'
            }}>
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
                {userData.firstName || "Current User's"} {userData.lastName || "Name"}
              </div>
              <div style={{
                fontSize: '14px',
                color: '#718096',
                marginBottom: '16px'
              }}>
                {userData.email || "Current User's email"}
              </div>
              
              {/* Ranga użytkownika */}
              <div style={{ marginBottom: '12px' }}>
                <UserRankBadge 
                  rank={userData.userRank} 
                  trustPoints={userData.trustPoints}
                  showPoints={true}
                  size="medium"
                  clickable={true}
                />
              </div>
              
              {/* Licznik darmowych ofert */}
              <div>
                <FreeOffersCounter 
                  freeOffersCount={userData.freeOffersCount}
                  size="medium"
                />
              </div>
            </div>
          </div>

          {/* Right Side - My Account with Menu */}
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '30px 0'
            }}>
              <h1 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#2d3748',
                marginBottom: '30px',
                textAlign: 'center'
              }}>
                My Account
              </h1>

              {/* Menu buttons - responsive grid */}
              <div style={{
                display: 'flex',
                flexWrap: isSmallScreen ? 'wrap' : 'nowrap',
                gap: '15px',
                justifyContent: isMediumScreen ? 'center' : (isSmallScreen ? 'center' : 'flex-start'),
                overflowX: isSmallScreen ? 'visible' : 'auto'
              }}>
                <div 
                  style={getButtonStyle()}
                  onClick={handleProfileClick}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
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
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
                        fill="#4a5568"
                      />
                    </svg>
                  </div>
                  <span style={{
                    fontSize: `${calculateFontSize('Profile')}px`,
                    fontWeight: 'bold',
                    color: '#2d3748',
                    textAlign: 'center',
                    width: '100%',
                    wordWrap: 'break-word',
                    wordBreak: 'break-word',
                    lineHeight: '1.2',
                    hyphens: 'auto',
                  }}>
                    Profile
                  </span>
                </div>

                <div style={getButtonStyle()}
                onClick={handleOrdersClick}
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
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
                        fill="#4a5568"
                      />
                    </svg>
                  </div>
                  <span style={{
                    fontSize: `${calculateFontSize('Orders')}px`,
                    fontWeight: 'bold',
                    color: '#2d3748',
                    textAlign: 'center',
                    width: '100%',
                    wordWrap: 'break-word',
                    wordBreak: 'break-word',
                    lineHeight: '1.2',
                    hyphens: 'auto',
                  }}>
                    Orders
                  </span>
                </div>

                <div style={getButtonStyle()}
                onClick={handleNotificationsClick}
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
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12,2A2,2 0 0,1 14,4V5.5A6.5,6.5 0 0,1 20.5,12A6.5,6.5 0 0,1 14,18.5V20A2,2 0 0,1 12,22A2,2 0 0,1 10,20V18.5A6.5,6.5 0 0,1 3.5,12A6.5,6.5 0 0,1 10,5.5V4A2,2 0 0,1 12,2M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6Z"
                        fill="#4a5568"
                      />
                    </svg>
                  </div>
                  <span style={{
                    fontSize: `${calculateFontSize('Notifications')}px`,
                    fontWeight: 'bold',
                    color: '#2d3748',
                    textAlign: 'center',
                    width: '100%',
                    wordWrap: 'break-word',
                    wordBreak: 'break-word',
                    lineHeight: '1.2',
                    hyphens: 'auto',
                  }}>
                    Notifications
                  </span>
                </div>

                <div style={getButtonStyle()}
                onClick={handleFavoritesClick}
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
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z"
                        fill="#4a5568"
                      />
                    </svg>
                  </div>
                  <span style={{
                    fontSize: `${calculateFontSize('Favorites')}px`,
                    fontWeight: 'bold',
                    color: '#2d3748',
                    textAlign: 'center',
                    width: '100%',
                    wordWrap: 'break-word',
                    wordBreak: 'break-word',
                    lineHeight: '1.2',
                    hyphens: 'auto',
                  }}>
                    Favorites
                  </span>
                </div>

                <div style={getButtonStyle()}
                onClick={handleMyOffersClick}
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
                    <MdLocalOffer size={28} color="#4a5568" />
                  </div>
                  <span style={{
                    fontSize: `${calculateFontSize('My offers')}px`,
                    fontWeight: 'bold',
                    color: '#2d3748',
                    textAlign: 'center',
                    width: '100%',
                    wordWrap: 'break-word',
                    wordBreak: 'break-word',
                    lineHeight: '1.2',
                    hyphens: 'auto',
                  }}>
                    Moje oferty
                  </span>
                </div>
              </div>

              {/* Logout button - separate row, centered */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '30px',
                marginBottom: isSmallScreen ? '80px' : '20px'
              }}>
                <div style={getButtonStyle()}
                onClick={() => {
                  logout();
                  if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                  }
                }}
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
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.59L17 17L22 12L17 7ZM4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z"
                        fill="#ef4444"
                      />
                    </svg>
                  </div>
                  <span style={{
                    fontSize: `${calculateFontSize('Wyloguj')}px`,
                    fontWeight: 'bold',
                    color: '#ef4444',
                    textAlign: 'center',
                    width: '100%',
                    wordWrap: 'break-word',
                    wordBreak: 'break-word',
                    lineHeight: '1.2',
                    hyphens: 'auto',
                  }}>
                    Wyloguj
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfilePageContent />
    </AuthGuard>
  );
} 