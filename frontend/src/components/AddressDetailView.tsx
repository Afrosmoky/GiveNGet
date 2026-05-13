import React, { useState, useEffect, useCallback, useRef } from 'react';
import { authorizedFetch } from '../utils/auth';
import { environment } from '../config';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';
import { FaSearch, FaMapMarkerAlt } from 'react-icons/fa';

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px',
};

const libraries: ('places')[] = ['places'];

interface AddressDetailViewProps {
  userData: {
    email: string;
  };
}

interface UserAddress {
  address: string;
  lat: number;
  lon: number;
}

export const AddressDetailView: React.FC<AddressDetailViewProps> = () => {
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

  if (loadError) return <div>Błąd ładowania mapy.</div>;
  if (!isLoaded) return <div>Ładowanie mapy...</div>;

  if (isLoading) {
    return (
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '30px',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '18px',
          color: '#6b7280'
        }}>
          Ładowanie adresu...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      {/* Address Section */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '0',
        boxShadow: 'none',
        padding: '30px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#2d3748',
          marginBottom: '30px'
        }}>
          Mój Adres
        </h2>

        {/* Komunikat */}
        {message.text && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            backgroundColor: message.type === 'success' ? '#f0fff4' : '#fef2f2',
            border: `1px solid ${message.type === 'success' ? '#68d391' : '#f87171'}`,
            color: message.type === 'success' ? '#2d3748' : '#dc2626',
            textAlign: 'center'
          }}>
            {message.text}
          </div>
        )}

        {/* Pole wyszukiwania */}
        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: '#9ca3af',
            fontSize: '12px',
            textTransform: 'uppercase'
          }}>
            Wyszukaj adres
          </label>
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

        {/* Pole edycji adresu */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: '#9ca3af',
            fontSize: '12px',
            textTransform: 'uppercase'
          }}>
            Edytuj adres
          </label>
          <input
            type="text"
            value={editableAddress}
            onChange={(e) => setEditableAddress(e.target.value)}
            placeholder="Adres zostanie automatycznie wypełniony po wybraniu lokalizacji"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '16px',
              backgroundColor: '#ffffff',
              color: '#2d3748',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#fbbf24'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>

        {/* Mapa */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: '#9ca3af',
            fontSize: '12px',
            textTransform: 'uppercase'
          }}>
            Mapa - kliknij aby wybrać lokalizację
          </label>
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
                icon={{
                  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                  fillColor: '#d35400',
                  fillOpacity: 1,
                  strokeWeight: 0,
                  scale: 1.5,
                  anchor: new google.maps.Point(12, 24)
                }}
              />
            )}
          </GoogleMap>
        </div>

        {/* Informacje o lokalizacji */}
        {markerPosition && (
          <div style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f7fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              fontSize: '14px',
              color: '#4a5568',
              marginBottom: '8px'
            }}>
              <strong>Współrzędne:</strong> {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#4a5568'
            }}>
              <strong>Wybrany adres:</strong> {editableAddress || 'Nie wybrano adresu'}
            </div>
          </div>
        )}

        {/* Przycisk zapisu */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleSaveAddress}
            disabled={isSaving || !markerPosition}
            style={{
              width: '200px',
              padding: '12px',
              backgroundColor: isSaving || !markerPosition ? '#a0aec0' : '#fbbf24',
              color: '#1a202c',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isSaving || !markerPosition ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => {
              if (!isSaving && markerPosition) {
                e.currentTarget.style.backgroundColor = '#f59e0b';
              }
            }}
            onMouseOut={(e) => {
              if (!isSaving && markerPosition) {
                e.currentTarget.style.backgroundColor = '#fbbf24';
              }
            }}
          >
            {isSaving && (
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #1a202c',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            )}
            {isSaving ? 'Zapisywanie...' : 'Zaktualizuj'}
          </button>
        </div>
      </div>
    </div>
  );
}; 