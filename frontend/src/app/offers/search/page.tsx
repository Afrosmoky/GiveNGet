"use client";

import React, { useState, useEffect, useRef } from 'react';
import { environment } from '../../../config';
import { authorizedFetch, getUserLocation } from '../../../utils/auth';
import { AuthGuard } from '../../../components/AuthGuard';
import GoogleMapComponent from '../../../components/GoogleMapComponent';
import { useFavorites } from '../../../hooks/useFavorites';
import { useErrorContext } from '../../../context/ErrorContext';
import { FiChevronDown, FiSearch } from 'react-icons/fi';
import { LuMapPin } from 'react-icons/lu';
import { useLocationPicker } from '../../../hooks/useLocationPicker';
import { LocationField } from '../../../components/location/LocationField';
import { Button, Card, CardHeader, Chip, PageHeader, Spinner } from '../../../components/ui';
import { ApiOffer, TransactionType, Category } from '../../../types/offer';
import OfferTile from '../../../components/OfferTile';
import { offersForMap, zoomForRange } from '../../../utils/offerMap';
import { OfferTileSkeleton } from '../../../components/offer/OfferTileSkeleton';


// Używamy ApiOffer zamiast lokalnego interfejsu Offer

interface SearchFilters {
  range?: number;
  distanceUnit?: 'KILOMETERS' | 'MILES';
  transactionTypes: TransactionType[];
  categoryIds: number[];
  subcategoryIds: number[];
}

// Siatka wyników: 2 kolumny na telefonie, od sm auto-fill (stała szerokość kolumn także przy 1–2 wynikach)
const RESULTS_GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-4';

function SearchOffersPageContent() {
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

  // Lokalizacja: pole miasta (Geoapify) + GPS — wspólne z widokiem mapy
  const location = useLocationPicker();
  const locationInputRef = useRef<HTMLInputElement>(null);
  const locationSectionRef = useRef<HTMLDivElement>(null);
  /** „Szukaj” kliknięte bez lokalizacji — wyraźny komunikat przy polu. */
  const [locationMissing, setLocationMissing] = useState(false);

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

    if (!location.coords) {
      newErrors.location = 'Podaj lokalizację — wpisz miasto albo użyj GPS.';
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

  // Lokalizacja wybrana — chowamy ostrzeżenie o jej braku
  useEffect(() => {
    if (location.coords) {
      setLocationMissing(false);
      setErrors((prev) => ({ ...prev, location: '' }));
    }
  }, [location.coords]);

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
      if (!location.coords) {
        // Pole lokalizacji bywa daleko nad przyciskiem — przewijamy do niego i ustawiamy fokus
        setLocationMissing(true);
        locationSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        locationInputRef.current?.focus({ preventScroll: true });
      }
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
      
      if (location.coords) {
        params.append('lat', location.coords.lat.toString());
        params.append('lon', location.coords.lon.toString());
      }
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

  // Piny mapy — wspólne mapowanie z widokiem /offers/map
  const mapOffers = offersForMap(offers);

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
        <div ref={locationSectionRef} className="mb-5 scroll-mt-24">
          {locationMissing && (
            <div role="alert" className="mb-3 flex items-start gap-3 rounded-ui-md border border-warning/30 bg-warning-soft px-4 py-3">
              <LuMapPin size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden />
              <div className="text-sm">
                <p className="font-semibold text-ink">Brakuje lokalizacji</p>
                <p className="mt-0.5 text-ink-muted">Wpisz miasto albo użyj GPS (ikona w polu), a potem kliknij „Szukaj”.</p>
              </div>
            </div>
          )}
          <LocationField picker={location} inputRef={locationInputRef} error={errors.location} />
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
              {/* Wysokość jawnie — mapa wypełnia rodzica, a bez niej miała 0 px */}
              {!isMapCollapsed && (
                <div className="mt-3 h-80 overflow-hidden rounded-ui-md sm:h-96">
                  <GoogleMapComponent
                    userLocation={location.coords ?? getUserLocation()}
                    offers={mapOffers}
                    zoom={zoomForRange(filters.range ?? 10)}
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