/** Typy rezerwacji — odpowiadają DTO z /api/v1/reservations. */

export type ReservationStatus = 'RESERVED' | 'COLLECTED' | 'EXPIRED' | 'CANCELLED';

export interface Reservation {
  id: string;
  offerId: string;
  offerName: string | null;
  offerImageUrl: string | null;
  quantity: number;
  status: ReservationStatus;
  pickupCode: string;
  /** Treść do zakodowania w QR: "id:pickupCode". */
  qrPayload: string;
  createdAt: string;
  expiresAt: string;
  collectedAt: string | null;
  cancelledAt: string | null;
  /** Wypełniane tylko w odpowiedzi tworzenia rezerwacji; na liście null. */
  offerAvailableQuantity: number | null;
}

/** Koperta paginacji z CLAUDE.md 6.4. */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Etykiety statusu dla klienta. Kolor plakietki daje StatusPill (reservationPillStatus). */
export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  RESERVED: 'Aktywna',
  COLLECTED: 'Odebrana',
  EXPIRED: 'Wygasła',
  CANCELLED: 'Anulowana',
};

/**
 * Czy pokazać akcję „Rezerwuj” — jedna reguła dla szczegółów oferty i kafelka.
 * Rezerwować może tylko konto konsumenckie (ROLE_USER wynika z UserType.REGULAR) i tylko
 * cudzą ofertę z liczoną dostępnością. Firma, pracownik sklepu, moderator i admin zostaliby
 * odrzuceni przez backend, więc nie pokazujemy im akcji, której nie wykonają.
 * To tylko decyzja o widoczności — uprawnienia i dostępność egzekwuje backend.
 */
export function canReserveOffer(
  viewer: { id?: number; userType?: string } | null | undefined,
  offer: { sellerId?: number | null; availableQuantity?: number | null }
): boolean {
  return (
    viewer?.userType === 'REGULAR' &&
    viewer.id !== offer.sellerId &&
    typeof offer.availableQuantity === 'number'
  );
}

/** Czy rezerwację da się jeszcze anulować — backend i tak to weryfikuje. */
export function isCancellable(reservation: Reservation): boolean {
  return reservation.status === 'RESERVED';
}

/**
 * Parsuje znacznik czasu z backendu.
 *
 * Backend trzyma czasy rezerwacji w UTC i serializuje je jako LocalDateTime, czyli BEZ
 * oznaczenia strefy ("2026-09-20T10:00:00"). `new Date()` potraktowałby taki string jako
 * czas lokalny i data wygaśnięcia pokazałaby się przesunięta (w Polsce o 1–2 h).
 * Dopinamy więc "Z", gdy strefy nie ma.
 */
export function parseUtcTimestamp(value: string): Date {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}

/** Data i godzina w strefie użytkownika; pusta wartość → kreska. */
export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = parseUtcTimestamp(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Sama godzina, bez daty — panel pracownika potwierdza odbiory w bieżącym dniu. */
export function formatTime(value: string | null): string {
  if (!value) return '—';
  const date = parseUtcTimestamp(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Wyciąga kod odbioru z zeskanowanej treści QR.
 *
 * QR generowany przez PickupCodeCard koduje `qrPayload` w formacie "id:pickupCode".
 * Gdy dwukropka nie ma, traktujemy całość jako kod — tak wygląda kod wpisany ręcznie
 * i tak wyglądałby QR z samym kodem. Normalizacja (trim + wielkie litery) jest ta sama
 * dla obu ścieżek, żeby skan i wpisanie ręczne zachowywały się identycznie; backend
 * normalizuje niezależnie, to jest tylko dla UX.
 */
export function extractPickupCode(scanned: string): string {
  if (!scanned) return '';
  const separatorIndex = scanned.lastIndexOf(':');
  const raw = separatorIndex >= 0 ? scanned.slice(separatorIndex + 1) : scanned;
  return raw.trim().toUpperCase();
}

/** Czy termin odbioru już minął (pomocne, gdy scheduler jeszcze nie przestawił statusu). */
export function isExpiredByTime(value: string | null): boolean {
  if (!value) return false;
  const date = parseUtcTimestamp(value);
  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
}

/**
 * Rezerwacja widziana przez sklep — GET /api/v1/reservations/for-store (docs/08 #8).
 * Bez kodu odbioru (zna go tylko klient) i bez danych kontaktowych klienta — tylko imię.
 */
export interface StoreReservation {
  id: string;
  status: ReservationStatus;
  quantity: number;
  offerId: string | null;
  offerName: string | null;
  offerImageUrl: string | null;
  customerFirstName: string | null;
  createdAt: string;
  expiresAt: string | null;
  collectedAt: string | null;
  cancelledAt: string | null;
}

/** Etykiety statusu z perspektywy sklepu („Aktywna” klienta to dla sklepu „Do odbioru”). */
export const STORE_RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  RESERVED: 'Do odbioru',
  COLLECTED: 'Odebrana',
  EXPIRED: 'Wygasła',
  CANCELLED: 'Anulowana',
};
