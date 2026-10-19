"use client";

import { useCallback, useEffect, useState } from 'react';
import { LuCircleAlert, LuCloud, LuLeaf, LuPackageCheck, LuScale } from 'react-icons/lu';
import { environment } from '../../../config';
import { authorizedFetch, getUserData } from '../../../utils/auth';
import { useRoleGate } from '../../../hooks/useRoleGate';
import { Badge, Button, Card, CardHeader, Chip, Input, MetricCard, PageHeader, Spinner, consolePage } from '../../../components/ui';
import { describeApiError } from '../../../utils/apiErrors';
import {
  SavingsReport,
  describeRange,
  formatCount,
  formatEstimate,
  formatMoney,
  monthRange,
} from '../../../types/report';

type Preset = 'current' | 'previous' | 'all' | null;

export default function SavingsReportPage() {
  // Raport dla firmy i admina — zgodnie z regułą /api/v1/reports/**
  const authorization = useRoleGate(['COMPANY', 'ADMIN']);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [storeId, setStoreId] = useState('');
  const [preset, setPreset] = useState<Preset>('all');
  const [rangeError, setRangeError] = useState<string | null>(null);

  const [report, setReport] = useState<SavingsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authorization === 'granted') setIsPlatformAdmin(getUserData()?.userType === 'ADMIN');
  }, [authorization]);

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

  const applyPreset = (next: Exclude<Preset, null>) => {
    setPreset(next);
    if (next === 'all') {
      setFrom('');
      setTo('');
      submitFilters('', '');
      return;
    }
    const { from: presetFrom, to: presetTo } = monthRange(next === 'current' ? 0 : 1);
    setFrom(presetFrom);
    setTo(presetTo);
    submitFilters(presetFrom, presetTo);
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
      <PageHeader title="Raport oszczędności" description="Ile towaru udało się uratować — liczone z potwierdzonych odbiorów." />

      {/* Filtr */}
      <Card className="mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPreset(null);
            submitFilters(from, to);
          }}
        >
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Szybki wybór okresu">
            <Chip selected={preset === 'current'} onClick={() => applyPreset('current')} disabled={loading}>
              Ten miesiąc
            </Chip>
            <Chip selected={preset === 'previous'} onClick={() => applyPreset('previous')} disabled={loading}>
              Poprzedni miesiąc
            </Chip>
            <Chip selected={preset === 'all'} onClick={() => applyPreset('all')} disabled={loading}>
              Cały okres
            </Chip>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Input id="report-from" label="Od" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            <Input id="report-to" label="Do" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            {isPlatformAdmin && (
              <Input
                id="report-store"
                label={<>ID sklepu <span className="font-normal text-ink-subtle">(opcjonalnie)</span></>}
                type="number"
                min={1}
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                placeholder="cała platforma"
              />
            )}
            <div className="col-span-2 flex items-end lg:col-span-1">
              <Button type="submit" fullWidth loading={loading}>
                {loading ? 'Liczę…' : 'Pokaż raport'}
              </Button>
            </div>
          </div>

          {rangeError && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {rangeError}
            </p>
          )}
        </form>

        {/* Bez tej adnotacji właściciel sklepu porówna raport z utargiem i zobaczy
            rozbieżność bez wyjaśnienia — doba UTC kończy się w Polsce o 01:00–02:00. */}
        <p className="mt-4 border-t border-line pt-3 text-xs text-ink-subtle">
          Zakres jest liczony w dniach UTC, więc doba raportu kończy się w Polsce około 1:00–2:00 następnego dnia.
        </p>
      </Card>

      {loading && !report && <LoadingState />}

      {error && (
        <Card role="alert" className="flex flex-col items-start gap-3 border-danger/30 bg-danger-soft">
          <p className="flex items-center gap-2 text-sm text-danger">
            <LuCircleAlert size={16} aria-hidden /> {error}
          </p>
          <Button variant="secondary" size="sm" onClick={() => submitFilters(from, to)}>
            Spróbuj ponownie
          </Button>
        </Card>
      )}

      {!error && report && <ReportBody report={report} dimmed={loading} />}

      {!error && report && <MonthlyTable storeId={isPlatformAdmin ? storeId : ''} />}
    </div>
  );
}

