"use client";

import { useRef, useState, type DragEvent } from 'react';
import { LuCircleAlert, LuCircleCheck, LuClock, LuDownload, LuFileSpreadsheet, LuUpload, LuX } from 'react-icons/lu';
import { environment } from '../../../config';
import { authorizedFetch } from '../../../utils/auth';
import { useRoleGate } from '../../../hooks/useRoleGate';
import { Badge, Button, Card, CardHeader, IconButton, MetricCard, PageHeader, Spinner, cn, consolePage } from '../../../components/ui';
import { describeApiError, describeErrorCode } from '../../../utils/apiErrors';
import { OfferImportResult } from '../../../types/offerImport';

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
  'cena_przed_obnizka',
  'waluta',
  'ilosc',
  'podkategoria',
  'lokalizacja',
  'szerokosc_geo',
  'dlugosc_geo',
];

export default function OfferImportPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  // Import tylko dla konta firmowego — zgodnie z regułą /api/v1/offers/import
  const authorization = useRoleGate('COMPANY');

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OfferImportResult | null>(null);

  const pickFile = (picked: File | null) => {
    setFile(picked);
    setError(null);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    // Walidację typu robi backend (rozszerzenie + sygnatura pliku) — tu tylko przekazujemy plik
    pickFile(e.dataTransfer.files?.[0] ?? null);
  };

  const clearFile = () => {
    setFile(null);
    if (fileInput.current) fileInput.current.value = '';
  };

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
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="Sprawdzanie uprawnień" />
      </div>
    );
  }

  return (
    <div className={consolePage}>
      <PageHeader
        title="Import ofert z Excela"
        description="Wystaw wiele ofert naraz z pliku .xlsx. Oferty trafią do Twojego sklepu, a domyślną lokalizacją jest adres firmy."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        {/* Wysyłka */}
        <Card>
          <CardHeader title="Wyślij plik" description="Maksymalnie 500 ofert i 2 MB w jednym pliku." />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label
              htmlFor="import-file"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-2 rounded-ui-lg border-2 border-dashed px-4 py-8 text-center transition-colors',
                'focus-within:ring-2 focus-within:ring-brand/40',
                dragOver ? 'border-brand bg-brand-soft' : 'border-line bg-surface-muted hover:border-line-strong'
              )}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand shadow-card" aria-hidden>
                <LuUpload size={22} />
              </span>
              <span className="text-sm font-semibold text-ink">Przeciągnij plik .xlsx albo kliknij, żeby wybrać</span>
              <span className="text-xs text-ink-muted">Arkusz Excel w formacie .xlsx (nie .xls ani .csv)</span>
              <input
                id="import-file"
                ref={fileInput}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </label>

            {file && (
              <div className="mt-3 flex items-center gap-3 rounded-ui-md border border-line bg-surface px-3 py-2.5">
                <LuFileSpreadsheet size={20} className="shrink-0 text-brand" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{file.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-ink-subtle">{(file.size / 1024).toFixed(0)} KB</span>
                <IconButton label="Usuń wybrany plik" icon={<LuX size={16} />} onClick={clearFile} className="h-8 w-8" />
              </div>
            )}

            {error && (
              <div role="alert" className="mt-3 flex items-start gap-2 rounded-ui-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
                <LuCircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
                {error}
              </div>
            )}

            <Button type="submit" size="lg" fullWidth loading={uploading} disabled={!file} className="mt-4">
              {uploading ? 'Importuję…' : 'Importuj oferty'}
            </Button>
          </form>
        </Card>

        {/* Szablon */}
        <Card>
          <CardHeader
            title="Szablon"
            description="Nagłówki w pierwszym wierszu, jedna oferta w każdym kolejnym. Kolejność kolumn nie ma znaczenia."
          />
          <Button variant="secondary" fullWidth loading={downloading} onClick={downloadTemplate} leftIcon={<LuDownload size={16} />}>
            {downloading ? 'Pobieram…' : 'Pobierz szablon .xlsx'}
          </Button>
          <p className="mt-2 text-xs text-ink-muted">Szablon zawiera przykłady, instrukcję i aktualną listę kategorii.</p>

          <div className="mt-5 space-y-4">
            <ColumnList title="Wymagane kolumny" columns={REQUIRED_COLUMNS} />
            <ColumnList title="Opcjonalne kolumny" columns={OPTIONAL_COLUMNS} />
          </div>
          <ul className="mt-5 list-disc space-y-1.5 pl-5 text-sm text-ink-muted marker:text-brand">
            <li>
              <code className="text-ink">typ_transakcji</code>: <code className="text-ink">sprzedaz</code>, <code className="text-ink">za_darmo</code> albo <code className="text-ink">wymiana</code>.
            </li>
            <li>Sprzedaż wymaga ceny (np. 4.99). Oferta za darmo i wymiana nie może mieć ceny ani waluty.</li>
            <li>
              <code className="text-ink">termin_waznosci</code> w formacie RRRR-MM-DD, godziny odbioru w formacie GG:MM.
            </li>
            <li>Formuły nie są obsługiwane.</li>
          </ul>
        </Card>
      </div>

      {result && <ImportSummary result={result} />}
    </div>
  );
}

function ColumnList({ title, columns }: { title: string; columns: string[] }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {columns.map((column) => (
          <code key={column} className="rounded-ui-sm bg-surface-sunken px-2 py-0.5 text-xs text-ink">
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
    <section aria-live="polite" className="mt-6">
      <h2 className="mb-3 text-lg font-semibold text-ink">Wynik importu</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard label="Utworzone oferty" value={result.utworzone} icon={<LuCircleCheck size={18} />} />
        <MetricCard label="Odrzucone wiersze" value={errorCount} icon={<LuCircleAlert size={18} />} className={errorCount > 0 ? 'border-danger/30' : undefined} />
        <MetricCard label="Do weryfikacji" value={pendingCount} icon={<LuClock size={18} />} hint="czeka na moderatora" className={pendingCount > 0 ? 'border-warning/40' : undefined} />
      </div>

      {pendingCount > 0 && (
        <p className="mt-4 rounded-ui-md border border-warning/30 bg-warning-soft px-3 py-2.5 text-sm text-warning">
          Oferty z wierszy {result.doWeryfikacji.join(', ')} zawierają treści wymagające weryfikacji. Zostały zapisane,
          ale będą widoczne dopiero po akceptacji moderatora.
        </p>
      )}

      {errorCount > 0 ? (
        <Card padding="none" className="mt-4 overflow-hidden">
          <div className="border-b border-line px-4 py-3 sm:px-5">
            <h3 className="text-sm font-semibold text-ink">Wiersze z błędami</h3>
            <p className="mt-0.5 text-xs text-ink-muted">Popraw je w pliku i zaimportuj ponownie tylko te wiersze.</p>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-subtle">
                <th scope="col" className="w-20 px-4 py-2 font-medium sm:px-5">Wiersz</th>
                <th scope="col" className="px-4 py-2 font-medium sm:px-5">Problem</th>
              </tr>
            </thead>
            <tbody>
              {result.bledy.map((rowError) => (
                <tr key={`${rowError.wiersz}-${rowError.code}`} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 align-top sm:px-5">
                    <Badge tone="danger">{rowError.wiersz}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-ink sm:px-5">{describeErrorCode(rowError.code, rowError.message)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-sm text-success">
          <LuCircleCheck size={16} aria-hidden /> Wszystkie wiersze zostały zaimportowane.
        </p>
      )}
    </section>
  );
}
