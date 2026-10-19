import { parseApiError } from '../../utils/apiErrors';
import type { ReservationStatus } from '../../types/reservation';

/**
 * Wynik nieudanej próby potwierdzenia odbioru, gotowy do pokazania przy kasie.
 *
 * Rozgałęziamy wyłącznie po `code` (i `details.status` dla RESERVATION_NOT_COLLECTABLE) —
 * nigdy po treści `message`. O tym, czy rezerwację da się wydać, rozstrzyga backend;
 * tu tylko tłumaczymy jego odpowiedź na polecenie dla pracownika.
 */
export interface PickupFailure {
  /** Krótki nagłówek panelu — czytelny z odległości. */
  title: string;
  /** Co się stało i co zrobić. */
  message: string;
  /** Status rezerwacji z backendu, gdy jest znany — do plakietki. */
  status?: ReservationStatus;
  /**
   * Czy warto poprawić kod i spróbować ponownie (literówka, chwilowy limit, sieć).
   * Dla rezerwacji odebranej, wygasłej czy z innego sklepu ponowienie nic nie zmieni.
   */
  retryable: boolean;
}

const RESERVATION_STATUSES: ReservationStatus[] = ['RESERVED', 'COLLECTED', 'EXPIRED', 'CANCELLED'];

function notCollectable(status: unknown): PickupFailure {
  const known = RESERVATION_STATUSES.includes(status as ReservationStatus) ? (status as ReservationStatus) : undefined;
  switch (known) {
    case 'COLLECTED':
      return {
        title: 'Już odebrana',
        message: 'Tę rezerwację wydano wcześniej. Nie wydawaj towaru drugi raz.',
        status: known,
        retryable: false,
      };
    case 'EXPIRED':
      return {
        title: 'Rezerwacja wygasła',
        message: 'Termin odbioru minął, a sztuki wróciły do sprzedaży. Klient może zarezerwować ofertę ponownie, jeśli jest dostępna.',
        status: known,
        retryable: false,
      };
    case 'CANCELLED':
      return {
        title: 'Rezerwacja anulowana',
        message: 'Klient anulował tę rezerwację. Nie wydawaj towaru na ten kod.',
        status: known,
        retryable: false,
      };
    default:
      return {
        title: 'Nie można wydać',
        message: 'Tej rezerwacji nie można już odebrać.',
        status: known,
        retryable: false,
      };
  }
}

/**
 * Tłumaczy odpowiedź błędu z POST /api/v1/reservations/collect.
 *
 * @param httpStatus status odpowiedzi — używany tylko, gdy treść nie jest w formacie 6.3
 *                   (np. 401/403 z filtra bezpieczeństwa przy wygasłym tokenie)
 * @param body       surowa treść odpowiedzi
 */
export function describePickupFailure(httpStatus: number, body: string): PickupFailure {
  const apiError = parseApiError(body);

  if (!apiError) {
    if (httpStatus === 401 || httpStatus === 403) {
      return {
        title: 'Sesja wygasła',
        message: 'Zaloguj się ponownie, żeby dalej potwierdzać odbiory.',
        retryable: false,
      };
    }
    return {
      title: 'Nie potwierdzono odbioru',
      message: 'Serwer nie odpowiedział poprawnie. Spróbuj ponownie za chwilę.',
      retryable: true,
    };
  }

  switch (apiError.code) {
    case 'INVALID_PICKUP_CODE':
      return {
        title: 'Nieprawidłowy kod',
        message: 'Nie ma rezerwacji z takim kodem. Sprawdź kod na telefonie klienta i wpisz go jeszcze raz.',
        retryable: true,
      };
    case 'RESERVATION_NOT_COLLECTABLE':
      return notCollectable(apiError.details?.status);
    case 'FORBIDDEN':
      // Backend zwraca ten kod dla rezerwacji z innego sklepu i dla konta bez przypisanego
      // sklepu. Przy kasie pierwszy przypadek jest jedynym realnym, drugi to błąd konfiguracji.
      return {
        title: 'Oferta innego sklepu',
        message: 'Ten kod dotyczy rezerwacji w innym sklepie — nie wydawaj towaru. Jeśli to na pewno Wasza oferta, zgłoś to kierownikowi.',
        retryable: false,
      };
    case 'EMPLOYEE_DEACTIVATED':
      return {
        title: 'Konto dezaktywowane',
        message: 'Sklep dezaktywował Twoje konto pracownika, więc nie możesz potwierdzać odbiorów. Skontaktuj się z kierownikiem.',
        retryable: false,
      };
    case 'RATE_LIMIT_EXCEEDED': {
      const seconds = Number(apiError.details?.retryAfterSeconds);
      const wait = Number.isFinite(seconds) && seconds > 0 ? `${Math.ceil(seconds)} s` : 'chwilę';
      return {
        title: 'Za dużo prób',
        message: `Zbyt wiele prób w krótkim czasie. Odczekaj ${wait} i spróbuj ponownie.`,
        retryable: true,
      };
    }
    default:
      return {
        title: 'Nie potwierdzono odbioru',
        message: apiError.message,
        retryable: true,
      };
  }
}

/** Błąd sieci — żądanie nie dotarło albo odpowiedź nie wróciła. */
export const NETWORK_FAILURE: PickupFailure = {
  title: 'Brak połączenia',
  // Odpowiedź mogła zginąć już po zapisie w backendzie — stąd wskazówka o „Już odebrana”
  message: 'Nie udało się połączyć z serwerem. Sprawdź internet i spróbuj ponownie. Jeśli zobaczysz „Już odebrana”, odbiór zapisał się za pierwszym razem.',
  retryable: true,
};
