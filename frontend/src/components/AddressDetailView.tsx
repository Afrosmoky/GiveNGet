import React, { useState, useEffect, useCallback, useRef } from 'react';
import { authorizedFetch } from '../utils/auth';
import { environment } from '../config';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';
import { LuMapPin, LuMapPinOff, LuSearch } from 'react-icons/lu';
import { Alert, Button, Card, CardHeader, IconButton, Input, Spinner } from './ui';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};
// Kolor pinezki = --brand-primary (Google Maps nie czyta zmiennych CSS)
const PIN_COLOR = '#0C6B4C';

const libraries: ('places')[] = ['places'];

interface UserAddress {
  address: string;
  lat: number;
  lon: number;
}

export const AddressDetailView: React.FC = () => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: environment.REACT_APP_Maps_API_KEY,
    libraries,
});

  const [, setUserAddress] = useState<UserAddress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });
  const [editableAddress, setEditableAddress] = useState('');
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);

  // Inicjalizacja Google Maps API
  useEffect(() => {
    if (isLoaded && window.google) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      geocoder.current = new window.google.maps.Geocoder();
    }
  }, [isLoaded]);

  // Pobierz aktualny adres użytkownika
  useEffect(() => {
    const fetchUserAddress = async () => {
      try {
        const response = await authorizedFetch(`${environment.apiUrl}/api/user/address`);
        if (response.ok) {
          const addressData = await response.json();
          setUserAddress(addressData);
          setEditableAddress(addressData.address || '');
          if (addressData.lat && addressData.lon) {
            setMarkerPosition({ lat: addressData.lat, lng: addressData.lon });
            setSearchQuery(addressData.address || '');
          }
        } else {
          // Jeśli nie ma adresu, ustaw domyślne wartości
          setUserAddress(null);
          setEditableAddress('');
          // Spróbuj pobrać aktualną lokalizację GPS
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const pos = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                };
                setMarkerPosition(pos);
                // Pobierz adres dla aktualnej lokalizacji
                if (geocoder.current) {
                  geocoder.current.geocode(
                    { location: pos },
                    (results, status) => {
                      if (status === 'OK' && results && results[0]) {
                        const address = results[0].formatted_address;
                        setEditableAddress(address);
                        setSearchQuery(address);
                        setUserAddress({ address, lat: pos.lat, lon: pos.lng });
                      }
                    }
                  );
                }
              },
              () => {
                // Błąd GPS, ustaw domyślną lokalizację (Warszawa)
                const defaultPos = { lat: 52.237049, lng: 21.017532 };
                setMarkerPosition(defaultPos);
              }
            );
          } else {
            // Brak wsparcia dla GPS, ustaw domyślną lokalizację
            const defaultPos = { lat: 52.237049, lng: 21.017532 };
            setMarkerPosition(defaultPos);
          }
        }
      } catch (error) {
        console.error('Błąd pobierania adresu:', error);
        setUserAddress(null);
        setEditableAddress('');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserAddress();
  }, []);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPosition = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };
      setMarkerPosition(newPosition);
      
      // Pobierz adres dla nowej lokalizacji
      if (geocoder.current) {
        geocoder.current.geocode(
          { location: newPosition },
          (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const address = results[0].formatted_address;
              setEditableAddress(address);
              setSearchQuery(address);
              setUserAddress({ address, lat: newPosition.lat, lon: newPosition.lng });
            } else {
              const coordsText = `${newPosition.lat.toFixed(6)}, ${newPosition.lng.toFixed(6)}`;
              setEditableAddress(coordsText);
              setSearchQuery(coordsText);
              setUserAddress({ address: coordsText, lat: newPosition.lat, lon: newPosition.lng });
            }
          }
        );
      }
    }
  }, []);

  const onMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPosition = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };
      setMarkerPosition(newPosition);
      
      // Pobierz adres dla nowej lokalizacji
      if (geocoder.current) {
        geocoder.current.geocode(
          { location: newPosition },
          (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const address = results[0].formatted_address;
              setEditableAddress(address);
              setSearchQuery(address);
              setUserAddress({ address, lat: newPosition.lat, lon: newPosition.lng });
            } else {
              const coordsText = `${newPosition.lat.toFixed(6)}, ${newPosition.lng.toFixed(6)}`;
              setEditableAddress(coordsText);
              setSearchQuery(coordsText);
              setUserAddress({ address: coordsText, lat: newPosition.lat, lon: newPosition.lng });
            }
          }
        );
      }
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length > 2 && autocompleteService.current) {
      setIsSearching(true);
      autocompleteService.current.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'pl' }, // Ogranicz do Polski
          types: ['geocode', 'establishment']
        },
        (predictions, status) => {
          setIsSearching(false);
          if (status === 'OK' && predictions) {
            setSearchSuggestions(predictions);
            setShowSuggestions(true);
          } else {
            setSearchSuggestions([]);
            setShowSuggestions(false);
          }
        }
      );
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (prediction: google.maps.places.AutocompletePrediction) => {
    if (geocoder.current && prediction.place_id) {
      geocoder.current.geocode(
        { placeId: prediction.place_id },
        (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            const address = results[0].formatted_address;
            
            const newPosition = {
              lat: location.lat(),
              lng: location.lng(),
            };

            setMarkerPosition(newPosition);
            setEditableAddress(address);
            setSearchQuery(address);
            setUserAddress({ address, lat: newPosition.lat, lon: newPosition.lng });
            setShowSuggestions(false);
          }
        }
      );
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && geocoder.current) {
      geocoder.current.geocode(
        { address: searchQuery },
        (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            const newPosition = {
              lat: location.lat(),
              lng: location.lng(),
            };
            setMarkerPosition(newPosition);
            setEditableAddress(results[0].formatted_address);
            setSearchQuery(results[0].formatted_address);
            setUserAddress({ address: results[0].formatted_address, lat: newPosition.lat, lon: newPosition.lng });
            setShowSuggestions(false);
          }
        }
      );
    }
  };

  const handleSaveAddress = async () => {
    if (!markerPosition || !editableAddress.trim()) {
      setMessage({ type: 'error', text: 'Proszę wybrać lokalizację na mapie' });
      return;
    }

    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await authorizedFetch(`${environment.apiUrl}/api/user/address`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: editableAddress.trim(),
          lat: markerPosition.lat,
          lon: markerPosition.lng
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Adres został zaktualizowany pomyślnie!' });
        // Aktualizuj stan z edytowanym adresem
        setUserAddress({ address: editableAddress.trim(), lat: markerPosition.lat, lon: markerPosition.lng });
      } else {
        const errorText = await response.text();
        setMessage({ type: 'error', text: errorText || 'Błąd podczas aktualizacji adresu' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Błąd połączenia z serwerem' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loadError) {
    return (
      <Card padding="lg" className="flex flex-col items-center gap-2 py-10 text-center">
        <LuMapPinOff size={22} className="text-ink-subtle" aria-hidden />
        <p className="text-sm text-ink-muted">Nie udało się wczytać mapy.</p>
      </Card>
    );
  }
  if (!isLoaded || isLoading) {
    return (
      <Card padding="lg" className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6 text-brand" label={isLoaded ? 'Wczytywanie adresu' : 'Ładowanie mapy'} />
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <CardHeader title="Mój adres" description="Domyślne miejsce odbioru dla Twoich ofert. Kliknij mapę albo przeciągnij pinezkę." />

      <div className="flex flex-col gap-4">
        {message.text && <Alert tone={message.type === 'success' ? 'success' : 'danger'}>{message.text}</Alert>}

        {/* Wyszukiwanie adresu (Google Places) */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Input
            ref={searchInputRef}
            label="Wyszukaj adres"
            value={searchQuery}
            onChange={handleSearchInputChange}
            placeholder="Ulica, miasto albo nazwa miejsca…"
            autoComplete="off"
            rightSlot={<IconButton type="submit" label="Szukaj" icon={<LuSearch size={17} />} className="h-8 w-8" />}
          />
          {showSuggestions && searchSuggestions.length > 0 && (
            <ul role="listbox" className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-ui-md border border-line bg-surface shadow-pop">
              {isSearching ? (
                <li className="px-4 py-3 text-center text-sm text-ink-muted">Wyszukiwanie…</li>
              ) : (
                searchSuggestions.map((prediction) => (
                  <li key={prediction.place_id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => handleSuggestionClick(prediction)}
                      className="flex w-full items-center gap-2 border-b border-line px-4 py-3 text-left text-sm text-ink last:border-b-0 hover:bg-surface-muted"
                    >
                      <LuMapPin size={14} className="shrink-0 text-ink-subtle" aria-hidden />
                      {prediction.description}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </form>

        <Input
          label="Adres"
          value={editableAddress}
          onChange={(e) => setEditableAddress(e.target.value)}
          placeholder="Uzupełni się po wybraniu miejsca na mapie"
          hint="Możesz poprawić opis, np. dodać numer mieszkania."
        />

        <div className="h-72 overflow-hidden rounded-ui-md border border-line sm:h-96">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={markerPosition || { lat: 52.237049, lng: 21.017532 }}
            zoom={13}
            onClick={handleMapClick}
            options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
          >
            {markerPosition && (
              <Marker
                position={markerPosition}
                draggable={true}
                onDragEnd={onMarkerDragEnd}
                icon={{
                  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                  fillColor: PIN_COLOR,
                  fillOpacity: 1,
                  strokeWeight: 0,
                  scale: 1.5,
                  anchor: new google.maps.Point(12, 24)
                }}
              />
            )}
          </GoogleMap>
        </div>

        {markerPosition && (
          <dl className="grid gap-1 rounded-ui-md bg-surface-muted px-4 py-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
            <dt className="text-ink-muted">Wybrany adres</dt>
            <dd className="text-ink">{editableAddress || 'Nie wybrano adresu'}</dd>
            <dt className="text-ink-muted">Współrzędne</dt>
            <dd className="font-mono text-xs leading-5 text-ink-muted">
              {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
            </dd>
          </dl>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSaveAddress} disabled={isSaving || !markerPosition} loading={isSaving} className="w-full sm:w-auto">
            {isSaving ? 'Zapisywanie…' : 'Zapisz adres'}
          </Button>
        </div>
      </div>
    </Card>
  );
};