function ReportBody({ report, dimmed }: { report: SavingsReport; dimmed: boolean }) {
  const hasCollections = report.savedProductsCount > 0;

  return (
    <div className={dimmed ? 'opacity-60 transition-opacity' : undefined}>
      <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
        Zakres: <span className="font-semibold text-ink">{describeRange(report.from, report.to)}</span>
        <span aria-hidden>·</span>
        {report.storeId !== null ? (
          <span>
            Sklep <span className="font-semibold text-ink">#{report.storeId}</span>
          </span>
        ) : (
          <span className="font-semibold text-ink">cała platforma</span>
        )}
      </p>

      {!hasCollections ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <MetricCard label="Uratowane sztuki" value={formatCount(report.savedProductsCount)} unit="szt." icon={<LuPackageCheck size={18} />} />
            <MetricCard
              label="Wartość towaru"
              value={report.valueByCurrency.length > 0 ? formatMoney(report.valueByCurrency[0].amount, report.valueByCurrency[0].currency) : '—'}
              hint={report.valueByCurrency.length > 1 ? `+ ${report.valueByCurrency.length - 1} inne waluty niżej` : report.valueByCurrency.length === 0 ? 'oferty bez ceny' : undefined}
              icon={<LuLeaf size={18} />}
            />
            <MetricCard label="Szacowana masa" value={formatEstimate(report.estimatedKg)} unit="kg" icon={<LuScale size={18} />} hint={report.estimated ? 'szacunek' : undefined} />
            <MetricCard label="Ekwiwalent CO₂" value={formatEstimate(report.estimatedCo2Kg)} unit="kg" icon={<LuCloud size={18} />} hint={report.estimated ? 'szacunek' : undefined} />
          </div>

          {report.estimated && (
            <p className="mt-4 rounded-ui-md border border-line bg-surface-muted px-3 py-2.5 text-xs leading-5 text-ink-muted">
              <Badge tone="neutral" className="mr-1.5 align-middle">szacunek</Badge>
              <strong className="font-semibold text-ink">Masa i CO₂ to przybliżenie.</strong> Liczymy je stałym mnożnikiem
              na sztukę, jednakowym dla każdego produktu — bułka waży w tym rachunku tyle samo, co zgrzewka wody. Liczba
              uratowanych sztuk i wartość są policzone dokładnie. Nie używaj tych dwóch liczb jako wskaźnika ESG bez zastrzeżenia.
            </p>
          )}

          {report.valueByCurrency.length > 1 && <ValueSection report={report} />}
        </>
      )}
    </div>
  );
}

function ValueSection({ report }: { report: SavingsReport }) {
  return (
    <Card className="mt-4">
      <CardHeader
        title="Wartość według waluty"
        description="Waluty pokazujemy osobno — nie przeliczamy ich na jedną, bo raport nie zna kursów."
      />
      <ul className="divide-y divide-line">
        {report.valueByCurrency.map((entry) => (
          <li key={entry.currency} className="flex items-baseline justify-between gap-4 py-2">
            <span className="text-sm font-medium text-ink-muted">{entry.currency}</span>
            <span className="text-lg font-semibold tabular-nums text-ink">{formatMoney(entry.amount, entry.currency)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/**
 * Ostatnie miesiące w tabeli. Każdy wiersz to osobne zapytanie o raport za miesiąc — liczy
 * backend (te same reguły co kafelki wyżej), front tylko układa wyniki obok siebie.
 */
const MONTHS_BACK = 6;

function MonthlyTable({ storeId }: { storeId: string }) {
  const [rows, setRows] = useState<{ label: string; report: SavingsReport | null }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const months = Array.from({ length: MONTHS_BACK }, (_, i) => i);
      const results = await Promise.all(
        months.map(async (monthsAgo) => {
          const range = monthRange(monthsAgo);
          const params = new URLSearchParams({ from: range.from, to: range.to });
          if (storeId.trim()) params.set('storeId', storeId.trim());
          const label = new Date(`${range.from}T00:00:00`).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
          try {
            const response = await authorizedFetch(`${environment.apiUrl}/api/v1/reports/savings?${params}`);
            return { label, report: response.ok ? ((await response.json()) as SavingsReport) : null };
          } catch {
            return { label, report: null };
          }
        })
      );
      if (!cancelled) setRows(results);
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  return (
    <Card padding="none" className="mt-6 overflow-hidden">
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <CardHeader title="Ostatnie miesiące" description="Potwierdzone odbiory miesiąc po miesiącu." className="mb-3" />
      </div>
      {rows === null ? (
        <div className="space-y-2 px-4 pb-4 sm:px-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-ui-sm bg-surface-sunken" />
          ))}
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-line bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-subtle">
              <th className="px-4 py-2 font-medium sm:px-5">Miesiąc</th>
              <th className="px-3 py-2 text-right font-medium">Sztuki</th>
              <th className="px-3 py-2 text-right font-medium">Wartość</th>
              <th className="hidden px-4 py-2 text-right font-medium sm:table-cell sm:px-5">Masa (szac.)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, report }) => (
              <tr key={label} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 capitalize text-ink sm:px-5">{label}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink">{report ? formatCount(report.savedProductsCount) : '—'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink-muted">
                  {report && report.valueByCurrency.length > 0
                    ? report.valueByCurrency.map((v) => formatMoney(v.amount, v.currency)).join(' + ')
                    : '—'}
                </td>
                <td className="hidden px-4 py-2.5 text-right tabular-nums text-ink-muted sm:table-cell sm:px-5">
                  {report ? `${formatEstimate(report.estimatedKg)} kg` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function LoadingState() {
  return (
    <div aria-busy="true" aria-live="polite" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-ui-xl bg-surface-sunken" />
      ))}
      <span className="sr-only">Liczenie raportu…</span>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed text-center">
      <h2 className="text-base font-semibold text-ink">Brak potwierdzonych odbiorów</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
        W wybranym zakresie nie potwierdzono żadnego odbioru. Do raportu wliczają się wyłącznie rezerwacje odebrane
        w sklepie — rezerwacje oczekujące, anulowane i wygasłe nie.
      </p>
    </Card>
  );
}
