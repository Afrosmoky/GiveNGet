"use client";

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  LuCalendarCheck,
  LuCalendarX,
  LuClock,
  LuCircleAlert,
  LuLeaf,
  LuPackage,
  LuPackageCheck,
  LuPackagePlus,
  LuStore,
  LuUserCheck,
  LuUserPlus,
  LuUsers,
} from 'react-icons/lu';
import { environment } from '../../../config';
import { authorizedFetch, getUserData } from '../../../utils/auth';
import { describeApiError } from '../../../utils/apiErrors';
import { describeRange, formatCount, monthRange } from '../../../types/report';
import type { PlatformStats } from '../../../types/platformStats';
import { Badge, Button, Card, CardHeader, Chip, Input, MetricCard, PageHeader, Spinner, cn, consolePage } from '../../../components/ui';

type Preset = 'current' | 'previous' | 'all' | null;

/**
 * Statystyki platformy pod pilotaż (docs/08, pozycja 4) — tylko ADMIN, zgodnie z regułą
 * /api/v1/stats/**. Layout panelu wpuszcza też moderatora (EMPLOYEE), więc rolę
 * sprawdzamy dodatkowo tutaj. Wszystkie liczby liczy backend — tu tylko prezentacja.
 */
export default function PlatformStatsPage() {
  const [authorization, setAuthorization] = useState<'checking' | 'granted' | 'denied'>('checking');

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [preset, setPreset] = useState<Preset>('all');
  const [rangeError, setRangeError] = useState<string | null>(null);

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAuthorization(getUserData()?.userType === 'ADMIN' ? 'granted' : 'denied');
  }, []);

  const loadStats = useCallback(async (rangeFrom: string, rangeTo: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (rangeFrom) params.set('from', rangeFrom);
      if (rangeTo) params.set('to', rangeTo);
      const query = params.toString();
      const response = await authorizedFetch(`${environment.apiUrl}/api/v1/stats/platform${query ? `?${query}` : ''}`);
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
    if (authorization === 'granted') void loadStats('', '');
  }, [authorization, loadStats]);

  const submitFilters = (nextFrom: string, nextTo: string) => {
    if (nextFrom && nextTo && nextFrom > nextTo) {
      setRangeError('Data początkowa nie może być późniejsza niż data końcowa.');
      return;
    }
    setRangeError(null);
    void loadStats(nextFrom, nextTo);
  };

  const applyPreset = (next: Exclude<Preset, null>) => {
    setPreset(next);
    const range = next === 'all' ? { from: '', to: '' } : monthRange(next === 'current' ? 0 : 1);
    setFrom(range.from);
    setTo(range.to);
    submitFilters(range.from, range.to);
  };

  if (authorization !== 'granted') {
    return (
      <div className={consolePage}>
        {authorization === 'checking' ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner label="Sprawdzanie uprawnień" />
          </div>
        ) : (
          <Card className="border-dashed text-center">
            <p className="text-sm text-ink-muted">Statystyki platformy są dostępne wyłącznie dla administratora.</p>
          </Card>
        )}
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
    <div className={consolePage}>
      <PageHeader
        title="Statystyki pilotażu"
        description="Liczby całej platformy do rozmów z siecią. Oszczędności per sklep są w „Raport oszczędności”."
      />

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
            <Input id="stats-from" label="Od" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            <Input id="stats-to" label="Do" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            <div className="col-span-2 flex items-end lg:col-span-1">
              <Button type="submit" fullWidth loading={loading}>
                {loading ? 'Liczę…' : 'Pokaż'}
              </Button>
            </div>
          </div>
          {rangeError && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {rangeError}
            </p>
          )}
        </form>
      </Card>

      {loading && !stats && (
        <div aria-busy="true" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-ui-xl bg-surface-sunken" />
          ))}
        </div>
      )}

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

      {!error && stats && (
        <div aria-busy={loading} className={cn('transition-opacity', loading && 'opacity-60')}>
          <p className="mb-4 text-sm text-ink-muted">
            Okres: <span className="font-semibold text-ink">{describeRange(stats.from, stats.to)}</span>
          </p>

          {isEmpty && (
            <Card className="mb-6 border-dashed text-center">
              <p className="text-sm text-ink-muted">Na platformie nie ma jeszcze danych — wszystkie liczniki są zerowe.</p>
            </Card>
          )}

          <Group title="Odbiory" hint="potwierdzone w okresie — ta sama definicja co raport oszczędności">
            <MetricCard label="Uratowane sztuki" value={formatCount(stats.pickups.savedUnits)} unit="szt." icon={<LuLeaf size={18} />} hint={<Kind flow />} />
            <MetricCard label="Potwierdzone odbiory" value={formatCount(stats.pickups.collected)} icon={<LuPackageCheck size={18} />} hint={<Kind flow />} />
          </Group>

          <Group title="Rezerwacje" hint="utworzone w okresie, według obecnego statusu">
            <MetricCard label="Łącznie" value={formatCount(stats.reservations.createdInRange)} icon={<LuCalendarCheck size={18} />} hint={<Kind flow />} />
            <MetricCard label="Odebrane" value={formatCount(stats.reservations.byStatus.collected)} icon={<LuPackageCheck size={18} />} hint={<Kind flow />} />
            <MetricCard label="Aktywne" value={formatCount(stats.reservations.byStatus.reserved)} icon={<LuClock size={18} />} hint={<Kind flow />} />
            <MetricCard
              label="Wygasłe / anulowane"
              value={`${formatCount(stats.reservations.byStatus.expired)} / ${formatCount(stats.reservations.byStatus.cancelled)}`}
              icon={<LuCalendarX size={18} />}
              hint={<Kind flow />}
            />
          </Group>

          <Group title="Sklepy i oferty">
            <MetricCard label="Sklepy (zweryfikowane)" value={formatCount(stats.stores.verified)} icon={<LuStore size={18} />} hint={<Kind />} />
            <MetricCard label="Aktywne oferty" value={formatCount(stats.offers.active)} icon={<LuPackage size={18} />} hint={<Kind />} />
            <MetricCard label="Oferty wystawione" value={formatCount(stats.offers.createdInRange)} icon={<LuPackagePlus size={18} />} hint={<Kind flow />} />
          </Group>

          <Group title="Użytkownicy" hint="konta konsumenckie">
            <MetricCard label="Konta łącznie" value={formatCount(stats.users.total)} icon={<LuUsers size={18} />} hint={<Kind />} />
            <MetricCard label="Zweryfikowane" value={formatCount(stats.users.verified)} icon={<LuUserCheck size={18} />} hint={<Kind />} />
            <MetricCard label="Nowe w okresie" value={formatCount(stats.users.newInRange)} icon={<LuUserPlus size={18} />} hint={<Kind flow />} />
          </Group>
        </div>
      )}

      {!error && stats && <MonthlyTable />}

      {!error && stats && (
        <Card className="mt-6 bg-surface-muted">
          <h2 className="mb-2 text-sm font-semibold text-ink">Jak czytać te liczby</h2>
          <ul className="list-disc space-y-1 pl-5 text-xs leading-5 text-ink-muted">
            <li>
              <Badge size="sm" className="mr-1 align-middle">stan</Badge> liczone na teraz, niezależnie od okresu.{' '}
              <Badge size="sm" tone="brand" className="mr-1 align-middle">w okresie</Badge> zdarzenia z wybranych dni.
            </li>
            <li>Dni liczone w UTC — doba kończy się w Polsce ok. 1:00–2:00.</li>
            <li>
              Rezerwacje według daty utworzenia, odbiory według daty odbioru — rezerwacja z końca okresu odebrana po nim
              liczy się do rezerwacji, ale nie do odbiorów.
            </li>
            <li>„Nowe w okresie” obejmuje konta z zapisaną datą założenia — konta sprzed 10.2026 jej nie mają i liczą się tylko do sumy.</li>
          </ul>
        </Card>
      )}
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 flex flex-wrap items-baseline gap-x-2 text-base font-semibold text-ink">
        {title}
        {hint && <span className="text-xs font-normal text-ink-muted">{hint}</span>}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{children}</div>
    </section>
  );
}

