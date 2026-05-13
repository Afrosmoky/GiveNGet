"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { environment } from '../../../config';
import { authorizedFetch, getUserLocation, updateUserData, trackOfferClick } from '../../../utils/auth';
import { getImageUrl } from '../../../utils/imageUtils';
import { AuthGuard } from '../../../components/AuthGuard';
import GoogleMapComponent from '../../../components/GoogleMapComponent';
import { useFavorites } from '../../../hooks/useFavorites';
import { useErrorContext } from '../../../context/ErrorContext';
import FavoriteHeart from '../../../components/FavoriteHeart';
import Image from 'next/image';
import { FaLocationCrosshairs } from 'react-icons/fa6';
import { ApiOffer, TransactionType, Category } from '../../../types/offer';

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

// Używamy ApiOffer zamiast lokalnego interfejsu Offer

interface SearchFilters {
  lat?: number;
  lon?: number;
  range?: number;
  distanceUnit?: 'KILOMETERS' | 'MILES';
  transactionTypes: TransactionType[];
  categoryIds: number[];
  subcategoryIds: number[];
}

function SearchOffersPageContent() {
  const router = useRouter();
  const isGpsUpdate = useRef(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [offers, setOffers] = useState<ApiOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isMapCollapsed, setIsMapCollapsed] = useState(false);
  const fetchingCategoriesRef = useRef(false);
  const searchingOffersRef = useRef(false);
  
  // Obsługa ulubionych
  const { toggleFavorite, loading: favoriteLoading } = useFavorites();
  const { addError } = useErrorContext();

  // Stan dla wyszukiwania lokalizacji
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationInput, setLocationInput] = useState('');

  // Filtry wyszukiwania
  const [filters, setFilters] = useState<SearchFilters>({
    range: 10,
    distanceUnit: 'KILOMETERS',
    transactionTypes: [],
    categoryIds: [],
    subcategoryIds: []
  });



  const [errors, setErrors] = useState({
    location: '',
    range: '',
    distanceUnit: ''
  });

  const validate = () => {
    const newErrors = {
      location: '',
      range: '',
      distanceUnit: '',
    };

    if (filters.lat === undefined || filters.lon === undefined) {
      newErrors.location = 'Lokalizacja jest wymagana.';
    }

    if (!filters.range || filters.range <= 0) {
      newErrors.range = 'Zasięg jest wymagany.';
    }

    if (!filters.distanceUnit) {
      newErrors.distanceUnit = 'Jednostka jest wymagana.';
    }

    setErrors(newErrors);
    return Object.values(newErrors).every(error => error === '');
  };

  // Pobieranie kategorii
  useEffect(() => {
    const fetchCategories = async () => {
      // Zapobiegaj podwójnym zapytaniom
      if (fetchingCategoriesRef.current) return;
      
      fetchingCategoriesRef.current = true;
      try {
        setLoading(true);
        setError(null);
        
        const response = await authorizedFetch(`${environment.apiUrl}/api/categories/all`, {
          method: 'GET'
        });
        
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        } else {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.message || `Błąd serwera: ${response.status}`);
        }
        
      } catch (error) {
        console.error('Błąd połączenia:', error);
        setError('Błąd połączenia z serwerem. Sprawdź połączenie internetowe.');
      } finally {
        setLoading(false);
        fetchingCategoriesRef.current = false;
      }
    };

    fetchCategories();
  }, []);

  // Wczytywanie stanu mapy z localStorage
  useEffect(() => {
    const savedCollapsedState = getMapCollapsedState();
    setIsMapCollapsed(savedCollapsedState);
  }, []);

  // Funkcja pobierania aktualnej lokalizacji GPS
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          isGpsUpdate.current = true;
          const { latitude, longitude } = position.coords;
          
          // Zapisz lokalizację w localStorage, aby była dostępna dla mapy
          updateUserData({ lat: latitude, lon: longitude });
          
          try {
            // Reverse geocoding - pobierz nazwę lokalizacji z współrzędnych
            const response = await authorizedFetch(`${environment.apiUrl}/api/geocode/reverse?lat=${latitude}&lon=${longitude}`, {
              method: 'GET'
            });

            if (response.ok) {
              const data: LocationSuggestion = await response.json();
              
              if (data.formatted) {
                const displayName = data.formatted;
                
                setLocationInput(displayName);
                setFilters(prev => ({
                  ...prev,
                  lat: latitude,
                  lon: longitude
                }));
                
                console.log('Współrzędne GPS:', `${longitude}, ${latitude}`);
                console.log('Nazwa lokalizacji:', displayName);
              } else {
                // Fallback - jeśli nie udało się pobrać nazwy, użyj współrzędnych
                setLocationInput(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                setFilters(prev => ({
                  ...prev,
                  lat: latitude,
                  lon: longitude
                }));
                console.log('Współrzędne GPS (bez nazwy):', `${longitude}, ${latitude}`);
              }
            } else {
              console.error('Błąd reverse geocoding:', response.status);
              // Fallback - użyj współrzędnych
              setLocationInput(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
              setFilters(prev => ({
                ...prev,
                lat: latitude,
                lon: longitude
              }));
              console.log('Współrzędne GPS (błąd API):', `${longitude}, ${latitude}`);
            }
          } catch (error) {
            console.error('Błąd połączenia podczas reverse geocoding:', error);
            // Fallback - użyj współrzędnych
            setLocationInput(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            setFilters(prev => ({
              ...prev,
              lat: latitude,
              lon: longitude
            }));
          }
          
          setShowLocationSuggestions(false);
        },
        (error) => {
          console.error('Błąd geolokalizacji:', error);
          setError('Nie udało się pobrać lokalizacji GPS. Sprawdź uprawnienia w przeglądarce.');
        }
      );
    } else {
      setError('Geolokalizacja nie jest wspierana przez Twoją przeglądarkę.');
    }
  };

  // Funkcje do zarządzania stanem mapy w localStorage
  const getMapCollapsedState = (): boolean => {
    try {
      const saved = localStorage.getItem('offersMapCollapsed');
      return saved ? JSON.parse(saved) : false;
    } catch (error) {
      console.error('Błąd odczytu stanu mapy z localStorage:', error);
      return false;
    }
  };

  const setMapCollapsedState = (collapsed: boolean) => {
    try {
      localStorage.setItem('offersMapCollapsed', JSON.stringify(collapsed));
    } catch (error) {
      console.error('Błąd zapisu stanu mapy do localStorage:', error);
    }
  };

  const toggleMapCollapse = () => {
    const newState = !isMapCollapsed;
    setIsMapCollapsed(newState);
    setMapCollapsedState(newState);
  };

  // Wyszukiwanie lokalizacji
  const searchLocation = useCallback(async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    try {
      setLocationSearching(true);
      // Używamy proxy na backendzie, żeby ukryć klucz API
      const response = await authorizedFetch(`${environment.apiUrl}/api/geocode/search?text=${encodeURIComponent(query)}`, {
        method: 'GET'
      });

      if (response.ok) {
        const data: LocationSuggestion[] = await response.json();
        setLocationSuggestions(data);
        setShowLocationSuggestions(data.length > 0);

      } else {
        console.error('Błąd wyszukiwania lokalizacji:', response.status);
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
    // Jeśli to jest aktualizacja z GPS, zresetuj flagę i nie uruchamiaj wyszukiwania.
    if (isGpsUpdate.current) {
      isGpsUpdate.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      if (locationInput.length >= 3) {
        searchLocation(locationInput);
      } else {
        if (locationInput.length === 0) {
            setFilters(prev => ({...prev, lat: undefined, lon: undefined}));
        }
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [locationInput, searchLocation]);

  const handleLocationSelect = (suggestion: LocationSuggestion) => {
    const displayName = suggestion.formatted;
    
    setLocationInput(displayName);
    setFilters(prev => ({
      ...prev,
      lat: suggestion.lat,
      lon: suggestion.lon
    }));
    
    setShowLocationSuggestions(false);
  };

  // Obsługa filtrów
  const handleTransactionTypeToggle = (type: TransactionType) => {
    setFilters(prev => ({
      ...prev,
      transactionTypes: prev.transactionTypes.includes(type)
        ? prev.transactionTypes.filter(t => t !== type)
        : [...prev.transactionTypes, type]
    }));
  };

  const handleCategoryToggle = (categoryId: number) => {
    setFilters(prev => {
      const isSelected = prev.categoryIds.includes(categoryId);
      const newCategoryIds = isSelected
        ? prev.categoryIds.filter(id => id !== categoryId)
        : [...prev.categoryIds, categoryId];
      
      // Usuń podkategorie, które nie należą do wybranych kategorii
      const selectedCategories = categories.filter(cat => newCategoryIds.includes(cat.id));
      const validSubcategoryIds = selectedCategories.flatMap(cat => cat.subcategories.map(sub => sub.id));
      const newSubcategoryIds = prev.subcategoryIds.filter(id => validSubcategoryIds.includes(id));
      
      return {
        ...prev,
        categoryIds: newCategoryIds,
        subcategoryIds: newSubcategoryIds
      };
    });
  };

  const handleSubcategoryToggle = (subcategoryId: number) => {
    setFilters(prev => ({
      ...prev,
      subcategoryIds: prev.subcategoryIds.includes(subcategoryId)
        ? prev.subcategoryIds.filter(id => id !== subcategoryId)
        : [...prev.subcategoryIds, subcategoryId]
    }));
  };

  // Wyszukiwanie ofert
  const handleSearch = async () => {
    if (!validate()) {
      return;
    }

    // Zapobiegaj podwójnym zapytaniom
    if (searchingOffersRef.current) return;
    
    searchingOffersRef.current = true;
    try {
      setSearching(true);
      setError(null);

      const params = new URLSearchParams();
      
      if (filters.lat !== undefined) params.append('lat', filters.lat.toString());
      if (filters.lon !== undefined) params.append('lon', filters.lon.toString());
      if (filters.range !== undefined) params.append('range', filters.range.toString());
      if (filters.distanceUnit) params.append('distanceUnit', filters.distanceUnit);
      
      filters.transactionTypes.forEach(type => params.append('transactionType', type));
      filters.categoryIds.forEach(id => params.append('categoryId', id.toString()));
      filters.subcategoryIds.forEach(id => params.append('subcategoryId', id.toString()));

      const response = await authorizedFetch(`${environment.apiUrl}/api/offer?${params.toString()}`, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data);
        setOffers(data);
        setShowMap(true); // Pokaż mapę po wyszukiwaniu
      } else {
        const errorData = await response.text();
        setError(errorData);
      }
    } catch (error) {
      console.error('Błąd wyszukiwania:', error);
      setError('Błąd połączenia z serwerem podczas wyszukiwania.');
    } finally {
      setSearching(false);
      searchingOffersRef.current = false;
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'free': return 'Za darmo';
      case 'exchange': return 'Wymiana';
      case 'sale': return 'Sprzedaż';
      default: return type;
    }
  };

  const handleOfferClick = (offer: ApiOffer) => {
    // Zapisz kliknięcie w ofertę dla statystyk CTR
    trackOfferClick(offer.id);
    
    // Konwertuj nazwę na URL-friendly format (usunąć spacje, znaki specjalne)
    const urlName = offer.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Usuń znaki specjalne
      .replace(/\s+/g, '-') // Zamień spacje na myślniki
      .replace(/-+/g, '-') // Usuń wielokrotne myślniki
      .trim();
    
    router.push(`/offers/${offer.id}/${urlName}`);
  };

  const handleFavoriteClick = async (offer: ApiOffer, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newFavoriteState = await toggleFavorite(offer.id, offer.isFavorite || false, addError);
    if (newFavoriteState !== undefined) {
      setOffers(prevOffers => 
        prevOffers.map(o => 
          o.id === offer.id 
            ? { ...o, isFavorite: newFavoriteState }
            : o
        )
      );
    }
  };

  // Pobierz wszystkie podkategorie z wybranych kategorii
  const selectedSubcategories = categories
    .filter(cat => filters.categoryIds.includes(cat.id))
    .flatMap(cat => cat.subcategories);

  // Przygotuj oferty do mapy (pełny URL i liczby lat/lon) i odwróć kolejność renderowania
  const offersForMap = offers.map(offer => ({
    ...offer,
    lat: typeof offer.lat === 'string' ? parseFloat(offer.lat) : offer.lat,
    lon: typeof offer.lon === 'string' ? parseFloat(offer.lon) : offer.lon,
    imageUrl: offer.imageUrl
  }))
  .filter(offer => offer.lat && offer.lon)
  .reverse(); // Odwróć kolejność - pierwsze oferty z response'a będą rysowane na końcu (na wierzchu)

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex justify-center items-center h-64">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 md:px-6">
        <div className="header-with-back">
          <h1 className="page-title">Wyszukaj oferty</h1>
        </div>

        {error && (
          <div className="message-box error mb-4">
            {error}
          </div>
        )}

        {/* Filtry */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
          <h2 className="section-title mb-4">Filtry wyszukiwania</h2>

          {/* Lokalizacja */}
          <div className="mb-4 sm:mb-6">
            <label className="form-label">Lokalizacja</label>
            <div className="relative">
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="Wpisz nazwę miasta lub miejscowości lub kliknij ikonę GPS"
                className="form-input w-full pr-12 sm:pr-14"
              />
              <div
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 transition-all duration-200 hover:text-yellow-400 hover:scale-110 z-10"
                onClick={getCurrentLocation}
                title="Użyj mojej lokalizacji GPS"
              >
                <FaLocationCrosshairs size={20} />
              </div>
              {locationSearching && (
                <div className="absolute right-12 sm:right-14 top-1/2 transform -translate-y-1/2">
                  <div className="loading-spinner w-4 h-4"></div>
                </div>
              )}
              {showLocationSuggestions && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {locationSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleLocationSelect(suggestion)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium">{suggestion.formatted}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
          </div>

          {/* Zasięg i jednostka */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div>
              <label className="form-label">Zasięg</label>
              <div className="relative">
                <select
                  value={filters.range ? filters.range.toString() : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      setFilters(prev => ({ ...prev, range: parseInt(value) }));
                    } else {
                      setFilters(prev => ({ ...prev, range: undefined }));
                    }
                  }}
                  className="form-input w-full"
                >
                  <option value="">Wybierz zasięg</option>
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                </select>
              </div>
              {errors.range && <p className="text-red-500 text-sm mt-1">{errors.range}</p>}
            </div>
            <div>
              <label className="form-label">Jednostka</label>
              <select
                value={filters.distanceUnit || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, distanceUnit: e.target.value as 'KILOMETERS' | 'MILES' || undefined }))}
                className="form-input w-full"
              >
                <option value="">Wybierz jednostkę</option>
                <option value="KILOMETERS">Kilometry</option>
                <option value="MILES">Mile</option>
              </select>
              {errors.distanceUnit && <p className="text-red-500 text-sm mt-1">{errors.distanceUnit}</p>}
            </div>
          </div>

          {/* Typ ogłoszenia */}
          <div className="mb-4 sm:mb-6">
            <label className="form-label">Typ ogłoszenia</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleTransactionTypeToggle('free')}
                className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm font-medium transition-colors ${
                  filters.transactionTypes.includes('free')
                    ? 'bg-yellow-400 text-gray-900'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Za darmo
              </button>
              <button
                onClick={() => handleTransactionTypeToggle('exchange')}
                className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm font-medium transition-colors ${
                  filters.transactionTypes.includes('exchange')
                    ? 'bg-yellow-400 text-gray-900'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Wymiana
              </button>
              <button
                onClick={() => handleTransactionTypeToggle('sale')}
                className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm font-medium transition-colors ${
                  filters.transactionTypes.includes('sale')
                    ? 'bg-yellow-400 text-gray-900'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Sprzedaż
              </button>
            </div>
          </div>

          {/* Kategorie */}
          <div className="mb-4 sm:mb-6">
            <label className="form-label">Kategorie</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryToggle(category.id)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filters.categoryIds.includes(category.id)
                      ? 'bg-yellow-400 text-gray-900'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Podkategorie */}
          {selectedSubcategories.length > 0 && (
            <div className="mb-4 sm:mb-6">
              <label className="form-label">Podkategorie</label>
              <div className="flex flex-wrap gap-2">
                {selectedSubcategories.map((subcategory) => (
                  <button
                    key={subcategory.id}
                    onClick={() => handleSubcategoryToggle(subcategory.id)}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filters.subcategoryIds.includes(subcategory.id)
                        ? 'bg-yellow-400 text-gray-900'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {subcategory.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Przycisk wyszukiwania */}
          <div className="flex justify-center sm:justify-end">
            <button
              onClick={handleSearch}
              disabled={searching}
              className="w-full sm:w-auto py-3 sm:py-4 px-6 bg-yellow-400 text-gray-900 border-none rounded-lg font-bold cursor-pointer transition-colors hover:bg-yellow-500 disabled:bg-gray-300 disabled:cursor-not-allowed text-base flex items-center justify-center"
              style={{ minWidth: '120px', maxWidth: '250px' }}
            >
              {searching ? (
                <>
                  <div className="loading-spinner w-5 h-5 mr-3"></div>
                  <span>Wyszukiwanie...</span>
                </>
              ) : (
                'Szukaj'
              )}
            </button>
          </div>
        </div>

        {/* Wyniki wyszukiwania */}
        {offers.length > 0 && (
          <>
            {/* Mapa */}
            {showMap && (
              <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${isMapCollapsed ? 'p-3 sm:p-6 py-4 mb-2' : 'p-3 sm:p-6 mb-2'}`}>
                <div className="flex items-center justify-between mb-0">
                  <h2 className="section-title m-0 mb-0">Mapa ofert</h2>
                  <button
                    onClick={toggleMapCollapse}
                    className="flex items-center gap-2 px-2 sm:px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title={isMapCollapsed ? "Rozwiń mapę" : "Zwiń mapę"}
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${isMapCollapsed ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                    <span className="hidden sm:inline">{isMapCollapsed ? "Rozwiń" : "Zwiń"}</span>
                  </button>
                </div>
                {!isMapCollapsed && (
                  <GoogleMapComponent 
                    userLocation={getUserLocation()}
                    offers={offersForMap}
                  />
                )}
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
              <h2 className="section-title mb-4">Wyniki wyszukiwania ({offers.length})</h2>
              <div className="space-y-0">
                {offers.map((offer, index) => (
                  <div 
                    key={offer.id} 
                    onClick={() => handleOfferClick(offer)}
                    className={`flex items-start border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors p-3 ${
                      index % 2 === 1 ? 'bg-gray-50 hover:bg-gray-100' : 'bg-transparent hover:bg-gray-50'
                    } ${offer.recommended ? 'border-l-4 border-l-yellow-400' : ''}`}
                  >
                    <Image
                      src={getImageUrl(offer.imageUrl)}
                      alt={offer.name}
                      width={100}
                      height={100}
                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg flex-shrink-0"
                      style={{ minWidth: 80, minHeight: 80 }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/food-image.svg'; // Fallback image
                      }}
                    />
                    <div className="flex-1 flex flex-col justify-start ml-3 sm:ml-4 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start w-full">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <h3 className="font-medium text-gray-900 text-sm sm:text-base lg:text-lg break-words leading-tight">{offer.name}</h3>
                            <FavoriteHeart
                              isFavorite={offer.isFavorite || false}
                              onClick={(e) => handleFavoriteClick(offer, e)}
                              loading={favoriteLoading(offer.id)}
                              size={18}
                            />
                          </div>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            {offer.location}
                            {offer.distance && (
                              <span className="ml-2 text-blue-600 font-medium">({offer.distance})</span>
                            )}
                          </p>
                          {offer.recommended && (
                            <span className="inline-block px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-medium rounded-full mt-2">
                              Polecane
                            </span>
                          )}
                        </div>
                        {/* Etykieta transakcji */}
                        <div className="mt-2 sm:mt-0 sm:ml-auto flex-shrink-0">
                          <span className="inline-block px-2 sm:px-3 py-1 bg-yellow-100 text-yellow-800 text-xs sm:text-sm font-medium rounded-full">
                            {getTransactionTypeLabel(offer.transactionType)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {offers.length === 0 && !searching && !loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 text-center">
            <p className="text-gray-500">Nie znaleziono ofert spełniających kryteria wyszukiwania.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchOffersPage() {
  return (
    <AuthGuard>
      <SearchOffersPageContent />
    </AuthGuard>
  );
}