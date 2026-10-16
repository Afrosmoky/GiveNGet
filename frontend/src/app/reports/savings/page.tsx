"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { environment } from '../../../config';
import { authorizedFetch, getUserData, isAuthenticated } from '../../../utils/auth';
import { describeApiError } from '../../../utils/apiErrors';
import {
  SavingsReport,
  describeRange,
  formatCount,
  formatEstimate,
  formatMoney,
  monthRange,
} from '../../../types/report';

/** Role dopuszczone do raportu — zgodnie z regułą /api/v1/reports/**. */
const ALLOWED_USER_TYPES = ['COMPANY', 'ADMIN'] as const;

type Authorization = 'checking' | 'granted' | 'denied';

export default function SavingsReportPage() {
  const router = useRouter();
  const [authorization, setAuthorization] = useState<Authorization>('checking');
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [storeId, setStoreId] = useState('');
  const [rangeError, setRangeError] = useState<string | null>(null);

  const [report, setReport] = useState<SavingsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bramka roli: AuthGuard zna tylko fakt zalogowania, więc rolę sprawdzamy tutaj
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

  const loadReport = useCallback(
    async (rangeFrom: string, rangeTo: string, narrowToStore: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (rangeFrom) params.set('from', rangeFrom);
        if (rangeTo) params.set('to', rangeTo);
        if (narrowToStore.trim()) params.set('storeId', narrowToStore.trim());

        const query = params.toString();
        const response = await authorizedFetch(
          `${environment.apiUrl}/api/v1/reports/savings${query ? `?${query}` : ''}`
        );
        const body = await response.text();

        if (!response.ok) {
          setError(describeApiError(body, 'Nie udało się pobrać raportu.'));
          return;
        }
        setReport(JSON.parse(body) as SavingsReport);
      } catch {
        setError('Błąd połączenia z serwerem. Sprawdź połączenie internetowe.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Pierwsze wejście: cały okres
  useEffect(() => {
    if (authorization === 'granted') {
      void loadReport('', '', '');
    }
  }, [authorization, loadReport]);

  const submitFilters = (nextFrom: string, nextTo: string) => {
    if (nextFrom && nextTo && nextFrom > nextTo) {
      setRangeError('Data początkowa nie może być późniejsza niż data końcowa.');
      return;
    }
    setRangeError(null);
    void loadReport(nextFrom, nextTo, storeId);
  };

  const applyPreset = (preset: 'current' | 'previous' | 'all') => {
    if (preset === 'all') {
      setFrom('');
      setTo('');
      submitFilters('', '');
      return;
    }
    const { from: presetFrom, to: presetTo } = monthRange(preset === 'current' ? 0 : 1);
    setFrom(presetFrom);
    setTo(presetTo);
    submitFilters(presetFrom, presetTo);
  };

  if (authorization !== 'granted') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-gray-600">
          {authorization === 'checking' ? 'Sprawdzanie uprawnień…' : 'Brak dostępu do tego raportu.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Raport oszczędności</h1>
        <p className="mt-1 text-sm text-gray-600">
          Ile towaru udało się uratować — liczone z potwierdzonych odbiorów.
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="report-from" className="mb-1 block text-sm font-semibold text-gray-700">
                Od
              </label>
              <input
                id="report-from"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-200 p-2.5 text-base transition-colors focus:border-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-200"
              />
            </div>
            <div>
              <label htmlFor="report-to" className="mb-1 block text-sm font-semibold text-gray-700">
                Do
              </label>
              <input
                id="report-to"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-200 p-2.5 text-base transition-colors focus:border-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-200"
              />
            </div>

            {isPlatformAdmin && (
              <div>
                <label htmlFor="report-store" className="mb-1 block text-sm font-semibold text-gray-700">
                  ID sklepu <span className="font-normal text-gray-500">(opcjonalnie)</span>
                </label>
                <input
                  id="report-store"
                  type="number"
                  min={1}
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  placeholder="cała platforma"
                  className="w-full rounded-lg border-2 border-gray-200 p-2.5 text-base transition-colors focus:border-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-200"
                />
              </div>
            )}

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-yellow-400 px-4 py-2.5 font-bold text-gray-900 transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Liczę…' : 'Pokaż raport'}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <PresetButton label="Ten miesiąc" onClick={() => applyPreset('current')} disabled={loading} />
            <PresetButton label="Poprzedni miesiąc" onClick={() => applyPreset('previous')} disabled={loading} />
            <PresetButton label="Cały okres" onClick={() => applyPreset('all')} disabled={loading} />
          </div>

          {rangeError && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {rangeError}
            </p>
          )}
        </form>

        {/* Bez tej adnotacji właściciel sklepu porówna raport z utargiem i zobaczy
            rozbieżność bez wyjaśnienia — doba UTC kończy się w Polsce o 01:00–02:00. */}
        <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
          Zakres jest liczony w dniach UTC, więc doba raportu kończy się w Polsce około 1:00–2:00
          następnego dnia.
        </p>
      </section>

      {loading && !report && <LoadingState />}

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => submitFilters(from, to)}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {!error && report && <ReportBody report={report} dimmed={loading} />}
    </div>
  );
}

function ReportBody({ report, dimmed }: { report: SavingsReport; dimmed: boolean }) {
  const hasCollections = report.savedProductsCount > 0;

  return (
    <div className={dimmed ? 'opacity-60' : ''}>
      <p className="mb-4 text-sm text-gray-600">
        Zakres: <span className="font-semibold text-gray-900">{describeRange(report.from, report.to)}</span>
        {report.storeId !== null && (
          <>
            {' · '}Sklep: <span className="font-semibold text-gray-900">#{report.storeId}</span>
          </>
        )}
        {report.storeId === null && (
          <>
            {' · '}<span className="font-semibold text-gray-900">cała platforma</span>
          </>
        )}
      </p>

      {!hasCollections ? (
        <EmptyState />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricTile
              label="Uratowane sztuki"
              value={formatCount(report.savedProductsCount)}
              unit="szt."
              tone="green"
            />
            <MetricTile
              label="Szacowana masa"
              value={formatEstimate(report.estimatedKg)}
              unit="kg"
              tone="blue"
              estimated
            />
            <MetricTile
              label="Szacowany ekwiwalent CO₂"
              value={formatEstimate(report.estimatedCo2Kg)}
              unit="kg CO₂"
              tone="blue"
              estimated
            />
          </div>

          {report.estimated && (
            <p className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
              <strong>Masa i CO₂ to przybliżenie.</strong> Liczymy je stałym mnożnikiem na sztukę,
              jednakowym dla każdego produktu — bułka waży w tym rachunku tyle samo, co zgrzewka wody.
              Liczba uratowanych sztuk i wartość są policzone dokładnie. Nie używaj tych dwóch liczb
              jako wskaźnika ESG bez zastrzeżenia.
            </p>
          )}

          <ValueSection report={report} />
        </>
      )}
    </div>
  );
}

function ValueSection({ report }: { report: SavingsReport }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-bold text-gray-900">Wartość uratowanego towaru</h2>

      {report.valueByCurrency.length === 0 ? (
        // Pusta wartość przy niezerowej liczbie sztuk to konkretna przyczyna,
        // a nie „brak danych" — mówimy ją wprost
        <p className="mt-2 text-sm text-gray-600">
          Brak wartości do policzenia: odebrane oferty nie mają ustawionej ceny. Liczba sztuk oraz
          szacunki masy i CO₂ powyżej są policzone normalnie.
        </p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-gray-100">
            {report.valueByCurrency.map((entry) => (
              <li key={entry.currency} className="flex items-baseline justify-between gap-4 py-2">
                <span className="text-sm font-semibold text-gray-600">{entry.currency}</span>
                <span className="text-xl font-extrabold text-gray-900">
                  {formatMoney(entry.amount, entry.currency)}
                </span>
              </li>
            ))}
          </ul>
          {report.valueByCurrency.length > 1 && (
            <p className="mt-3 text-xs text-gray-500">
              Waluty pokazujemy osobno — nie przeliczamy ich na jedną, bo raport nie zna kursów.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function MetricTile({
  label,
  value,
  unit,
  tone,
  estimated = false,
}: {
  label: string;
  value: string;
  unit: string;
  tone: 'green' | 'blue';
  estimated?: boolean;
}) {
  const toneClasses =
    tone === 'green' ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50';
  const valueClasses = tone === 'green' ? 'text-green-900' : 'text-blue-900';

  return (
    <div className={`rounded-lg border p-4 ${toneClasses}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        {estimated && (
          <span className="shrink-0 rounded-full border border-blue-300 bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-800">
            szacunek
          </span>
        )}
      </div>
      <p className={`mt-2 text-3xl font-extrabold ${valueClasses}`}>
        {value} <span className="text-base font-bold">{unit}</span>
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-4">
            <div className="h-4 w-2/3 rounded bg-gray-200" />
            <div className="mt-3 h-9 w-1/2 rounded bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-5">
        <div className="h-5 w-1/3 rounded bg-gray-200" />
        <div className="mt-4 h-6 w-1/4 rounded bg-gray-200" />
      </div>
      <span className="sr-only">Liczenie raportu…</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-8 text-center">
      <h2 className="text-lg font-bold text-gray-900">Brak potwierdzonych odbiorów</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
        W wybranym zakresie nie potwierdzono żadnego odbioru. Do raportu wliczają się wyłącznie
        rezerwacje odebrane w sklepie — rezerwacje oczekujące, anulowane i wygasłe nie.
      </p>
    </div>
  );
}

function PresetButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border-2 border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}
