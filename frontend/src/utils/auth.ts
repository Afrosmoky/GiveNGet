// Moduł do zarządzania autoryzacją i tokenami

export interface AuthTokenData {
  token: string;
  tokenType: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  id: number;
  profilePhotoUrl: string;
  userType: 'REGULAR' | 'COMPANY' | 'EMPLOYEE' | 'ADMIN';
  lang: string;
  currency: string;
  lat: number;
  lon: number;
  bio?: string;
  userRank?: string;
  trustPoints?: number;
  freeOffersCount?: number;
}

// Listener do powiadamiania o zmianach stanu logowania
let authChangeListeners: (() => void)[] = [];

export const addAuthChangeListener = (listener: () => void) => {
  authChangeListeners.push(listener);
};

export const removeAuthChangeListener = (listener: () => void) => {
  authChangeListeners = authChangeListeners.filter(l => l !== listener);
};

const notifyAuthChange = () => {
  authChangeListeners.forEach(listener => listener());
};

// Pobieranie tokenu z localStorage
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
};

// Pobieranie typu tokenu z localStorage
export const getTokenType = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('tokenType') || 'Bearer';
  }
  return 'Bearer';
};

// Pobieranie wszystkich danych użytkownika z localStorage
export const getUserData = (): Partial<AuthTokenData> | null => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('authToken');
    if (!token) return null;

    const userType = localStorage.getItem('userType') as 'REGULAR' | 'COMPANY' | 'EMPLOYEE' | 'ADMIN' | null;

    return {
      token,
      tokenType: localStorage.getItem('tokenType') || 'Bearer',
      email: localStorage.getItem('userEmail') || '',
      firstName: localStorage.getItem('userFirstName') || '',
      lastName: localStorage.getItem('userLastName') || '',
      id: parseInt(localStorage.getItem('userId') || '0'),
      profilePhotoUrl: localStorage.getItem('userPhotoUrl') || '',
      phoneNumber: localStorage.getItem('userPhoneNumber') || '',
      userType: userType || undefined,
      lang: localStorage.getItem('userLang') || 'pl',
      currency: localStorage.getItem('userCurrency') || 'PLN',
      lat: parseFloat(localStorage.getItem('userLat') || '0'),
      lon: parseFloat(localStorage.getItem('userLon') || '0'),
      bio: localStorage.getItem('userBio') || '',
      userRank: localStorage.getItem('userRank') || undefined,
      trustPoints: parseInt(localStorage.getItem('trustPoints') || '0') || undefined,
      freeOffersCount: parseInt(localStorage.getItem('freeOffersCount') || '5') || undefined
    };
  }
  return null;
};

// Sprawdzanie czy użytkownik jest zalogowany
export const isAuthenticated = (): boolean => {
  return getAuthToken() !== null;
};

// Zapisywanie danych po zalogowaniu
export const saveAuthData = (data: AuthTokenData): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('tokenType', data.tokenType || 'Bearer');
    localStorage.setItem('userEmail', data.email);
    localStorage.setItem('userFirstName', data.firstName);
    localStorage.setItem('userLastName', data.lastName);
    localStorage.setItem('userPhoneNumber', data.phoneNumber);
    localStorage.setItem('userId', data.id.toString());
    localStorage.setItem('userType', data.userType);
    if (data.profilePhotoUrl) {
    localStorage.setItem('userPhotoUrl', data.profilePhotoUrl);
    }
    localStorage.setItem('userLang', data.lang || 'pl');
    localStorage.setItem('userCurrency', data.currency || 'PLN');
    localStorage.setItem('userLat', data.lat?.toString() || '0');
    localStorage.setItem('userLon', data.lon?.toString() || '0');
    if (data.bio) {
      localStorage.setItem('userBio', data.bio);
    }
    if (data.userRank) {
      localStorage.setItem('userRank', data.userRank);
    }
    if (data.trustPoints !== undefined) {
      localStorage.setItem('trustPoints', data.trustPoints.toString());
    }
    if (data.freeOffersCount !== undefined) {
      localStorage.setItem('freeOffersCount', data.freeOffersCount.toString());
    }
    console.log('Photo url: ', data.profilePhotoUrl);
    notifyAuthChange();
  }
};

