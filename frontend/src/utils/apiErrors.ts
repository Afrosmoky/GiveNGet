/**
 * Obsługa błędów w formacie /api/v1 (CLAUDE.md 6.3): { code, message, details }.
 *
 * Klient rozgałęzia się po `code`, nigdy po treści komunikatu — `message` jest tekstem
 * dla użytkownika i może się zmienić bez zmiany kontraktu.
 *
 * Stare endpointy zwracają czysty tekst, więc parsowanie musi umieć wrócić do fallbacku
 * zamiast wyrzucić wyjątek na wyjątku.
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Komunikaty dla kodów, w których chcemy powiedzieć użytkownikowi coś konkretniejszego. */
const MESSAGES: Record<string, string> = {
  PRICE_REQUIRED: 'Podaj cenę — oferta sprzedażowa nie może być bez ceny.',
  INVALID_PRICE: 'Nieprawidłowa cena. Musi być większa od zera i mieć najwyżej 2 miejsca po przecinku.',
  PRICE_NOT_ALLOWED_FOR_FREE: 'Oferta „za darmo" i „wymiana" nie może mieć ceny. Zmień typ oferty na „Sprzedaż" albo usuń cenę.',
  INVALID_CURRENCY: 'Nieobsługiwana waluta. Dostępne: PLN, EUR, GBP.',
  FORBIDDEN: 'Nie masz uprawnień do tej operacji.',
  VALIDATION_FAILED: 'Formularz zawiera błędy — popraw zaznaczone pola.',
  CONSENT_REQUIRED: 'Aby założyć konto, zaakceptuj regulamin i politykę prywatności.',

  // Rezerwacje
  OFFER_NOT_AVAILABLE: 'Ta oferta nie jest już dostępna w wybranej liczbie sztuk. Odśwież stronę i sprawdź aktualną dostępność.',
  OFFER_NOT_FOUND: 'Oferta nie została znaleziona.',
  STORE_NOT_FOUND: 'Ten sklep nie istnieje albo nie jest już dostępny.',
  RESERVATION_NOT_FOUND: 'Rezerwacja nie została znaleziona.',
  RESERVATION_NOT_CANCELLABLE: 'Tej rezerwacji nie można już anulować — została odebrana, anulowana albo wygasła.',
  RESERVATION_NOT_COLLECTABLE: 'Tej rezerwacji nie można odebrać.',
  INVALID_PICKUP_CODE: 'Nie znaleziono rezerwacji o podanym kodzie odbioru.',
  EMPLOYEE_DEACTIVATED: 'Twoje konto pracownika zostało dezaktywowane przez sklep. Skontaktuj się z kierownikiem.',

  // Pracownicy sklepu (panel firmy)
  EMAIL_ALREADY_EXISTS: 'Konto o tym adresie e-mail już istnieje. Użyj innego adresu.',
  STORE_EMPLOYEE_NOT_FOUND: 'Nie znaleziono tego pracownika. Odśwież listę.',
  INVALID_DATE_RANGE: 'Data początkowa nie może być późniejsza niż data końcowa.',

  // Import ofert z Excela — błędy całego pliku. Błędy pojedynczych wierszy (brak
  // wartości, zła kategoria, zła godzina…) celowo nie mają tu wpisów: komunikat
  // z backendu wskazuje konkretną kolumnę i wartość, a ogólny tekst by to zgubił.
  FILE_REQUIRED: 'Wybierz plik .xlsx do importu.',
  INVALID_FILE_TYPE: 'Nieobsługiwany typ pliku. Prześlij arkusz Excel w formacie .xlsx (nie .xls ani .csv).',
  FILE_TOO_LARGE: 'Plik jest za duży (maks. 2 MB). Podziel go na mniejsze części.',
  FILE_UNREADABLE: 'Nie udało się odczytać pliku. Upewnij się, że to poprawny, niezaszyfrowany arkusz .xlsx.',
  EMPTY_FILE: 'Plik nie zawiera żadnych ofert. Uzupełnij wiersze pod nagłówkami.',
  TOO_MANY_ROWS: 'Plik zawiera za dużo wierszy (maks. 500). Podziel go na mniejsze części.',
};

/**
 * Próbuje odczytać treść błędu jako ApiError. Zwraca null, gdy odpowiedź nie jest
 * w tym formacie (np. stary endpoint zwracający goły tekst).
 */
export function parseApiError(body: string): ApiError | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed.code === 'string' && typeof parsed.message === 'string') {
      return parsed as ApiError;
    }
  } catch {
    // Nie JSON — obsłuży fallback
  }
  return null;
}

/**
 * Buduje komunikat dla użytkownika z treści odpowiedzi błędu.
 *
 * @param body       surowa treść odpowiedzi
 * @param fallback   komunikat, gdy odpowiedź nie jest w formacie 6.3 i nie ma treści
 */
export function describeApiError(body: string, fallback: string): string {
  const apiError = parseApiError(body);
  if (apiError) {
    return MESSAGES[apiError.code] || apiError.message;
  }
  return body || fallback;
}

/**
 * Komunikat dla znanego kodu błędu, gdy kod przyszedł w treści odpowiedzi, a nie jako
 * błąd całego żądania (np. raport błędów importu per wiersz). Brak wpisu = komunikat serwera.
 */
export function describeErrorCode(code: string, serverMessage: string): string {
  return MESSAGES[code] || serverMessage;
}
