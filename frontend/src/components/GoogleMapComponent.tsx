"use client";

import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { GoogleMap, OverlayView, useLoadScript } from '@react-google-maps/api';
import { FaLocationCrosshairs } from 'react-icons/fa6';
import { LuMapPinOff, LuX } from 'react-icons/lu';
import { environment } from '../config';
import { getImageUrl } from '../utils/imageUtils';
import type { MapOffer } from '../utils/offerMap';
import { Spinner, cn } from './ui';
import { OfferMapCard } from './map/OfferMapCard';

const CONTAINER_STYLE = { width: '100%', height: '100%' };
const LIBRARIES: ('places')[] = ['places'];
const WARSAW = { lat: 52.2297, lng: 21.0122 };

interface GoogleMapComponentProps {
  /** Pozycja użytkownika (środek mapy + znacznik). lat/lon = 0 traktujemy jak brak. */
  userLocation?: { lat?: number | null; lon?: number | null } | null;
  offers: MapOffer[];
  zoom?: number;
  className?: string;
}

interface OfferGroup {
  key: string;
  lat: number;
  lon: number;
  offers: MapOffer[];
}

/**
 * Mapa Google z pinami ofert. Oferty w tym samym punkcie (np. kilka z jednego sklepu)
 * łączą się w klaster z licznikiem; klik w pin albo klaster otwiera kartę z ofertami.
 *
 * Wysokość nadaje rodzic (mapa wypełnia 100% kontenera).
 */
function GoogleMapComponent({ userLocation, offers, zoom = 12, className }: GoogleMapComponentProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: environment.REACT_APP_Maps_API_KEY,
    libraries: LIBRARIES,
  });
  const mapRef = useRef<google.maps.Map | null>(null);
  const [selected, setSelected] = useState<OfferGroup | null>(null);

  const hasUserLocation = Boolean(userLocation?.lat && userLocation?.lon);
  const userLat = userLocation?.lat ?? null;
  const userLon = userLocation?.lon ?? null;

  // Środek zależy od wartości, nie od tożsamości obiektu — inaczej każdy render rodzica
  // przesuwałby mapę z powrotem
  const center = useMemo(() => {
    if (userLat && userLon) return { lat: userLat, lng: userLon };
    if (offers.length > 0) return { lat: offers[0].lat, lng: offers[0].lon };
    return WARSAW;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLat, userLon, offers.length > 0 ? offers[0].id : null]);

  const groups = useMemo<OfferGroup[]>(() => {
    const byPosition = new Map<string, OfferGroup>();
    offers.forEach((offer) => {
      const key = `${offer.lat},${offer.lon}`;
      const group = byPosition.get(key) ?? { key, lat: offer.lat, lon: offer.lon, offers: [] };
      group.offers.push(offer);
      byPosition.set(key, group);
    });
    return Array.from(byPosition.values());
  }, [offers]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  if (loadError) {
    return (
      <div className={cn('flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-muted p-4 text-center', className)}>
        <LuMapPinOff size={22} className="text-ink-subtle" aria-hidden />
        <p className="text-sm text-ink-muted">Nie udało się wczytać mapy.</p>
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className={cn('flex h-full w-full items-center justify-center bg-surface-muted', className)}>
        <Spinner className="h-6 w-6 text-brand" label="Ładowanie mapy" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={CONTAINER_STYLE}
      mapContainerClassName={className}
      center={center}
      zoom={zoom}
      onLoad={onLoad}
      onUnmount={() => {
        mapRef.current = null;
      }}
      onClick={() => setSelected(null)}
      options={{ clickableIcons: false, streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
    >
      {hasUserLocation && (
        <OverlayView position={{ lat: userLat!, lng: userLon! }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
          <div title="Twoja lokalizacja" className="-translate-x-1/2 -translate-y-1/2 text-brand-teal drop-shadow">
            <FaLocationCrosshairs size={28} aria-hidden />
          </div>
        </OverlayView>
      )}

      {groups.map((group) => {
        const isCluster = group.offers.length > 1;
        const first = group.offers[0];
        const active = selected?.key === group.key;
        return (
          <OverlayView key={group.key} position={{ lat: group.lat, lng: group.lon }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelected(group);
                // Popup otwiera się NAD pinem — przesuwamy mapę, żeby pin zjechał w dół i karta
                // zmieściła się także na niskiej mapie (mobile)
                const map = mapRef.current;
                const height = map?.getDiv().clientHeight ?? 0;
                if (map) {
                  map.panTo({ lat: group.lat, lng: group.lon });
                  map.panBy(0, -Math.min(170, Math.max(0, height / 2 - 80)));
                }
              }}
              title={isCluster ? `${group.offers.length} ofert w tym miejscu` : first.name}
              aria-label={isCluster ? `${group.offers.length} ofert w tym miejscu` : `Oferta: ${first.name}`}
              className={cn(
                '-translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] shadow-pop transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
                active ? 'scale-110 border-brand-accent' : 'border-surface',
                isCluster
                  ? 'flex h-11 w-11 items-center justify-center bg-brand text-sm font-bold text-brand-contrast'
                  : 'block h-11 w-11 bg-brand-soft bg-cover bg-center'
              )}
              style={isCluster || !first.imageUrl ? undefined : { backgroundImage: `url(${getImageUrl(first.imageUrl)})` }}
            >
              {isCluster ? group.offers.length : null}
            </button>
          </OverlayView>
        );
      })}

      {selected && (
        <OverlayView position={{ lat: selected.lat, lng: selected.lon }} mapPaneName={OverlayView.FLOAT_PANE}>
          {/* Pozycja nad pinem przez CSS — getPixelPositionOffset dostaje przy pierwszym renderze
              zerowe wymiary i popup lądował pod pinem */}
          <div
            className="relative w-72 -translate-x-1/2 -translate-y-[calc(100%+34px)] rounded-ui-lg bg-surface p-2 shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Zamknij"
              className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-surface/90 text-ink-muted hover:bg-surface-sunken hover:text-ink"
            >
              <LuX size={16} />
            </button>
            <ul className="max-h-64 divide-y divide-line overflow-y-auto">
              {selected.offers.map((offer) => (
                <li key={offer.id}>
                  <OfferMapCard offer={offer} />
                </li>
              ))}
            </ul>
            <span aria-hidden className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-surface" />
          </div>
        </OverlayView>
      )}
    </GoogleMap>
  );
}

export default memo(GoogleMapComponent);