// Wylogowanie - usunięcie wszystkich danych z localStorage
export const logout = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
    localStorage.removeItem('tokenType');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userFirstName');
    localStorage.removeItem('userLastName');
    localStorage.removeItem('userId');
    localStorage.removeItem('userPhotoUrl');
    localStorage.removeItem('userType');
    localStorage.removeItem('userPhoneNumber');
    localStorage.removeItem('userLang');
    localStorage.removeItem('userCurrency');
    localStorage.removeItem('userLat');
    localStorage.removeItem('userLon');
    localStorage.removeItem('userBio');
    localStorage.removeItem('userRank');
    localStorage.removeItem('trustPoints');
    localStorage.removeItem('freeOffersCount');
    notifyAuthChange();
  }
};

// Tworzenie nagłówków z autoryzacją
export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  const tokenType = getTokenType();
  
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `${tokenType} ${token}`;
  }

  return headers;
};

// Pomocnicza funkcja do wysyłania autoryzowanych requestów
export const authorizedFetch = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const authHeaders = getAuthHeaders();
  
  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers
    },
    mode: 'cors'
  };

  // Jeśli body jest FormData, nie ustawiaj Content-Type (browser ustawi automatycznie)
  if (options.body instanceof FormData) {
    const headers = mergedOptions.headers as Record<string, string>;
    delete headers['Content-Type'];
  } else if (typeof options.body === 'string' || options.body instanceof ArrayBuffer || options.body instanceof Uint8Array) {
    // Dla JSON i innych typów danych ustaw Content-Type jeśli nie jest podany
    const headers = mergedOptions.headers as Record<string, string>;
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  return fetch(url, mergedOptions);
};

// Weryfikacja tokenu na serwerze
export const verifyToken = async (): Promise<boolean> => {
  const token = getAuthToken();
  if (!token) {
    return false;
  }

  try {
    const { environment } = await import('../config');
    const response = await authorizedFetch(`${environment.apiUrl}/api/auth/validate`);
    if (response.ok) {
      return true;
    } else if (response.status === 401) {
      // Token nieprawidłowy - wyczyść dane i wyloguj
      logout();
      return false;
    } else {
      // Inny błąd - traktuj jako problem z połączeniem, nie wylogowuj
      console.error('Błąd weryfikacji tokenu:', response.status);
      return true; // Daj użytkownikowi szansę na kontynuację
    }
  } catch (error) {
    console.error('Błąd połączenia podczas weryfikacji tokenu:', error);
    return true; // Daj użytkownikowi szansę na kontynuację
  }
};

