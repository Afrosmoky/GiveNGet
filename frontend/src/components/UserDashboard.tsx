"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { environment } from '../config';
import { authorizedFetch, getUserData } from '../utils/auth';
import OfferTileSection from './OfferTileSection';
import { OfferTileProps } from '../types/offer';
import dynamic from 'next/dynamic';
import { useFavorites } from '../hooks/useFavorites';
import { useErrorContext } from '../context/ErrorContext';
import UserRankBadge from './UserRankBadge';
import FreeOffersCounter from './FreeOffersCounter';
import { LuArrowRight, LuCircleAlert, LuPlus, LuSearch } from 'react-icons/lu';
import { Button, Card, PageHeader, Spinner, buttonClasses, cn, pageContainer } from './ui';
import Link from 'next/link';

const GoogleMapComponent = dynamic(() => import('./GoogleMapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-surface-muted">
      <Spinner className="h-6 w-6 text-brand" label="Ładowanie mapy" />
    </div>
  ),
});

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
      // Pobierz najnowsze oferty
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
            console.error('Błąd pobierania najnowszych ofert:', response.status);
          }
        } catch (error) {
          console.error('Błąd połączenia przy pobieraniu ofert:', error);
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

  const firstName = getUserData()?.firstName;
  const hasUserInfo =
    Boolean(userInfo.userRank) || userInfo.trustPoints !== undefined || userInfo.freeOffersCount !== undefined;

  if (loading) {
    return (
      <div className={cn(pageContainer, 'flex min-h-[50vh] items-center justify-center py-8')}>
        <Spinner className="h-7 w-7 text-brand" label="Wczytywanie pulpitu" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(pageContainer, 'py-8')}>
        <Card padding="lg" role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
            <LuCircleAlert size={22} aria-hidden />
          </span>
          <h2 className="text-base font-semibold text-ink">Nie udało się wczytać pulpitu</h2>
          <p className="text-sm text-ink-muted">{error}</p>
          <Button onClick={() => window.location.reload()}>Spróbuj ponownie</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn(pageContainer, 'py-6 sm:py-8')}>
      <PageHeader
        title={firstName ? `Cześć, ${firstName}` : 'Twój pulpit'}
        description="Świeże oferty z Twojej okolicy."
        actions={
          <>
            <Button variant="secondary" href="/create-offer" leftIcon={<LuPlus size={16} />} className="flex-1 sm:flex-none">
              Dodaj ofertę
            </Button>
            <Button href="/offers/search" leftIcon={<LuSearch size={16} />} className="flex-1 sm:flex-none">
              Wyszukaj oferty
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-4 sm:gap-5">
        {/* Ranga i limit darmowych ofert */}
        {hasUserInfo && (
          <Card className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {userInfo.userRank && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink-muted">Twoja ranga</span>
                <UserRankBadge rank={userInfo.userRank} trustPoints={userInfo.trustPoints} showPoints size="medium" clickable />
              </div>
            )}
            {userInfo.freeOffersCount !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink-muted">W tym miesiącu</span>
                <FreeOffersCounter freeOffersCount={userInfo.freeOffersCount} size="medium" className="!items-start" />
              </div>
            )}
          </Card>
        )}

        {/* Mobile: podgląd mapy okolicy, pełny widok pod /offers/map */}
        {isMobileView && (
          <Card padding="none" className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <h2 className="text-base font-semibold text-ink">Na mapie</h2>
              <Link href="/offers/map" className={buttonClasses('ghost', 'sm')}>
                Pełna mapa <LuArrowRight size={14} aria-hidden />
              </Link>
            </div>
            <div className="h-56 w-full border-t border-line">
              <GoogleMapComponent userLocation={userLocation} offers={newestOffers} />
            </div>
          </Card>
        )}

        <OfferTileSection
          title="Najnowsze oferty w Twojej okolicy"
          offers={newestOffers}
          loading={loadingOffers}
          emptyMessage="Brak najnowszych ofert w Twojej okolicy"
          onFavoriteToggle={handleFavoriteToggle}
        />

        <OfferTileSection
          title="Polecane oferty"
          offers={recommendedOffers}
          loading={loadingRecommended}
          emptyMessage="Brak polecanych ofert"
          onFavoriteToggle={handleFavoriteToggle}
        />
      </div>
    </div>
  );
}
