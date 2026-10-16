/** Typy raportu oszczędności — odpowiadają DTO z GET /api/v1/reports/savings. */

export interface CurrencyAmount {
  currency: string;
  /** Jackson serializuje BigDecimal jako liczbę JSON, więc skalę odtwarzamy przy formatowaniu. */
  amount: number;
}

export interface SavingsReport {
  /** Dzień początkowy zakresu (LocalDate "yyyy-MM-dd") albo null dla całości danych. */
  from: string | null;
  to: string | null;
  /** Firma, do której zawężono raport; null = cała platforma (tylko ADMIN). */
  storeId: number | null;
  savedProductsCount: number;
  valueByCurrency: CurrencyAmount[];
  estimatedKg: number;
  estimatedCo2Kg: number;
  /** Zawsze true — kg i CO2 są przybliżeniem, liczba sztuk i wartość są policzone. */
  estimated: boolean;
}

/**
 * Formatuje datę raportu.
 *
 * `from`/`to` to LocalDate ("2026-09-20"), czyli wartość BEZ czasu — nie wolno ich
 * przepuszczać przez `parseUtcTimestamp` z types/reservation.ts, bo ta funkcja dopina "Z"
 * i `new Date("2026-09-20Z")` daje Invalid Date. Tutaj nie ma też czego przeliczać między
 * strefami: backend operuje na dniach UTC i tak je prezentujemy (patrz adnotacja na ekranie).
 */
export function formatReportDate(value: string | null): string {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
}

/** Opis zakresu dat do nagłówka raportu. */
export function describeRange(from: string | null, to: string | null): string {
  if (!from && !to) return 'cały okres';
  if (from && to) return `${formatReportDate(from)} – ${formatReportDate(to)}`;
  if (from) return `od ${formatReportDate(from)}`;
  return `do ${formatReportDate(to)}`;
}

/** Liczba całkowita z separatorem tysięcy. */
export function formatCount(value: number): string {
  return new Intl.NumberFormat('pl-PL').format(value);
}

/**
 * Liczba szacunkowa — zawsze z dwoma miejscami po przecinku.
 *
 * BigDecimal 6.00 przychodzi z JSON jako 6, a samo „6 kg" czyta się jak wartość dokładną.
 * Dwa miejsca sygnalizują, że to wynik przeliczenia, nie zliczenia.
 */
export function formatEstimate(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Kwota w danej walucie; walut nie sumujemy, bo nie mamy kursów. */
export function formatMoney(amount: number, currency: string): string {
  return `${new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} ${currency}`;
}

/** Dzisiejszy dzień w formacie akceptowanym przez input[type=date]. */
export function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Pierwszy dzień miesiąca sprzed `monthsAgo` miesięcy oraz jego ostatni dzień. */
export function monthRange(monthsAgo: number): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: iso(start), to: iso(end) };
}
