"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';
import { FaSearch, FaMapMarkerAlt } from 'react-icons/fa';
import { environment } from '../config';

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '8px',
};

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

  if (loadError) return <div>Błąd ładowania mapy.</div>;
  if (!isLoaded) return <div>Ładowanie mapy...</div>;

  const icon = {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
    fillColor: '#d35400',
    fillOpacity: 1,
    strokeWeight: 0,
    scale: 1.5,
    anchor: new google.maps.Point(12, 24)
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '90%', maxWidth: '800px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '15px' }}>Wybierz lokalizację</h2>
        
        {/* Pole wyszukiwania */}
        <div style={{ marginBottom: '15px', position: 'relative' }}>
          <form onSubmit={handleSearchSubmit}>
            <div style={{ position: 'relative' }}>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchInputChange}
                placeholder="Wyszukaj adres lub miejsce..."
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 12px',
                  fontSize: '16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#fbbf24'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              <button
                type="submit"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0'
                }}
              >
                <FaSearch 
                  style={{
                    color: '#6b7280',
                    fontSize: '16px'
                  }}
                />
              </button>
            </div>
          </form>
          
          {/* Lista sugestii */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {isSearching ? (
                <div style={{ padding: '12px', textAlign: 'center', color: '#718096' }}>
                  Wyszukiwanie...
                </div>
              ) : (
                searchSuggestions.map((prediction, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(prediction)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      textAlign: 'left',
                      fontSize: '14px',
                      color: '#2d3748',
                      borderBottom: index < searchSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                      transition: 'background-color 0.2s',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <FaMapMarkerAlt style={{ color: '#6b7280', fontSize: '12px' }} />
                    {prediction.description}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Aktualny adres */}
        {currentAddress && (
          <div style={{
            marginBottom: '15px',
            padding: '12px',
            backgroundColor: '#f0fff4',
            border: '1px solid #68d391',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#2d3748',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FaMapMarkerAlt style={{ color: '#38a169' }} />
            <strong>Aktualna lokalizacja:</strong> {currentAddress}
          </div>
        )}

        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={markerPosition || { lat: 52.237049, lng: 21.017532 }}
          zoom={13}
          onClick={handleMapClick}
        >
          {markerPosition && (
            <Marker
              position={markerPosition}
              draggable={true}
              onDragEnd={onMarkerDragEnd}
              icon={icon}
            />
          )}
        </GoogleMap>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
          <button onClick={onClose} style={{ marginRight: '10px', padding: '10px 20px', borderRadius: '5px', border: '1px solid #ccc' }}>Anuluj</button>
          <button onClick={handleSelectClick} style={{ padding: '10px 20px', borderRadius: '5px', border: 'none', background: '#fbbf24', color: '#2d3748', fontWeight: 'bold' }}>Wybierz</button>
        </div>
      </div>
    </div>
  );
};

export default LocationMapModal; 