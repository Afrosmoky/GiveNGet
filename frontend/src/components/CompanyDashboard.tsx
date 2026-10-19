"use client";

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LuArrowRight,
  LuCalendarCheck,
  LuChartColumn,
  LuCircleCheck,
  LuLeaf,
  LuPackage,
  LuPlus,
  LuTriangleAlert,
  LuUpload,
  LuUsers,
} from 'react-icons/lu';
import { environment } from '../config';
import { authorizedFetch, getUserData } from '../utils/auth';
import type { PageResponse, StoreReservation } from '../types/reservation';
import UserRankBadge from './UserRankBadge';
import { StoreReservationList } from './store/StoreReservationList';
import { Button, Card, CardHeader, MetricCard, PageHeader, consolePage } from './ui';

interface ActivitySummary {
  totalOffers: number;
  activeOffers: number;
  pendingOffers: number;
  expiredOffers: number;
  messagesFromUsers: number;
  totalViews: number;
}

interface DashboardData {
  activitySummary: ActivitySummary;
  popularityOverTime: Record<string, number>;
  ctrData: Record<string, { offerId: string; offerName: string; views: number; clicks: number; ctr: number }>;
}

interface SavingsSummary {
  savedProductsCount: number;
}

const RESERVATIONS = `${environment.apiUrl}/api/v1/reservations/for-store`;
const RECENT_LIMIT = 5;

/** Liczba z koperty paginacji (size=1) — backend liczy, front tylko wyświetla. */
async function countReservations(status: 'RESERVED' | 'COLLECTED'): Promise<number | null> {
  const response = await authorizedFetch(`${RESERVATIONS}?status=${status}&size=1`);
  if (!response.ok) return null;
  const page: PageResponse<StoreReservation> = await response.json();
  return page.totalElements;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await authorizedFetch(url);
  return response.ok ? ((await response.json()) as T) : null;
}

const SHORTCUTS: { href: string; label: string; description: string; icon: ReactNode }[] = [
  { href: '/create-offer', label: 'Dodaj ofertę', description: 'Wystaw produkt z krótkim terminem', icon: <LuPlus size={20} /> },
  { href: '/offers/import', label: 'Import z Excela', description: 'Wiele ofert naraz z arkusza', icon: <LuUpload size={20} /> },
  { href: '/reports/savings', label: 'Raport oszczędności', description: 'Ile jedzenia uratowaliście', icon: <LuChartColumn size={20} /> },
  { href: '/store/employees', label: 'Pracownicy', description: 'Konta do potwierdzania odbiorów', icon: <LuUsers size={20} /> },
];

