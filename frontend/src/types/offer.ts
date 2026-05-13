// Typ dla transakcji
export type TransactionType = 'free' | 'exchange' | 'sale';

// Typ dla statusu oferty
export type OfferStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING_VERIFICATION';

// Typ dla rang użytkowników
export type UserRank = 'STARTER' | 'RELIABLE_SELLER' | 'TRUSTED_PARTNER' | 'LOCAL_HERO' | 'AMBASSADOR';

// Nowe interfejsy dla kategorii z allowedTransactionTypes
export interface Subcategory {
  id: number;
  name: string;
  allowedTransactionTypes: string; // JSON string
  category?: {
    id: number;
    name: string;
  };
}

export interface Category {
  id: number;
  name: string;
  allowedTransactionTypes: string; // JSON string
  subcategories: Subcategory[];
}

// Mapowanie statusów na polskie nazwy
export const STATUS_LABELS: Record<OfferStatus, string> = {
  ACTIVE: 'Aktywna',
  INACTIVE: 'Nieaktywna',
  PENDING_VERIFICATION: 'Do weryfikacji'
};

// Mapowanie rang na polskie nazwy
export const RANK_LABELS: Record<UserRank, string> = {
  STARTER: 'Nowicjusz',
  RELIABLE_SELLER: 'Rzetelny Sprzedawca',
  TRUSTED_PARTNER: 'Zaufany Partner',
  LOCAL_HERO: 'Bohater Lokalny',
  AMBASSADOR: 'Ambasador'
};

// Wymagania dla każdej rangi
export const RANK_REQUIREMENTS: Record<UserRank, { minRating: number; minTrustPoints: number; freeOffers: number }> = {
  STARTER: { minRating: 0, minTrustPoints: 0, freeOffers: 5 },
  RELIABLE_SELLER: { minRating: 4.0, minTrustPoints: 100, freeOffers: 10 },
  TRUSTED_PARTNER: { minRating: 4.5, minTrustPoints: 300, freeOffers: 10 },
  LOCAL_HERO: { minRating: 4.7, minTrustPoints: 700, freeOffers: 10 },
  AMBASSADOR: { minRating: 4.9, minTrustPoints: 1500, freeOffers: 10 }
};

// Korzyści dla każdej rangi
export const RANK_BENEFITS: Record<UserRank, string[]> = {
  STARTER: [
    '5 darmowych ofert miesięcznie',
    'Podstawowa widoczność ogłoszeń'
  ],
  RELIABLE_SELLER: [
    'Większa widoczność ogłoszeń',
    '+5 darmowych ofert (10 łącznie)',
    'Priorytet w wynikach wyszukiwania'
  ],
  TRUSTED_PARTNER: [
    'Odznaka profilu',
    'Promowane miejsce w wynikach',
    'Zniżka 20% na boosty',
    '10 darmowych ofert miesięcznie'
  ],
  LOCAL_HERO: [
    'Priorytet w mapie i wyszukiwarce',
    'Statystyki "ile uratowałeś jedzenia"',
    'Darmowy boost raz w miesiącu',
    '10 darmowych ofert miesięcznie'
  ],
  AMBASSADOR: [
    'Wyróżnienie na mapie jako Ambasador',
    'Zniżki 40% na wszystkie płatne funkcje',
    'Wcześniejszy dostęp do nowych opcji',
    '10 darmowych ofert miesięcznie'
  ]
};

// Interfejs dla surowych danych z API - obsługuje różne warianty nazw pól
export interface ApiOffer {
  id: string;
  name: string;
  location?: string;
  lat?: number;
  lon?: number;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  image?: string;
  imageUrls?: string[];
  transactionType: TransactionType;
  status?: OfferStatus;
  isFavorite?: boolean;
  distance?: string;
  recommended?: boolean;
  categoryId?: number;
  subcategoryId?: number;
}

export interface OfferTile {
  id: string;
  name: string;
  location: string;
  lat: number;
  lon: number;
  distance?: string | null;
  imageUrl: string;
  transactionType: TransactionType;
  status?: OfferStatus;
  isFavorite?: boolean;
  categoryId?: number;
  subcategoryId?: number;
  sellerRank?: UserRank;
  sellerTrustPoints?: number;
}

export interface OfferTileProps extends OfferTile {
  width?: number;
  height?: number;
  imageWidth?: number;
  imageHeight?: number;
}

// Funkcje pomocnicze dla nowej struktury kategorii
export const parseAllowedTypes = (allowedTypesString: string): TransactionType[] => {
  try {
    return JSON.parse(allowedTypesString);
  } catch (error) {
    console.error('Błąd parsowania allowedTransactionTypes:', error);
    return ['free', 'exchange', 'sale']; // fallback
  }
};

export const isTransactionAllowed = (category: Category, subcategory: Subcategory | null, transactionType: TransactionType): boolean => {
  const types = parseAllowedTypes(subcategory?.allowedTransactionTypes || category.allowedTransactionTypes);
  return types.includes(transactionType);
};

export const getAllowedTransactionTypes = (category: Category, subcategory: Subcategory | null): TransactionType[] => {
  const types = parseAllowedTypes(subcategory?.allowedTransactionTypes || category.allowedTransactionTypes);
  return (['free', 'exchange', 'sale'] as TransactionType[]).filter(type => types.includes(type));
};

export const getTransactionTypeMessage = (category: Category, subcategory: Subcategory | null, userType?: string): string | null => {
  const allowedTypes = parseAllowedTypes(subcategory?.allowedTransactionTypes || category.allowedTransactionTypes);
  
  if (!allowedTypes.includes('sale')) {
    // Sprawdź czy to podkategoria z ograniczeniami
    if (subcategory?.name === 'Plony z działki (domowe)') {
      return "Ta podkategoria nie pozwala na sprzedaż - dostępne tylko darowizna i wymiana";
    } else if (subcategory?.name === 'Dania domowe') {
      return "Ta podkategoria nie pozwala na sprzedaż - dostępne tylko darowizna i wymiana";
    } else if (category.name === 'Dania domowe (prywatne)') {
      return "Ta kategoria nie pozwala na sprzedaż - dostępne tylko darowizna i wymiana";
    } else {
      return "Ta kategoria nie pozwala na sprzedaż - dostępne tylko darowizna i wymiana";
    }
  }
  
  // Sprawdź ograniczenia dla kont firmowych
  if (category.name === 'Nadwyżki restauracyjne/sklepowe' && userType !== 'COMPANY') {
    return "Sprzedaż w tej kategorii dostępna tylko dla kont firmowych";
  }
  
  if (subcategory?.name === 'Nadwyżki restauracyjne' && userType !== 'COMPANY') {
    return "Sprzedaż w tej podkategorii dostępna tylko dla kont firmowych";
  }
  
  return null;
};

// Funkcja do sprawdzania ograniczeń produktów
export const getProductRestrictions = (category: Category): string | null => {
  if (category.name === 'Dziecko i niemowlę') {
    return "Ta kategoria wymaga tylko zamkniętych/opakowanych produktów";
  }
  
  if (category.name === 'Karma dla zwierząt') {
    return "Ta kategoria wymaga tylko zamkniętych produktów, nie do spożycia przez ludzi";
  }
  
  return null;
}; 