/** Rodzaj liczby: stan na teraz vs zdarzenia w okresie. */
function Kind({ flow = false }: { flow?: boolean }) {
  return flow ? <span className="font-medium text-brand">w okresie</span> : <span>stan</span>;
}

/**
 * Ostatnie miesiące obok siebie — każdy wiersz to osobne zapytanie o statystyki miesiąca
 * (ten sam wzorzec co raport oszczędności). Kolumny „przepływowe”, bo tylko one zależą od okresu.
 */
const MONTHS_BACK = 6;

function MonthlyTable() {
  const [rows, setRows] = useState<{ label: string; stats: PlatformStats | null }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        Array.from({ length: MONTHS_BACK }, (_, monthsAgo) => monthsAgo).map(async (monthsAgo) => {
          const range = monthRange(monthsAgo);
          const label = new Date(`${range.from}T00:00:00`).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
          try {
            const response = await authorizedFetch(`${environment.apiUrl}/api/v1/stats/platform?${new URLSearchParams(range)}`);
            return { label, stats: response.ok ? ((await response.json()) as PlatformStats) : null };
          } catch {
            return { label, stats: null };
          }
        })
      );
      if (!cancelled) setRows(results);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cell = (stats: PlatformStats | null, pick: (s: PlatformStats) => number) => (stats ? formatCount(pick(stats)) : '—');

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <CardHeader title="Ostatnie miesiące" description="Zdarzenia miesiąc po miesiącu (dni UTC)." className="mb-3" />
      </div>
      {rows === null ? (
        <div className="space-y-2 px-4 pb-4 sm:px-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-ui-sm bg-surface-sunken" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-y border-line bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-subtle">
                <th className="px-4 py-2 font-medium sm:px-5">Miesiąc</th>
                <th className="px-3 py-2 text-right font-medium">Nowe konta</th>
                <th className="px-3 py-2 text-right font-medium">Oferty</th>
                <th className="px-3 py-2 text-right font-medium">Rezerwacje</th>
                <th className="px-3 py-2 text-right font-medium">Odbiory</th>
                <th className="px-4 py-2 text-right font-medium sm:px-5">Uratowane szt.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ label, stats }) => (
                <tr key={label} className="border-b border-line last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 capitalize text-ink sm:px-5">{label}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink-muted">{cell(stats, (s) => s.users.newInRange)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink-muted">{cell(stats, (s) => s.offers.createdInRange)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink-muted">{cell(stats, (s) => s.reservations.createdInRange)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink-muted">{cell(stats, (s) => s.pickups.collected)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-ink sm:px-5">{cell(stats, (s) => s.pickups.savedUnits)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
