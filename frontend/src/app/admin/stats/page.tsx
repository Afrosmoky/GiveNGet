"use client";

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { environment } from '../../../config';
import { authorizedFetch, getUserData, isAuthenticated } from '../../../utils/auth';
import { describeApiError } from '../../../utils/apiErrors';
import { describeRange, formatCount, monthRange } from '../../../types/report';
import { PlatformStats } from '../../../types/platformStats';

type Authorization = 'checking' | 'granted' | 'denied';

/**
 * Statystyki platformy pod pilotaż (docs/08, pozycja 4) — tylko ADMIN, zgodnie z regułą
 * /api/v1/stats/**. Layout panelu wpuszcza też moderatora (EMPLOYEE), więc rolę
 * sprawdzamy dodatkowo tutaj. Wszystkie liczby liczy backend — tu tylko prezentacja.
 */
export default function PlatformStatsPage() {
  const router = useRouter();
  const [authorization, setAuthorization] = useState<Authorization>('checking');

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rangeError, setRangeError] = useState<string | null>(null);

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      setAuthorization('denied');
      router.replace('/login');
      return;
    }
    setAuthorization(getUserData()?.userType === 'ADMIN' ? 'granted' : 'denied');
  }, [router]);

  const loadStats = useCallback(async (rangeFrom: string, rangeTo: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (rangeFrom) params.set('from', rangeFrom);
      if (rangeTo) params.set('to', rangeTo);
      const query = params.toString();
      const response = await authorizedFetch(
        `${environment.apiUrl}/api/v1/stats/platform${query ? `?${query}` : ''}`
      );
      const body = await response.text();
      if (!response.ok) {
        setError(describeApiError(body, 'Nie udało się pobrać statystyk.'));
        return;
      }
      setStats(JSON.parse(body) as PlatformStats);
    } catch {
      setError('Błąd połączenia z serwerem. Sprawdź połączenie internetowe.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authorization === 'granted') {
      void loadStats('', '');
    }
  }, [authorization, loadStats]);

  const submitFilters = (nextFrom: string, nextTo: string) => {
    if (nextFrom && nextTo && nextFrom > nextTo) {
      setRangeError('Data początkowa nie może być późniejsza niż data końcowa.');
      return;
    }
    setRangeError(null);
    void loadStats(nextFrom, nextTo);
  };

  const applyPreset = (preset: 'current' | 'previous' | 'all') => {
    const range = preset === 'all' ? { from: '', to: '' } : monthRange(preset === 'current' ? 0 : 1);
    setFrom(range.from);
    setTo(range.to);
    submitFilters(range.from, range.to);
  };

  if (authorization !== 'granted') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-gray-600">
          {authorization === 'checking'
            ? 'Sprawdzanie uprawnień…'
            : 'Statystyki platformy są dostępne wyłącznie dla administratora.'}
        </p>
      </div>
    );
  }

  const isEmpty =
    stats !== null &&
    stats.users.total === 0 &&
    stats.stores.verified === 0 &&
    stats.offers.active === 0 &&
    stats.offers.createdInRange === 0 &&
    stats.reservations.createdInRange === 0 &&
    stats.pickups.collected === 0;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Statystyki pilotażu</h1>
        <p className="mt-1 text-sm text-gray-600">
          Liczby całej platformy do rozmów z siecią. Raport oszczędności per sklep jest w „Raport oszczędności”.
        </p>
      </header>

      {/* Filtr */}
      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitFilters(from, to);
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="stats-from" className="mb-1 block text-sm font-semibold text-gray-700">
                Od
              </label>
              <input
                id="stats-from"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-200 p-2.5 text-base transition-colors focus:border-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-200"
              />
            </div>
            <div>
              <label htmlFor="stats-to" className="mb-1 block text-sm font-semibold text-gray-700">
                Do
              </label>
              <input
                id="stats-to"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-200 p-2.5 text-base transition-colors focus:border-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-200"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-yellow-400 px-4 py-2.5 font-bold text-gray-900 transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Liczę…' : 'Pokaż'}
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <PresetButton label="Ten miesiąc" onClick={() => applyPreset('current')} disabled={loading} />
            <PresetButton label="Poprzedni miesiąc" onClick={() => applyPreset('previous')} disabled={loading} />
            <PresetButton label="Cały okres" onClick={() => applyPreset('all')} disabled={loading} />
          </div>
          {rangeError && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {rangeError}
            </p>
          )}
        </form>
      </section>

      {error && (
        <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading && !stats && <p className="text-gray-600">Ładowanie statystyk…</p>}

      {stats && (
        <div aria-busy={loading} className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <p className="mb-4 text-sm text-gray-600">
            Okres: <strong className="text-gray-900">{describeRange(stats.from, stats.to)}</strong>
          </p>

          {isEmpty && (
            <p className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              Na platformie nie ma jeszcze danych — wszystkie liczniki są zerowe.
            </p>
          )}

          <Group title="Użytkownicy" hint="konta konsumenckie">
            <Stat label="Konta łącznie" value={stats.users.total} kind="state" />
            <Stat label="Zweryfikowane" value={stats.users.verified} kind="state" />
            <Stat label="Nowe w okresie" value={stats.users.newInRange} kind="flow" />
          </Group>

          <Group title="Sklepy i oferty">
            <Stat label="Sklepy (zweryfikowane)" value={stats.stores.verified} kind="state" />
            <Stat label="Aktywne oferty" value={stats.offers.active} kind="state" />
            <Stat label="Oferty wystawione w okresie" value={stats.offers.createdInRange} kind="flow" />
          </Group>

          <Group title="Rezerwacje" hint="utworzone w okresie, według obecnego statusu">
            <Stat label="Łącznie" value={stats.reservations.createdInRange} kind="flow" />
            <Stat label="Aktywne" value={stats.reservations.byStatus.reserved} kind="flow" />
            <Stat label="Odebrane" value={stats.reservations.byStatus.collected} kind="flow" />
            <Stat label="Wygasłe" value={stats.reservations.byStatus.expired} kind="flow" />
            <Stat label="Anulowane" value={stats.reservations.byStatus.cancelled} kind="flow" />
          </Group>

          <Group title="Odbiory" hint="potwierdzone w okresie — ta sama definicja co raport oszczędności">
            <Stat label="Potwierdzone odbiory" value={stats.pickups.collected} kind="flow" />
            <Stat label="Uratowane sztuki" value={stats.pickups.savedUnits} kind="flow" highlight />
          </Group>

          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-gray-500">
            <li>
              <strong>Stan</strong> — liczone na teraz, niezależnie od wybranego okresu.{' '}
              <strong>W okresie</strong> — zdarzenia z wybranych dni.
            </li>
            <li>Dni liczone w UTC — doba kończy się w Polsce ok. 1:00–2:00.</li>
            <li>
              Rezerwacje według daty utworzenia, odbiory według daty odbioru — rezerwacja z końca okresu
              odebrana po nim liczy się do rezerwacji, ale nie do odbiorów.
            </li>
            <li>
              „Nowe w okresie” obejmuje konta z zapisaną datą założenia — konta sprzed 10.2026 jej nie mają
              i liczą się tylko do sumy.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-lg font-bold text-gray-900">
        {title}
        {hint && <span className="ml-2 text-sm font-normal text-gray-500">({hint})</span>}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{children}</div>
    </section>
  );
}

function Stat({
  label,
  value,
  kind,
  highlight = false,
}: {
  label: string;
  value: number;
  kind: 'state' | 'flow';
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 shadow-sm ${
        highlight ? 'border-green-200 bg-green-50 text-green-900' : 'border-gray-200 bg-white text-gray-900'
      }`}
    >
      <div className="text-2xl font-extrabold">{formatCount(value)}</div>
      <div className="text-sm">{label}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-gray-500">
        {kind === 'state' ? 'stan' : 'w okresie'}
      </div>
    </div>
  );
}

function PresetButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label}
    </button>
  );
}
