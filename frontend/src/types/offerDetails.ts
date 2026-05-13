import { OfferStatus, UserRank } from './offer';

export interface OfferDetails {
  id: string;
  name: string;
  description: string;
  transactionType: string;
  status?: OfferStatus;
  expiryDate: string;
  pickupDateFrom?: string;
  pickupDateTo?: string;
  createdAt: string;
  updatedAt: string;
  price: number;
  currency: string;
  location: string;
  latitude: number;
  longitude: number;
  imageUrls: string[];
  sellerId: number;
  sellerEmail: string;
  sellerPhoneNumber: string;
  sellerAvatar: string;
  sellerName: string;
  sellerType: "REGULAR" | "COMPANY";
  sellerRank?: UserRank;
  sellerTrustPoints?: number;
  isFavorite?: boolean;
  categoryId?: number;
  subcategoryId?: number;
} 