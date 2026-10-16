"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { environment } from '../../../config';
import { authorizedFetch, getUserData, isAuthenticated } from '../../../utils/auth';
import { describeApiError, describeErrorCode } from '../../../utils/apiErrors';
import { OfferImportResult } from '../../../types/offerImport';

/** Import dostępny tylko dla konta firmowego — zgodnie z regułą /api/v1/offers/import. */
const ALLOWED_USER_TYPE = 'COMPANY';

/**
 * Skrót szablonu na ekranie. Źródłem prawdy jest plik z GET /api/v1/offers/import/template
 * (zawiera też instrukcję i aktualną listę kategorii) — tu tylko orientacyjna ściąga.
 */
const REQUIRED_COLUMNS = [
  'nazwa',
  'opis',
  'typ_transakcji',
  'termin_waznosci',
  'godziny_odbioru_od',
  'godziny_odbioru_do',
  'kategoria',
];
const OPTIONAL_COLUMNS = [
  'cena',
  'waluta',
  'ilosc',
  'podkategoria',
  'lokalizacja',
  'szerokosc_geo',
  'dlugosc_geo',
];

type Authorization = 'checking' | 'granted' | 'denied';

export default function OfferImportPage() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [authorization, setAuthorization] = useState<Authorization>('checking');

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OfferImportResult | null>(null);

  // Bramka roli: AuthGuard zna tylko fakt zalogowania, więc rolę sprawdzamy tutaj
  useEffect(() => {
    if (!isAuthenticated()) {
      setAuthorization('denied');
      router.replace('/login');
      return;
    }
    if (getUserData()?.userType !== ALLOWED_USER_TYPE) {
      setAuthorization('denied');
      router.replace('/unauthorized');
      return;
    }
    setAuthorization('granted');
  }, [router]);

  const downloadTemplate = async () => {
    setDownloading(true);
    setError(null);
    try {
      const response = await authorizedFetch(`${environment.apiUrl}/api/v1/offers/import/template`);
      if (!response.ok) {
        setError(describeApiError(await response.text(), 'Nie udało się pobrać szablonu.'));
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'szablon-importu-ofert.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Błąd połączenia z serwerem. Sprawdź połączenie internetowe.');
    } finally {
      setDownloading(false);
    }
  };

  const submit = async () => {
    if (!file) {
      setError(describeErrorCode('FILE_REQUIRED', 'Wybierz plik .xlsx do importu.'));
      return;
    }
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await authorizedFetch(`${environment.apiUrl}/api/v1/offers/import`, {
        method: 'POST',
        body: formData,
      });
      const body = await response.text();
      if (!response.ok) {
        setError(describeApiError(body, 'Import nie powiódł się.'));
        return;
      }
      setResult(JSON.parse(body) as OfferImportResult);
      // Czyścimy wybór, żeby ponowne kliknięcie nie zaimportowało tego samego pliku drugi raz
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
    } catch {
      setError('Błąd połączenia z serwerem. Sprawdź połączenie internetowe.');
    } finally {
      setUploading(false);
    }
  };

  if (authorization !== 'granted') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-gray-600">
          {authorization === 'checking' ? 'Sprawdzanie uprawnień…' : 'Brak dostępu do importu ofert.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Import ofert z Excela</h1>
        <p className="mt-1 text-sm text-gray-600">
          Wystaw wiele ofert naraz z pliku .xlsx. Oferty zostaną przypisane do Twojego sklepu,
          a domyślną lokalizacją jest adres firmy.
        </p>
      </header>

      {/* Szablon */}
      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">1. Przygotuj plik</h2>
            <p className="mt-1 text-sm text-gray-600">
              Nagłówki w pierwszym wierszu, jedna oferta w każdym kolejnym. Kolejność kolumn
              nie ma znaczenia. Szablon zawiera przykłady, instrukcję i aktualną listę kategorii.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            disabled={downloading}
            className="shrink-0 rounded-lg border-2 border-yellow-400 px-4 py-2.5 font-bold text-gray-900 transition hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading ? 'Pobieram…' : 'Pobierz szablon'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ColumnList title="Wymagane kolumny" columns={REQUIRED_COLUMNS} />
          <ColumnList title="Opcjonalne kolumny" columns={OPTIONAL_COLUMNS} />
        </div>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>
            <code>typ_transakcji</code>: <code>sprzedaz</code>, <code>za_darmo</code> albo <code>wymiana</code>.
          </li>
          <li>Sprzedaż wymaga ceny (np. 4.99). Oferta za darmo i wymiana nie może mieć ceny ani waluty.</li>
          <li>
            <code>termin_waznosci</code> w formacie RRRR-MM-DD, godziny odbioru w formacie GG:MM.
          </li>
          <li>Maksymalnie 500 ofert i 2 MB w jednym pliku. Formuły nie są obsługiwane.</li>
        </ul>
      </section>

      {/* Wysyłka */}
      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-bold text-gray-900">2. Wyślij plik</h2>
        <form
          className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label htmlFor="import-file" className="sr-only">
            Plik .xlsx
          </label>
          <input
            id="import-file"
            ref={fileInput}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
            }}
            className="w-full min-w-0 rounded-lg border-2 border-gray-200 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:font-semibold file:text-gray-800 hover:file:bg-gray-200 sm:flex-1"
          />
          <button
            type="submit"
            disabled={uploading || !file}
            className="rounded-lg bg-yellow-400 px-5 py-2.5 font-bold text-gray-900 transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? 'Importuję…' : 'Importuj oferty'}
          </button>
        </form>

        {error && (
          <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
      </section>

      {result && <ImportSummary result={result} />}

      <Link href="/dashboard" className="text-sm font-semibold text-gray-700 underline hover:text-gray-900">
        ← Wróć do panelu
      </Link>
    </div>
  );
}