// Przekierowanie na stronę logowania z informacją o wymaganej autoryzacji
export const redirectToLogin = (targetPage?: string): void => {
  if (typeof window !== 'undefined') {
    const currentPath = targetPage || window.location.pathname;
    const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}&message=auth-required`;
    window.location.href = loginUrl;
  }
};

// Pobieranie języka użytkownika
export const getUserLang = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userLang') || 'pl';
  }
  return 'pl';
};

// Pobieranie waluty użytkownika
export const getUserCurrency = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userCurrency') || 'PLN';
  }
  return 'PLN';
};

// Pobieranie lokalizacji użytkownika
export const getUserLocation = (): { lat: number; lon: number } => {
  if (typeof window !== 'undefined') {
    return {
      lat: parseFloat(localStorage.getItem('userLat') || '0'),
      lon: parseFloat(localStorage.getItem('userLon') || '0')
    };
  }
  return { lat: 0, lon: 0 };
};

// Aktualizacja danych użytkownika (częściowa aktualizacja)
export const updateUserData = (updates: Partial<AuthTokenData>): void => {
  if (typeof window !== 'undefined') {
    if (updates.firstName) localStorage.setItem('userFirstName', updates.firstName);
    if (updates.lastName) localStorage.setItem('userLastName', updates.lastName);
    if (updates.phoneNumber) localStorage.setItem('userPhoneNumber', updates.phoneNumber);
    if (updates.profilePhotoUrl) localStorage.setItem('userPhotoUrl', updates.profilePhotoUrl);
    if (updates.lang) localStorage.setItem('userLang', updates.lang);
    if (updates.currency) localStorage.setItem('userCurrency', updates.currency);
    if (updates.lat !== undefined) localStorage.setItem('userLat', updates.lat.toString());
    if (updates.lon !== undefined) localStorage.setItem('userLon', updates.lon.toString());
    if (updates.bio !== undefined) localStorage.setItem('userBio', updates.bio);
    if (updates.userRank !== undefined) localStorage.setItem('userRank', updates.userRank);
    if (updates.trustPoints !== undefined) localStorage.setItem('trustPoints', updates.trustPoints.toString());
    if (updates.freeOffersCount !== undefined) localStorage.setItem('freeOffersCount', updates.freeOffersCount.toString());
    
    notifyAuthChange();
  }
};

// Pobieranie danych aktualnego użytkownika z backendu
export const fetchCurrentUserData = async (): Promise<void> => {
  try {
    const user = getUserData();
    if (!user || !user.id) return;

    const { environment } = await import('../config');
    const response = await authorizedFetch(`${environment.apiUrl}/api/profile/${user.id}?withOffers=false&withRate=false`);
    
    if (response.ok) {
      const responseData = await response.json();
      const userData = responseData.userData;
      
      // Aktualizuj localStorage z danymi z backendu
      if (userData.description) {
        localStorage.setItem('userBio', userData.description);
      }
      if (userData.name) {
        const nameParts = userData.name.split(' ');
        if (nameParts.length >= 2) {
          localStorage.setItem('userFirstName', nameParts[0]);
          localStorage.setItem('userLastName', nameParts.slice(1).join(' '));
        }
      }
      if (userData.logoUrl) {
        localStorage.setItem('userPhotoUrl', userData.logoUrl);
      }
      
      notifyAuthChange();
    }
  } catch (error) {
    console.error('Błąd podczas pobierania danych użytkownika:', error);
  }
};

// Mechanizm zapobiegający wielokrotnym wywołaniom dla tej samej oferty
const clickedOffers = new Map<string, number>();
const CLICK_COOLDOWN = 3000; // 3 sekundy - czas między kliknięciami dla tej samej oferty

// Zapisanie kliknięcia w ofertę (dla statystyk CTR)
// Endpoint zawsze zwraca OK, więc funkcja nie rzuca błędów
// Zabezpiecza przed wielokrotnymi wywołaniami dla tej samej oferty
export const trackOfferClick = async (offerId: string): Promise<void> => {
  const now = Date.now();
  const lastClickTime = clickedOffers.get(offerId);
  
  // Jeśli kliknięcie było już zarejestrowane w ostatnich CLICK_COOLDOWN milisekundach, zignoruj
  if (lastClickTime && (now - lastClickTime) < CLICK_COOLDOWN) {
    console.debug(`Kliknięcie w ofertę ${offerId} zignorowane - zbyt szybko po poprzednim kliknięciu`);
    return;
  }
  
  // Zapisz czas kliknięcia
  clickedOffers.set(offerId, now);
  
  // Wyczyść stare wpisy (starsze niż CLICK_COOLDOWN * 2) aby nie zapchać pamięci
  const cutoffTime = now - (CLICK_COOLDOWN * 2);
  for (const [id, clickTime] of clickedOffers.entries()) {
    if (clickTime < cutoffTime) {
      clickedOffers.delete(id);
    }
  }
  
  try {
    const { environment } = await import('../config');
    await authorizedFetch(`${environment.apiUrl}/api/offer/${offerId}/click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    // Nie logujemy sukcesu - endpoint zawsze zwraca OK, nawet dla niezalogowanych użytkowników
  } catch (error) {
    // Cicho ignorujemy błędy - endpoint powinien zawsze zwracać OK,
    // więc nie przerywamy działania aplikacji
    console.debug('Nie udało się zapisać kliknięcia w ofertę:', error);
  }
};
