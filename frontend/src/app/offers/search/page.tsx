"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { environment } from '../../../config';
import { authorizedFetch, getUserLocation, updateUserData } from '../../../utils/auth';
import { AuthGuard } from '../../../components/AuthGuard';
import GoogleMapComponent from '../../../components/GoogleMapComponent';
import { useFavorites } from '../../../hooks/useFavorites';
import { useErrorContext } from '../../../context/ErrorContext';
import { FaLocationCrosshairs } from 'react-icons/fa6';
import { FiChevronDown, FiSearch } from 'react-icons/fi';
import { Button, Card, CardHeader, Chip, IconButton, Input, PageHeader, Spinner } from '../../../components/ui';
import { ApiOffer, TransactionType, Category } from '../../../types/offer';
import OfferTile from '../../../components/OfferTile';
import { OfferTileSkeleton } from '../../../components/offer/OfferTileSkeleton';

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

// Siatka wyników: 2 kolumny na telefonie, od sm auto-fill (stała szerokość kolumn także przy 1–2 wynikach)
const RESULTS_GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-4';

function SearchOffersPageContent() {
  const isGpsUpdate = useRef(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [offers, setOffers] = useState<ApiOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  // Czy użytkownik już szukał — odróżnia „zacznij od lokalizacji” od „brak wyników”
  const [hasSearched, setHasSearched] = useState(false);
  const [isMapCollapsed, setIsMapCollapsed] = useState(false);
  const fetchingCategoriesRef = useRef(false);
  const searchingOffersRef = useRef(false);
  
  // Obsługa ulubionych
  const { toggleFavorite } = useFavorites();
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
      setHasSearched(true);
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


  // Kafelek sam robi stopPropagation i liczy kliknięcia; tu tylko stan listy
  const handleFavoriteToggle = async (offerId: string, currentIsFavorite: boolean) => {
    const newFavoriteState = await toggleFavorite(offerId, currentIsFavorite, addError);
    if (newFavoriteState !== undefined) {
      setOffers(prevOffers =>
        prevOffers.map(o =>
          o.id === offerId
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
      <div className="flex h-64 items-center justify-center text-brand">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const selectClass =
    'h-10 w-full rounded-ui-md border border-line bg-surface px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';
  const labelClass = 'mb-1.5 block text-sm font-medium text-ink';
  const groupLabelClass = 'mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-subtle';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Wyszukaj oferty"
        description="Ustaw lokalizację i filtry, żeby zobaczyć oferty w Twojej okolicy."
      />

      {error && (
        <div role="alert" className="mb-4 rounded-ui-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Filtry */}
      <Card padding="lg" className="mb-4 sm:mb-6">
        <CardHeader title="Filtry wyszukiwania" />

        {/* Lokalizacja */}
        <div className="relative mb-5">
          <Input
            label="Lokalizacja"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            placeholder="Wpisz nazwę miasta lub miejscowości lub kliknij ikonę GPS"
            error={errors.location || undefined}
            rightSlot={
              <span className="flex items-center gap-1">
                {locationSearching && <Spinner className="h-4 w-4 text-ink-subtle" />}
                <IconButton
                  label="Użyj mojej lokalizacji GPS"
                  icon={<FaLocationCrosshairs size={18} />}
                  onClick={getCurrentLocation}
                  className="h-8 w-8 hover:text-brand"
                />
              </span>
            }
          />
          {showLocationSuggestions && (
            <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-ui-md border border-line bg-surface shadow-pop">
              {locationSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleLocationSelect(suggestion)}
                  className="w-full border-b border-line px-4 py-3 text-left text-sm text-ink last:border-b-0 hover:bg-surface-muted"
                >
                  <div className="font-medium">{suggestion.formatted}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Zasięg i jednostka */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div>
            <label htmlFor="search-range" className={labelClass}>Zasięg</label>
            <select
              id="search-range"
              value={filters.range ? filters.range.toString() : ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  setFilters(prev => ({ ...prev, range: parseInt(value) }));
                } else {
                  setFilters(prev => ({ ...prev, range: undefined }));
                }
              }}
              className={selectClass}
            >
              <option value="">Wybierz zasięg</option>
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
            </select>
            {errors.range && <p className="mt-1 text-xs text-danger">{errors.range}</p>}
          </div>
          <div>
            <label htmlFor="search-unit" className={labelClass}>Jednostka</label>
            <select
              id="search-unit"
              value={filters.distanceUnit || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, distanceUnit: e.target.value as 'KILOMETERS' | 'MILES' || undefined }))}
              className={selectClass}
            >
              <option value="">Wybierz jednostkę</option>
              <option value="KILOMETERS">Kilometry</option>
              <option value="MILES">Mile</option>
            </select>
            {errors.distanceUnit && <p className="mt-1 text-xs text-danger">{errors.distanceUnit}</p>}
          </div>
        </div>

        {/* Typ oferty */}
        <div className="mb-5">
          <span className={groupLabelClass}>Typ oferty</span>
          <div className="flex flex-wrap gap-2">
            <Chip selected={filters.transactionTypes.includes('free')} onClick={() => handleTransactionTypeToggle('free')}>
              Za darmo
            </Chip>
            <Chip selected={filters.transactionTypes.includes('exchange')} onClick={() => handleTransactionTypeToggle('exchange')}>
              Wymiana
            </Chip>
            <Chip selected={filters.transactionTypes.includes('sale')} onClick={() => handleTransactionTypeToggle('sale')}>
              Sprzedaż
            </Chip>
          </div>
        </div>

        {/* Kategorie */}
        <div className="mb-5">
          <span className={groupLabelClass}>Kategorie</span>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Chip
                key={category.id}
                selected={filters.categoryIds.includes(category.id)}
                onClick={() => handleCategoryToggle(category.id)}
              >
                {category.name}
              </Chip>
            ))}
          </div>
        </div>

        {/* Podkategorie */}
        {selectedSubcategories.length > 0 && (
          <div className="mb-5">
            <span className={groupLabelClass}>Podkategorie</span>
            <div className="flex flex-wrap gap-2">
              {selectedSubcategories.map((subcategory) => (
                <Chip
                  key={subcategory.id}
                  selected={filters.subcategoryIds.includes(subcategory.id)}
                  onClick={() => handleSubcategoryToggle(subcategory.id)}
                >
                  {subcategory.name}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Przycisk wyszukiwania */}
        <div className="flex justify-end border-t border-line pt-4">
          <Button
            onClick={handleSearch}
            loading={searching}
            size="lg"
            leftIcon={<FiSearch size={18} />}
            className="w-full sm:w-auto sm:min-w-[160px]"
          >
            {searching ? 'Wyszukiwanie...' : 'Szukaj'}
          </Button>
        </div>
      </Card>

      {/* Wyniki wyszukiwania */}
      {offers.length > 0 && (
        <>
          {/* Mapa */}
          {showMap && (
            <Card padding="md" className="mb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-ink">Mapa ofert</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMapCollapse}
                  title={isMapCollapsed ? "Rozwiń mapę" : "Zwiń mapę"}
                  rightIcon={<FiChevronDown size={16} className={`transition-transform ${isMapCollapsed ? '' : 'rotate-180'}`} />}
                >
                  <span className="hidden sm:inline">{isMapCollapsed ? "Rozwiń" : "Zwiń"}</span>
                </Button>
              </div>
              {!isMapCollapsed && (
                <div className="mt-3 overflow-hidden rounded-ui-md">
                  <GoogleMapComponent
                    userLocation={getUserLocation()}
                    offers={offersForMap}
                  />
                </div>
              )}
            </Card>
          )}

          <section aria-labelledby="search-results-heading">
            <h2 id="search-results-heading" className="mb-3 text-base font-semibold text-ink">
              Wyniki wyszukiwania <span className="font-normal text-ink-muted">({offers.length})</span>
            </h2>
            <div className={RESULTS_GRID}>
              {offers.map((offer) => (
                <OfferTile
                  key={offer.id}
                  {...offer}
                  location={offer.location ?? ''}
                  lat={offer.lat ?? 0}
                  lon={offer.lon ?? 0}
                  imageUrl={offer.imageUrl ?? ''}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Wyszukiwanie w toku — szkielety w miejscu wyników */}
      {searching && offers.length === 0 && (
        <div className={RESULTS_GRID} aria-busy="true" aria-label="Wyszukiwanie ofert">
          {Array.from({ length: 8 }, (_, i) => (
            <OfferTileSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Błąd wyszukiwania */}
      {error && hasSearched && !searching && (
        <Card padding="lg" className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-medium text-ink">Nie udało się pobrać ofert.</p>
          <Button variant="secondary" size="sm" onClick={handleSearch}>
            Spróbuj ponownie
          </Button>
        </Card>
      )}

      {/* Pusto: przed pierwszym wyszukiwaniem albo brak wyników */}
      {offers.length === 0 && !searching && !loading && !error && (
        <Card padding="lg" className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <FiSearch size={22} />
          </span>
          <p className="text-sm font-semibold text-ink">
            {hasSearched ? 'Brak ofert dla wybranych filtrów' : 'Zacznij od lokalizacji'}
          </p>
          <p className="max-w-sm text-sm text-ink-muted">
            {hasSearched
              ? 'Spróbuj zwiększyć zasięg albo odznaczyć część kategorii.'
              : 'Wpisz miasto lub użyj GPS, wybierz filtry i kliknij „Szukaj”.'}
          </p>
        </Card>
      )}
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