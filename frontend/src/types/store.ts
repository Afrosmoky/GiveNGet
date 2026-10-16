/** Typy publicznego profilu sklepu — odpowiadają DTO z GET /api/v1/stores/{companyId}. */
import { OfferTile } from './offer';
import { PageResponse } from './reservation';

export interface StoreRating {
  average: number;
  count: number;
}

export interface StoreProfile {
  id: number;
  name: string;
  logoUrl: string | null;
  address: string | null;
  description: string | null;
  lat: number | null;
  lon: number | null;
  activeOffersCount: number;
  rating: StoreRating;
}

export type StoreOffersPage = PageResponse<OfferTile>;
