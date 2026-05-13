// src/components/GoogleMapComponent.jsx
import React, { useCallback, useRef, useState, useMemo } from 'react';
import { GoogleMap, useLoadScript, OverlayView } from '@react-google-maps/api';
import { FaLocationCrosshairs } from 'react-icons/fa6';
import { environment } from '../config';
import { getImageUrl } from '../utils/imageUtils';

const containerStyle = {
    width: '100%',
    height: '100%'
};

const libraries = ["places"];

function GoogleMapComponent({ userLocation, offers }) {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: environment.REACT_APP_Maps_API_KEY,
        libraries,
    });

    const mapRef = useRef(null);
    const [selectedCluster, setSelectedCluster] = useState(null);
    const isInitialized = useRef(false);

    // Oblicz center tylko raz przy renderowaniu - przeniesione na początek
    const mapCenter = useMemo(() => {
        if (userLocation && userLocation.lat && userLocation.lon) {
            return { lat: userLocation.lat, lng: userLocation.lon };
        } else if (offers && offers.length > 0) {
            return { lat: offers[0].lat, lng: offers[0].lon };
        } else {
            return { lat: 52.2297, lng: 21.0122 }; // Warszawa
        }
    }, [userLocation, offers]);

    const onLoad = useCallback(map => {
        mapRef.current = map;
        // Centruj mapę tylko przy pierwszym załadowaniu
        if (!isInitialized.current) {
            if (userLocation && userLocation.lat && userLocation.lon) {
                map.setCenter({ lat: userLocation.lat, lng: userLocation.lon });
            } else if (offers && offers.length > 0) {
                map.setCenter({ lat: offers[0].lat, lng: offers[0].lon });
            } else {
                map.setCenter({ lat: 52.2297, lng: 21.0122 }); // Warszawa
            }
            isInitialized.current = true;
        }
    }, []); // Usunąłem zależności, żeby onLoad nie był wywoływany ponownie

    const onUnmount = useCallback(() => {
        mapRef.current = null;
        isInitialized.current = false;
    }, []);

    const handleOfferClick = (offer) => {
        const urlName = offer.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
        window.open(`/offers/${offer.id}/${urlName}`, '_blank');
    };

    const getTransactionTypeLabel = (type) => {
        switch (type) {
            case 'free': return 'Za darmo';
            case 'exchange': return 'Wymiana';
            case 'sale': return 'Sprzedaż';
            default: return type;
        }
    };

    // Grupuj oferty po lokalizacji - używamy useMemo z stabilnymi kluczami
    const groupedOffers = useMemo(() => {
        const groups = new Map();
        offers.forEach(offer => {
            const key = `${offer.lat},${offer.lon}`;
            if (!groups.has(key)) {
                groups.set(key, { ...offer, offers: [] });
            }
            groups.get(key).offers.push(offer);
        });
        return Array.from(groups.values());
    }, [offers]);

    if (loadError) return "Error loading maps";
    if (!isLoaded) return "Loading Maps";

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={mapCenter}
            zoom={12}
            onLoad={onLoad}
            onUnmount={onUnmount}
        >
            {/* Znacznik bieżącej lokalizacji użytkownika */}
            {userLocation && userLocation.lat && userLocation.lon && (
                <OverlayView
                    position={{ lat: userLocation.lat, lng: userLocation.lon }}
                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                    <div title="Moja lokalizacja">
                        <FaLocationCrosshairs style={{
                            fontSize: '30px',
                            color: '#3498db', // Jasnoniebieski
                            transform: 'translate(-50%, -50%)',
                            cursor: 'pointer'
                        }} />
                    </div>
                </OverlayView>
            )}

            {/* Znaczniki ofert i klastrów */}
            {groupedOffers.map(group => {
                const isCluster = group.offers.length > 1;
                const position = { lat: group.lat, lng: group.lon };
                const markerKey = isCluster ? `cluster-${group.lat}-${group.lon}` : group.offers[0].id;

                if (isCluster) {
                    // Renderuj znacznik klastra
                    return (
                        <OverlayView
                            key={markerKey}
                            position={position}
                            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                        >
                            <div
                                style={{
                                    background: '#f59e0b', // Bardziej pomarańczowy dla klastrów
                                    width: '45px',
                                    height: '45px',
                                    borderRadius: '50%',
                                    border: '3px solid black',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    color: 'black',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transform: 'translate(-50%, -50%)',
                                }}
                                title={`${group.offers.length} ofert w tej lokalizacji`}
                                onClick={() => setSelectedCluster(group)}
                            >
                                {group.offers.length}
                            </div>
                        </OverlayView>
                    );
                } else {
                    // Renderuj pojedynczy znacznik
                    const offer = group.offers[0];
                    const finalImageUrl = getImageUrl(offer.imageUrl);
                    return (
                        <OverlayView
                            key={markerKey}
                            position={position}
                            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                        >
                                                    <div
                            style={{
                                backgroundImage: `url(${finalImageUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                border: offer.recommended ? '3px solid #fbbf24' : '2px solid black',
                                cursor: 'pointer',
                                transform: 'translate(-50%, -50%)',
                            }}
                            title={`${offer.name} - ${getTransactionTypeLabel(offer.transactionType)}${offer.recommended ? ' - Polecane' : ''}`}
                            onClick={() => setSelectedCluster(group)}
                        />
                        </OverlayView>
                    );
                }
            })}

            {/* InfoWindow -> zastąpione przez customowy OverlayView */}
            {selectedCluster && (
                <OverlayView
                    position={{ lat: selectedCluster.lat, lng: selectedCluster.lon }}
                    mapPaneName={OverlayView.FLOAT_PANE}
                    getPixelPositionOffset={(width, height) => ({
                        x: -(width / 2),
                        y: -(height + 45), // Pozycja nad znacznikiem + mały margines
                    })}
                >
                    <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        position: 'relative',
                        padding: '8px',
                        width: '300px', // Ustawienie stałej szerokości
                        border: selectedCluster.offers.some(offer => offer.recommended) ? '2px solid #fbbf24' : 'none',
                    }}>
                        {/* Przycisk zamknięcia */}
                        <button
                            onClick={() => setSelectedCluster(null)}
                            style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '20px',
                                color: '#4a5568',
                                padding: '0',
                                lineHeight: '1',
                                zIndex: 1
                            }}
                        >
                            &times;
                        </button>

                        <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            {selectedCluster.offers.map((offer, index) => {
                                const finalImageUrl = getImageUrl(offer.imageUrl);

                                return (
                                    <div key={offer.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '12px 4px',
                                        borderBottom: index < selectedCluster.offers.length - 1 ? '1px solid #e2e8f0' : 'none'
                                    }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            border: '1px solid black',
                                            backgroundImage: `url(${finalImageUrl})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            flexShrink: 0,
                                            marginRight: '12px'
                                        }} />
                                        <div>
                                            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#2d3748', margin: 0, paddingRight: '20px' }}>
                                                {offer.name}
                                            </h3>
                                            <p style={{ fontSize: '12px', color: '#4a5568', margin: '4px 0 8px 0' }}>
                                                {getTransactionTypeLabel(offer.transactionType)}
                                                {offer.distance && (
                                                    <span style={{ marginLeft: '8px', color: '#3b82f6', fontWeight: 'bold' }}>
                                                        ({offer.distance})
                                                    </span>
                                                )}
                                                {offer.recommended && (
                                                    <span style={{ marginLeft: '8px', color: '#fbbf24', fontWeight: 'bold' }}>
                                                        ⭐ Polecane
                                                    </span>
                                                )}
                                            </p>
                                            <button
                                                onClick={() => handleOfferClick(offer)}
                                                style={{
                                                    backgroundColor: '#fbbf24',
                                                    color: '#2d3748',
                                                    border: 'none',
                                                    padding: '6px 12px',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'}
                                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fbbf24'}
                                            >
                                                Zobacz ofertę
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* "Ogon" okienka informacyjnego */}
                        <div style={{
                            content: '""',
                            position: 'absolute',
                            bottom: '-10px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '0',
                            height: '0',
                            borderLeft: '10px solid transparent',
                            borderRight: '10px solid transparent',
                            borderTop: '10px solid white'
                        }} />
                    </div>
                </OverlayView>
            )}
        </GoogleMap>
    );
}

export default React.memo(GoogleMapComponent);