/** Pulpit konta firmowego: metryki, skróty, ostatnie rezerwacje i statystyki ofert. */
export function CompanyDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeReservations, setActiveReservations] = useState<number | null>(null);
  const [collected, setCollected] = useState<number | null>(null);
  const [savings, setSavings] = useState<SavingsSummary | null>(null);
  const [recent, setRecent] = useState<StoreReservation[] | null>(null);
  const [userRank, setUserRank] = useState<{ rank?: string; trustPoints?: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const firstName = getUserData()?.firstName;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const dashboardResponse = await authorizedFetch(`${environment.apiUrl}/api/company/dashboard-data`);
        if (dashboardResponse.status === 401) {
          router.push('/unauthorized');
          return;
        }
        if (!dashboardResponse.ok) {
          if (!cancelled) setError('Nie udało się wczytać danych pulpitu.');
          return;
        }
        const dashboard: DashboardData = await dashboardResponse.json();

        // Pozostałe źródła są niezależne — błąd jednego nie blokuje pulpitu (kafelek pokaże „—”)
        const [reserved, collectedCount, savingsReport, recentPage] = await Promise.all([
          countReservations('RESERVED').catch(() => null),
          countReservations('COLLECTED').catch(() => null),
          fetchJson<SavingsSummary>(`${environment.apiUrl}/api/v1/reports/savings`).catch(() => null),
          fetchJson<PageResponse<StoreReservation>>(`${RESERVATIONS}?size=${RECENT_LIMIT}`).catch(() => null),
        ]);

        if (cancelled) return;
        setData(dashboard);
        setActiveReservations(reserved);
        setCollected(collectedCount);
        setSavings(savingsReport);
        setRecent(recentPage?.content ?? []);
      } catch {
        if (!cancelled) setError('Błąd połączenia z serwerem. Sprawdź połączenie internetowe.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // Ranga konta (jak wcześniej zapisywana też w localStorage dla innych widoków)
    (async () => {
      try {
        const response = await authorizedFetch(`${environment.apiUrl}/api/user/dashboard`);
        if (!response.ok) return;
        const { user } = await response.json();
        if (!user || cancelled) return;
        setUserRank({ rank: user.userRank, trustPoints: user.trustPoints });
        if (user.userRank) localStorage.setItem('userRank', user.userRank);
        if (user.trustPoints !== undefined) localStorage.setItem('trustPoints', String(user.trustPoints));
        if (user.freeOffersCount !== undefined) localStorage.setItem('freeOffersCount', String(user.freeOffersCount));
      } catch {
        const stored = getUserData();
        if (stored && !cancelled) setUserRank({ rank: stored.userRank, trustPoints: stored.trustPoints });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const value = (n: number | null | undefined) => (loading ? '…' : n ?? '—');

  return (
    <div className={consolePage}>
      <PageHeader
        title={firstName ? `Dzień dobry, ${firstName}` : 'Pulpit'}
        description="Co się dzieje w Twoim sklepie."
        actions={
          <>
            {userRank.rank && <UserRankBadge rank={userRank.rank} trustPoints={userRank.trustPoints} size="small" />}
            <Button href="/create-offer" leftIcon={<LuPlus size={16} />}>
              Dodaj ofertę
            </Button>
          </>
        }
      />

      {error && (
        <Card className="mb-6 flex items-center gap-3 border-danger/30 bg-danger-soft text-sm text-danger">
          <LuTriangleAlert size={18} aria-hidden />
          <span className="flex-1">{error}</span>
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
            Spróbuj ponownie
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard label="Aktywne oferty" value={value(data?.activitySummary.activeOffers)} icon={<LuPackage size={18} />} hint={data ? `${data.activitySummary.totalOffers} łącznie` : undefined} />
        <MetricCard label="Do odbioru" value={value(activeReservations)} icon={<LuCalendarCheck size={18} />} hint="aktywne rezerwacje" />
        <MetricCard label="Odbiory" value={value(collected)} icon={<LuCircleCheck size={18} />} hint="potwierdzone" />
        <MetricCard label="Uratowane sztuki" value={value(savings?.savedProductsCount)} icon={<LuLeaf size={18} />} hint="od początku" />
      </div>

      {/* Skróty */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {SHORTCUTS.map(s => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex items-start gap-3 rounded-ui-xl border border-line bg-surface p-4 shadow-card transition-shadow hover:border-line-strong hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ui-sm bg-brand-soft text-brand" aria-hidden>
              {s.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink group-hover:text-brand">{s.label}</span>
              <span className="mt-0.5 hidden text-xs text-ink-muted sm:block">{s.description}</span>
            </span>
          </Link>
        ))}
      </div>

      {/* Ostatnie rezerwacje */}
      <Card className="mt-6">
        <CardHeader
          title="Ostatnie rezerwacje"
          description="Najnowsze rezerwacje klientów na Twoje oferty."
          actions={
            <Button href="/store/reservations" variant="ghost" size="sm" rightIcon={<LuArrowRight size={16} />}>
              Wszystkie
            </Button>
          }
        />
        {recent === null ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-ui-md bg-surface-sunken" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">Nie ma jeszcze rezerwacji na Twoje oferty.</p>
        ) : (
          <StoreReservationList items={recent} />
        )}
      </Card>

      {data && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <ViewsChart points={data.popularityOverTime} />
          <TopOffers ctr={data.ctrData} summary={data.activitySummary} />
        </div>
      )}
    </div>
  );
}

/** Wyświetlenia ofert dzień po dniu — proste słupki (bez biblioteki wykresów). */
function ViewsChart({ points }: { points: Record<string, number> }) {
  const entries = Object.entries(points ?? {}).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
  const max = Math.max(1, ...entries.map(([, v]) => v));

  return (
    <Card>
      <CardHeader title="Wyświetlenia ofert" description="Dzień po dniu, ostatnie 14 dni." />
      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">Brak danych do wyświetlenia.</p>
      ) : (
        <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Wyświetlenia ofert w kolejnych dniach">
          {entries.map(([date, count]) => (
            <div key={date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[11px] font-medium tabular-nums text-ink-muted">{count}</span>
              <div
                className="w-full max-w-10 rounded-t-ui-sm bg-brand/80"
                style={{ height: `${Math.max(4, (count / max) * 100)}%` }}
                title={`${date}: ${count}`}
              />
              <span className="truncate text-[10px] text-ink-subtle">
                {new Date(date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** Oferty z największą liczbą wyświetleń + skuteczność (kliknięcia / wyświetlenia, liczona w backendzie). */
function TopOffers({ ctr, summary }: { ctr: DashboardData['ctrData']; summary: ActivitySummary }) {
  const rows = Object.values(ctr ?? {})
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader
        title="Najczęściej oglądane"
        description={`${summary.pendingOffers} oczekuje na weryfikację · ${summary.expiredOffers} wygasłych · ${summary.messagesFromUsers} wiadomości`}
      />
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">Brak danych do wyświetlenia.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-subtle">
              <th className="py-2 pr-3 font-medium">Oferta</th>
              <th className="px-2 py-2 text-right font-medium">Wyśw.</th>
              <th className="px-2 py-2 text-right font-medium">Klik.</th>
              <th className="py-2 pl-2 text-right font-medium">CTR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.offerId} className="border-b border-line last:border-0">
                <td className="max-w-0 py-2.5 pr-3">
                  <span className="block truncate text-ink" title={r.offerName}>
                    {r.offerName}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums text-ink-muted">{r.views}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-ink-muted">{r.clicks}</td>
                <td className="py-2.5 pl-2 text-right tabular-nums font-medium text-ink">{r.ctr.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