function ColumnList({ title, columns }: { title: string; columns: string[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {columns.map((column) => (
          <code key={column} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-800">
            {column}
          </code>
        ))}
      </div>
    </div>
  );
}

function ImportSummary({ result }: { result: OfferImportResult }) {
  const errorCount = result.bledy.length;
  const pendingCount = result.doWeryfikacji.length;

  return (
    <section aria-live="polite" className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-bold text-gray-900">Wynik importu</h2>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Utworzone oferty" value={result.utworzone} tone="green" />
        <Stat label="Odrzucone wiersze" value={errorCount} tone={errorCount > 0 ? 'red' : 'gray'} />
        <Stat label="Czeka na moderację" value={pendingCount} tone={pendingCount > 0 ? 'amber' : 'gray'} />
      </div>

      {pendingCount > 0 && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Oferty z wierszy {result.doWeryfikacji.join(', ')} zawierają treści wymagające weryfikacji.
          Zostały zapisane, ale będą widoczne dopiero po akceptacji moderatora.
        </p>
      )}

      {errorCount > 0 ? (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            Wiersze z błędami — popraw je w pliku i zaimportuj ponownie tylko te wiersze
          </h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th scope="col" className="w-20 px-3 py-2 font-semibold">Wiersz</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Problem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.bledy.map((rowError) => (
                  <tr key={`${rowError.wiersz}-${rowError.code}`}>
                    <td className="px-3 py-2 font-mono text-gray-900">{rowError.wiersz}</td>
                    <td className="px-3 py-2 text-gray-800">
                      {describeErrorCode(rowError.code, rowError.message)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-600">Wszystkie wiersze zostały zaimportowane.</p>
      )}
    </section>
  );
}

const STAT_TONES = {
  green: 'border-green-200 bg-green-50 text-green-900',
  red: 'border-red-200 bg-red-50 text-red-900',
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  gray: 'border-gray-200 bg-gray-50 text-gray-700',
} as const;

function Stat({ label, value, tone }: { label: string; value: number; tone: keyof typeof STAT_TONES }) {
  return (
    <div className={`rounded-lg border p-3 ${STAT_TONES[tone]}`}>
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-sm">{label}</div>
    </div>
  );
}
