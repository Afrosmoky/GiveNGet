"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { environment } from '../config';
import { authorizedFetch, trackOfferClick } from '../utils/auth';
import { getImageUrl } from '../utils/imageUtils';
import OfferTileSection from './OfferTileSection';
import { OfferTileProps } from '../types/offer';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useFavorites } from '../hooks/useFavorites';
import { useErrorContext } from '../context/ErrorContext';
import UserRankBadge from './UserRankBadge';
import FreeOffersCounter from './FreeOffersCounter';

const GoogleMapComponent = dynamic(() => import('./GoogleMapComponent'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center">Ładowanie mapy...</div>
});

// Ikony nie są już potrzebne w tym komponencie - przeniesione do MobileHeader i MobileFooter

export function UserDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newestOffers, setNewestOffers] = useState<OfferTileProps[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [recommendedOffers, setRecommendedOffers] = useState<OfferTileProps[]>([]);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationAttempted, setLocationAttempted] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    userRank?: string;
    trustPoints?: number;
    freeOffersCount?: number;
  }>({});
  const fetchingRef = useRef(false);
  
  // Globalny stan ulubionych
  const { toggleFavorite } = useFavorites();
  const { addError } = useErrorContext();

  useEffect(() => {
    // Sprawdź czy jesteśmy na urządzeniu mobilnym
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        setIsMobileView(window.innerWidth < 768);
      }
    };
    
    checkMobile();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Zapobiegaj podwójnym zapytaniom
      if (fetchingRef.current) return;
      
      fetchingRef.current = true;
      try {
        setLoading(true);
        setError(null);
        
        
        const response = await authorizedFetch(`${environment.apiUrl}/api/user/dashboard`, {
          method: 'GET'
        });
        
        
        if (response.ok) {
          const dashboardData = await response.json();
          // Zapisz dane użytkownika do localStorage i stanu
          if (dashboardData.user) {
            const userData = dashboardData.user;
            setUserInfo({
              userRank: userData.userRank,
              trustPoints: userData.trustPoints,
              freeOffersCount: userData.freeOffersCount
            });
            
            if (userData.userRank) {
              localStorage.setItem('userRank', userData.userRank);
            }
            if (userData.trustPoints !== undefined) {
              localStorage.setItem('trustPoints', userData.trustPoints.toString());
            }
            if (userData.freeOffersCount !== undefined) {
              localStorage.setItem('freeOffersCount', userData.freeOffersCount.toString());
            }
          }
        } else if (response.status === 401) {
          console.log('Brak autoryzacji - przekierowuję na /unauthorized');
          router.push('/unauthorized');
          return;
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Błąd serwera:', errorData);
          setError(errorData.message || `Błąd serwera: ${response.status}`);
        }
        
      } catch (error) {
        console.error('Błąd połączenia:', error);
        setError('Błąd połączenia z serwerem. Sprawdź połączenie internetowe.');
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchDashboardData();
    
    // Pobierz lokalizację użytkownika
    const getUserLocation = () => {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lon: longitude });
            setLocationAttempted(true);
            console.log('Lokalizacja użytkownika:', { lat: latitude, lon: longitude });
          },
          (error) => {
            console.log('Błąd pobierania lokalizacji:', error.message);
            setUserLocation(null);
            setLocationAttempted(true);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      } else {
        console.log('Geolokalizacja nie jest obsługiwana');
        setUserLocation(null);
        setLocationAttempted(true);
      }
    };
    
    getUserLocation();
  }, [router]);

  // Pobierz oferty po próbie uzyskania lokalizacji
  useEffect(() => {
    // Pobierz oferty tylko gdy próba pobrania lokalizacji została zakończona
    if (locationAttempted) {
      // Pobierz najnowsze ogłoszenia
      const fetchNewestOffers = async () => {
        try {
          setLoadingOffers(true);
          let url = `${environment.apiUrl}/api/offer/newest`;
          
          // Dodaj parametry lokalizacji jeśli są dostępne
          if (userLocation) {
            url += `?lat=${userLocation.lat}&lon=${userLocation.lon}`;
          }
          
          const response = await authorizedFetch(url, {
            method: 'GET'
          });
          
          if (response.ok) {
            const offers = await response.json();
            setNewestOffers(offers);
          } else {
            console.error('Błąd pobierania najnowszych ogłoszeń:', response.status);
          }
        } catch (error) {
          console.error('Błąd połączenia przy pobieraniu ogłoszeń:', error);
        } finally {
          setLoadingOffers(false);
        }
      };
      
      // Pobierz polecane oferty
      const fetchRecommendedOffers = async () => {
        try {
          setLoadingRecommended(true);
          let url = `${environment.apiUrl}/api/offer/recommended`;
          
          // Dodaj parametry lokalizacji jeśli są dostępne
          if (userLocation) {
            url += `?lat=${userLocation.lat}&lon=${userLocation.lon}`;
          }
          
          const response = await authorizedFetch(url, {
            method: 'GET'
          });
          
          if (response.ok) {
            const offers = await response.json();
            setRecommendedOffers(offers);
          } else {
            console.error('Błąd pobierania polecanych ofert:', response.status);
          }
        } catch (error) {
          console.error('Błąd połączenia przy pobieraniu polecanych ofert:', error);
        } finally {
          setLoadingRecommended(false);
        }
      };
      
      // Pobierz oferty (z lokalizacją lub bez)
      fetchNewestOffers();
      fetchRecommendedOffers();
    }
  }, [locationAttempted, userLocation]);

  // Funkcja do aktualizacji ulubionych w obu sekcjach
  const handleFavoriteToggle = useCallback(async (offerId: string, currentIsFavorite: boolean) => {
    const newFavoriteState = await toggleFavorite(offerId, currentIsFavorite, addError);
    if (newFavoriteState !== undefined) {
      // Aktualizuj najnowsze oferty
      setNewestOffers(prevOffers => 
        prevOffers.map(offer => 
          offer.id === offerId 
            ? { ...offer, isFavorite: newFavoriteState }
            : offer
        )
      );
      
      // Aktualizuj polecane oferty
      setRecommendedOffers(prevOffers => 
        prevOffers.map(offer => 
          offer.id === offerId 
            ? { ...offer, isFavorite: newFavoriteState }
            : offer
        )
      );
    }
  }, [toggleFavorite, addError]);

  // Funkcje nawigacji dla widoku desktopowego
  const handleCreateOffer = () => {
    router.push('/create-offer');
  };

  const handleSearchOffers = () => {
    router.push('/offers/search');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 160px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f7fafc',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '500px',
          width: '100%'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #fbbf24',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <h2 style={{
            fontSize: '24px',
            color: '#2d3748',
            marginBottom: '8px'
          }}>
            Ładowanie dashboard...
          </h2>
          <p style={{
            color: '#4a5568',
            fontSize: '16px'
          }}>
            Pobieramy Twoje dane z serwera
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 160px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f7fafc',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '500px',
          width: '100%'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#f87171',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 style={{
            fontSize: '24px',
            color: '#dc2626',
            marginBottom: '16px'
          }}>
            Błąd ładowania
          </h2>
          <p style={{
            color: '#4a5568',
            fontSize: '16px',
            marginBottom: '30px',
            lineHeight: '1.5'
          }}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#fbbf24',
              color: '#1a202c',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fbbf24'}
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  // Widok mobilny - nowy układ: tytuł -> mapa -> lista ofert
  if (isMobileView) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Tytuł na górze */}
        <div className="bg-white p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">
            Najnowsze ogłoszenia w Twojej okolicy
          </h2>
        </div>

        {/* Mapa Google na całą szerokość */}
        <div className="w-full h-64 bg-gray-100">
          <GoogleMapComponent
            userLocation={userLocation}
            offers={newestOffers}
          />
        </div>

        {/* Lista ofert */}
        <div className="flex-1 bg-gray-50 p-4">
          {loadingOffers ? (
            <div className="flex justify-center items-center p-4">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-yellow-400 rounded-full animate-spin"></div>
            </div>
          ) : newestOffers.length === 0 ? (
            <p className="text-gray-600 text-center p-4">Brak ofert w okolicy</p>
          ) : (
            <div className="space-y-3">
              {newestOffers.slice(0, 10).map((offer) => (
                <div
                  key={offer.id}
                  className="mobile-offer-card"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      trackOfferClick(offer.id);
                      router.push(`/offers/${offer.id}/${offer.name}`);
                    }
                  }}
                >
                  <div className="mobile-offer-image">
                    <Image
                      src={getImageUrl(offer.imageUrl)}
                      width={100}
                      height={100}
                      alt={offer.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="mobile-offer-content">
                    <h3 className="mobile-offer-title">
                      {offer.name}
                    </h3>
                    <div className="mobile-offer-details">
                      <span className="mobile-offer-type">
                        {offer.transactionType === 'free' ? 'Za darmo' : 
                         offer.transactionType === 'sale' ? 'Na sprzedaż' : 'Wymiana'}
                      </span>
                      {offer.distance && (
                        <span>{offer.distance}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Widok desktopowy - oryginalny układ
  return (
    <div className="min-h-[calc(100vh-160px)] bg-gray-50 p-2 sm:p-5">
      <div className="max-w-6xl mx-auto w-full">

        {/* Informacje o użytkowniku */}
        {(userInfo.userRank || userInfo.trustPoints !== undefined || userInfo.freeOffersCount !== undefined) && (
          <div className="mb-5 sm:mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              {userInfo.userRank && (
                <UserRankBadge 
                  rank={userInfo.userRank} 
                  trustPoints={userInfo.trustPoints}
                  showPoints={true}
                  size="medium"
                  clickable={true}
                />
              )}
              {userInfo.freeOffersCount !== undefined && (
                <FreeOffersCounter 
                  freeOffersCount={userInfo.freeOffersCount}
                  size="medium"
                />
              )}
            </div>
          </div>
        )}

        {/* Przyciski akcji */}
        <div className="mb-5 sm:mb-8 text-center flex justify-center gap-3 sm:gap-5 flex-wrap">
          <button
            onClick={handleCreateOffer}
            className="w-full sm:w-auto px-5 sm:px-8 py-3 sm:py-4 bg-yellow-400 text-gray-900 border-none rounded-xl text-base sm:text-lg font-bold cursor-pointer transition-all duration-300 ease-in-out shadow-md hover:bg-yellow-500 hover:-translate-y-0.5 hover:shadow-lg"
          >
            Dodaj ogłoszenie
          </button>
          <button
            onClick={handleSearchOffers}
            className="w-full sm:w-auto px-5 sm:px-8 py-3 sm:py-4 bg-blue-500 text-white border-none rounded-xl text-base sm:text-lg font-bold cursor-pointer transition-all duration-300 ease-in-out shadow-md hover:bg-blue-600 hover:-translate-y-0.5 hover:shadow-lg"
          >
            Wyszukaj oferty
          </button>
        </div>

        <OfferTileSection
          title="Najnowsze ogłoszenia w Twojej okolicy"
          offers={newestOffers}
          loading={loadingOffers}
          emptyMessage="Brak najnowszych ogłoszeń w Twojej okolicy"
          onFavoriteToggle={handleFavoriteToggle}
        />

        <OfferTileSection
          title="Polecane oferty"
          offers={recommendedOffers}
          loading={loadingRecommended}
          emptyMessage="Brak polecanych ofert"
          marginTop={20}
          onFavoriteToggle={handleFavoriteToggle}
        />
      </div>

    </div>
  );
} 