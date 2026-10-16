"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { environment } from '../../../config';
import { authorizedFetch, getUserData, isAuthenticated } from '../../../utils/auth';
import { describeApiError } from '../../../utils/apiErrors';
import PickupScanner from '../../../components/PickupScanner';
import { Reservation, extractPickupCode, formatTime } from '../../../types/reservation';

/** Role dopuszczone do panelu — zgodnie z regułą /api/v1/reservations/collect. */
const ALLOWED_USER_TYPES = ['STORE_EMPLOYEE', 'ADMIN'] as const;

type Authorization = 'checking' | 'granted' | 'denied';

export default function StorePickupPage() {
  const router = useRouter();
  const [authorization, setAuthorization] = useState<Authorization>('checking');
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCollected, setLastCollected] = useState<Reservation | null>(null);
  const [sessionCount, setSessionCount] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  /** Chroni przed dubletem, gdy skaner odczyta ten sam kod kilka razy pod rząd. */
  const inFlightRef = useRef(false);

  // Bramka roli. AuthGuard zna tylko fakt zalogowania, więc rolę sprawdzamy tutaj —
  // wzorem panelu admina, ale z przekierowaniem zamiast pustej strony.
  useEffect(() => {
    if (!isAuthenticated()) {
      setAuthorization('denied');
      router.replace('/login');
      return;
    }

    const userType = getUserData()?.userType;
    if (!userType || !ALLOWED_USER_TYPES.includes(userType as (typeof ALLOWED_USER_TYPES)[number])) {
      setAuthorization('denied');
      router.replace('/unauthorized');
      return;
    }

    setIsPlatformAdmin(userType === 'ADMIN');
    setAuthorization('granted');
  }, [router]);

  useEffect(() => {
    if (authorization === 'granted') {
      inputRef.current?.focus();
    }
  }, [authorization]);

  const collect = useCallback(async (rawCode: string) => {
    const pickupCode = extractPickupCode(rawCode);
    if (!pickupCode) {
      setError('Wpisz lub zeskanuj kod odbioru.');
      return;
    }
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const response = await authorizedFetch(`${environment.apiUrl}/api/v1/reservations/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickupCode }),
      });
      const body = await response.text();

      if (!response.ok) {
        setError(describeApiError(body, 'Nie udało się potwierdzić odbioru.'));
        return;
      }

      setLastCollected(JSON.parse(body) as Reservation);
      setSessionCount((n) => n + 1);
      // Czyścimy stan od razu: pracownik przy kasie obsługuje klientów seryjnie
      setCode('');
      inputRef.current?.focus();
    } catch {
      setError('Błąd połączenia z serwerem. Sprawdź połączenie internetowe.');
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  }, []);

  const handleScan = useCallback(
    (rawValue: string) => {
      void collect(rawValue);
    },
    [collect]
  );

  if (authorization !== 'granted') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-gray-600">
          {authorization === 'checking' ? 'Sprawdzanie uprawnień…' : 'Brak dostępu do tego panelu.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Potwierdzanie odbioru</h1>
        <p className="mt-1 text-sm text-gray-600">
          Zeskanuj kod QR klienta albo wpisz kod odbioru, żeby potwierdzić wydanie towaru.
        </p>
        {sessionCount > 0 && (
          <p className="mt-2 text-sm font-semibold text-gray-700">
            Potwierdzone w tej sesji: {sessionCount}
          </p>
        )}
      </header>

      {isPlatformAdmin && (
        <div role="note" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Działasz jako administrator platformy — potwierdzenie odbioru pominie sprawdzenie, czy
          oferta należy do Twojego sklepu. Użyj tylko wtedy, gdy pracownik sklepu nie może tego zrobić.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Wpisanie ręczne jest pierwsze: działa zawsze, także bez HTTPS i bez kamery */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <label htmlFor="pickup-code" className="mb-2 block text-base font-bold text-gray-900 sm:text-lg">
            Kod odbioru
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void collect(code);
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              ref={inputRef}
              id="pickup-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="np. ABC234"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={32}
              disabled={submitting}
              aria-invalid={error ? true : undefined}
              className="min-w-0 flex-1 rounded-lg border-2 border-gray-200 p-3 text-center font-mono text-2xl font-bold uppercase tracking-[0.2em] transition-colors focus:border-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-200 disabled:bg-gray-50"
            />
            <button
              type="submit"
              disabled={submitting || !code.trim()}
              className="rounded-lg bg-yellow-400 px-6 py-3 font-bold text-gray-900 transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-48"
            >
              {submitting ? 'Potwierdzam…' : 'Potwierdź odbiór'}
            </button>
          </form>
          <p className="mt-2 text-sm text-gray-500">
            Kod ma 6 znaków. Wielkość liter nie ma znaczenia.
          </p>
        </div>

        <PickupScanner onScan={handleScan} paused={submitting} />

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="font-semibold text-red-800">Nie potwierdzono odbioru</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                inputRef.current?.focus();
              }}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Spróbuj ponownie
            </button>
          </div>
        )}

        {lastCollected && <CollectedSummary reservation={lastCollected} />}
      </div>
    </div>
  );
}

/**
 * Potwierdzenie ostatniego odbioru. Zostaje na ekranie obok formularza, a nie zamiast niego —
 * pracownik widzi, co właśnie wydał, i jednocześnie może obsłużyć kolejnego klienta.
 */
function CollectedSummary({ reservation }: { reservation: Reservation }) {
  return (
    <div className="rounded-lg border-2 border-green-300 bg-green-50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-lg font-bold text-white"
        >
          ✓
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold text-green-900 sm:text-lg">Odbiór potwierdzony</p>

          <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="text-green-800/70">Oferta:</dt>
              <dd className="font-semibold text-green-900">{reservation.offerName || reservation.offerId}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-green-800/70">Wydano sztuk:</dt>
              <dd className="font-semibold text-green-900">{reservation.quantity}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-green-800/70">Godzina odbioru:</dt>
              <dd className="font-semibold text-green-900">{formatTime(reservation.collectedAt)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-green-800/70">Kod:</dt>
              <dd className="font-mono font-semibold tracking-widest text-green-900">
                {reservation.pickupCode}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-sm text-green-800">Możesz obsłużyć kolejnego klienta.</p>
        </div>
      </div>
    </div>
  );
}
