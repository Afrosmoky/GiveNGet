"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';
import { LuMapPin, LuMapPinOff, LuSearch } from 'react-icons/lu';
import { environment } from '../config';
import { Button, Dialog, IconButton, Input, Spinner } from './ui';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};
// Kolor pinezki = --brand-primary (Google Maps nie czyta zmiennych CSS)
const PIN_COLOR = '#0C6B4C';

const libraries: ('places')[] = ['places'];

interface LocationMapModalProps {
  initialLat?: number;
  initialLon?: number;
  onLocationSelect: (lat: number, lon: number, address?: string) => void;
  onClose: () => void;
}

const LocationMapModal: React.FC<LocationMapModalProps> = ({ initialLat, initialLon, onLocationSelect, onClose }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: environment.googleApiKey,
    libraries,
  });

  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);

  useEffect(() => {
    if (isLoaded && window.google) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      geocoder.current = new window.google.maps.Geocoder();
    }
  }, [isLoaded]);

  useEffect(() => {
    if (initialLat && initialLon) {
      const pos = { lat: initialLat, lng: initialLon };
      setMarkerPosition(pos);
      // Pobierz adres dla początkowej lokalizacji
      if (geocoder.current) {
        geocoder.current.geocode(
          { location: pos },
          (results, status) => {
            if (status === 'OK' && results && results[0]) {
              setCurrentAddress(results[0].formatted_address);
              setSearchQuery(results[0].formatted_address);
            }
          }
        );
      }
    } else {
      // Jeśli nie ma initial, spróbuj pobrać GPS
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
                    setCurrentAddress(results[0].formatted_address);
                    setSearchQuery(results[0].formatted_address);
                  }
                }
              );
            }
          },
          () => {
            // Błąd GPS, ustaw domyślną lokalizację (np. centrum Polski)
            const defaultPos = { lat: 52.237049, lng: 21.017532 };
            setMarkerPosition(defaultPos);
            if (geocoder.current) {
              geocoder.current.geocode(
                { location: defaultPos },
                (results, status) => {
                  if (status === 'OK' && results && results[0]) {
                    setCurrentAddress(results[0].formatted_address);
                    setSearchQuery(results[0].formatted_address);
                  }
                }
              );
            }
          }
        );
      } else {
        // Brak wsparcia dla GPS
        const defaultPos = { lat: 52.237049, lng: 21.017532 };
        setMarkerPosition(defaultPos);
        if (geocoder.current) {
          geocoder.current.geocode(
            { location: defaultPos },
            (results, status) => {
              if (status === 'OK' && results && results[0]) {
                setCurrentAddress(results[0].formatted_address);
                setSearchQuery(results[0].formatted_address);
              }
            }
          );
        }
      }
    }
  }, [initialLat, initialLon, isLoaded]);

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
              setCurrentAddress(address);
              setSearchQuery(address); // Synchronizuj pole wyszukiwania
            } else {
              const coordsText = `${newPosition.lat.toFixed(6)}, ${newPosition.lng.toFixed(6)}`;
              setCurrentAddress('');
              setSearchQuery(coordsText);
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
              setCurrentAddress(address);
              setSearchQuery(address); // Synchronizuj pole wyszukiwania
            } else {
              const coordsText = `${newPosition.lat.toFixed(6)}, ${newPosition.lng.toFixed(6)}`;
              setCurrentAddress('');
              setSearchQuery(coordsText);
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

            // Ustawiamy wszystkie stany na podstawie jednego, spójnego źródła - wyniku Geocodera
            setMarkerPosition(newPosition);
            setCurrentAddress(address);
            setSearchQuery(address);
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
            setCurrentAddress(results[0].formatted_address);
            setSearchQuery(results[0].formatted_address);
            setShowSuggestions(false);
          }
        }
      );
    }
  };

  const handleSelectClick = () => {
    if (markerPosition) {
      // Zasada "Źródła Prawdy": mapa jest najważniejsza.
      // Adres do zapisu jest zawsze adresem pobranym dla pozycji znacznika (`currentAddress`).
      // Pole wyszukiwania (`searchQuery`) jest tylko pomocnicze.
      const addressToUse = currentAddress || `${markerPosition.lat.toFixed(6)}, ${markerPosition.lng.toFixed(6)}`;
      onLocationSelect(markerPosition.lat, markerPosition.lng, addressToUse);
    }
  };

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        Anuluj
      </Button>
      <Button onClick={handleSelectClick} disabled={!markerPosition}>
        Wybierz
      </Button>
    </>
  );

  // Portal: formularz oferty ma przodka z transformacją, która psułaby position: fixed okna
  if (typeof document === 'undefined') return null;

  return createPortal(
    <Dialog open onClose={onClose} title="Wybierz lokalizację" description="Wyszukaj adres, kliknij mapę albo przeciągnij pinezkę." size="lg" footer={footer}>
      {loadError ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <LuMapPinOff size={22} className="text-ink-subtle" aria-hidden />
          <p className="text-sm text-ink-muted">Nie udało się wczytać mapy.</p>
        </div>
      ) : !isLoaded ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-brand" label="Ładowanie mapy" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Wyszukiwanie adresu (Google Places) */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={handleSearchInputChange}
              placeholder="Wyszukaj adres lub miejsce..."
              aria-label="Wyszukaj adres"
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

          {currentAddress && (
            <p className="flex items-start gap-2 rounded-ui-md border border-brand/20 bg-brand-soft px-3 py-2.5 text-sm text-brand-strong">
              <LuMapPin size={15} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold">Wybrana lokalizacja:</span> {currentAddress}
              </span>
            </p>
          )}

          <div className="h-72 overflow-hidden rounded-ui-md border border-line sm:h-[26rem]">
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
        </div>
      )}
    </Dialog>,
    document.body
  );
};

export default LocationMapModal; 