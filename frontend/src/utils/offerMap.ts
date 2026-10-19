import type { ApiOffer } from '../types/offer';

/**
 * Oferta gotowa do narysowania na mapie — tylko pola, których używa mapa, i współrzędne
 * zawsze liczbowe. Minimalny kształt, bo mapę karmią różne źródła (wyszukiwarka, pulpit).
 */
export interface MapOffer {
  id: string;
  name: string;
  lat: number;
  lon: number;
  imageUrl?: string | null;
  transactionType: string;
  price?: number | null;
  currency?: string | null;
  availableQuantity?: number | null;
}

/**
 * Oferty z /api/offer → piny mapy. API zwraca współrzędne czasem jako string; oferty bez
 * pozycji pomijamy. Kolejność odwrócona: pierwsze z odpowiedzi (najbliższe/polecane)
 * rysują się na końcu, czyli na wierzchu.
 */
export function offersForMap(offers: ApiOffer[]): (ApiOffer & MapOffer)[] {
  return offers
    .map((offer) => ({
      ...offer,
      lat: typeof offer.lat === 'string' ? parseFloat(offer.lat) : (offer.lat ?? offer.latitude ?? NaN),
      lon: typeof offer.lon === 'string' ? parseFloat(offer.lon) : (offer.lon ?? offer.longitude ?? NaN),
    }))
    .filter((offer): offer is ApiOffer & MapOffer => Number.isFinite(offer.lat) && Number.isFinite(offer.lon) && offer.lat !== 0 && offer.lon !== 0)
    .reverse();
}

/** Link do szczegółów oferty — ten sam kształt co w kafelku (OfferTile). */
export function offerHref(offer: Pick<ApiOffer, 'id' | 'name'>): string {
  return `/offers/${offer.id}/${encodeURIComponent(offer.name)}`;
}

/** Zoom mapy dopasowany do promienia wyszukiwania (km). */
export function zoomForRange(rangeKm: number): number {
  if (rangeKm <= 2) return 14;
  if (rangeKm <= 5) return 13;
  if (rangeKm <= 10) return 12;
  if (rangeKm <= 25) return 11;
  return 10;
}
