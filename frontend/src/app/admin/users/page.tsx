"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LuCircleAlert, LuLock, LuLockOpen, LuRefreshCw, LuSearch, LuStore, LuUserPlus, LuUserRoundX, LuUsers, LuExternalLink } from 'react-icons/lu';
import { environment } from '../../../config';
import { authorizedFetch, getUserData } from '../../../utils/auth';
import { BanUserDialog, type BanTarget } from '../../../components/admin/BanUserDialog';
import { ActionMenu, Avatar, Badge, Button, Card, Input, MetricCard, PageHeader, Pager, Select, consolePage } from '../../../components/ui';
import { formatCount } from '../../../types/report';
import { formatShortDateTime } from '../../../utils/dateFormat';

interface UserStats {
  totalUsers: { total: number; active: number; banned: number };
  companies: { total: number; active: number; banned: number };
  registrations: { daily: number; weekly: number; monthly: number };
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  verified: boolean;
  banned: boolean;
  createDate: string;
}

/** Odpowiedź GET /api/admin/users (stary kształt, nie PageResponse). */
interface UsersResponse {
  users: User[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

interface UserFilters {
  page: number;
  size: number;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  searchTerm: string;
  userType: string;
  verified: boolean | null;
  banned: boolean | null;
}

const INITIAL_FILTERS: UserFilters = {
  page: 0,
  size: 20,
  sortBy: 'createDate',
  sortDirection: 'desc',
  searchTerm: '',
  userType: '',
  verified: null,
  banned: null,
};

/** Wartości UserType z backendu — nieznana wartość jest po cichu ignorowana przez API. */
const USER_TYPE_OPTIONS = [
  { value: 'REGULAR', label: 'Konsument' },
  { value: 'COMPANY', label: 'Firma' },
  { value: 'STORE_EMPLOYEE', label: 'Pracownik sklepu' },
  { value: 'EMPLOYEE', label: 'Moderator' },
  { value: 'ADMIN', label: 'Administrator' },
];

const SORT_OPTIONS = [
  { value: 'createDate:desc', label: 'Najnowsi' },
  { value: 'createDate:asc', label: 'Najstarsi' },
  { value: 'lastName:asc', label: 'Nazwisko A–Z' },
  { value: 'email:asc', label: 'E-mail A–Z' },
];

/** Opóźnienie wyszukiwania — bez niego każde naciśnięcie klawisza to osobne zapytanie. */
const SEARCH_DEBOUNCE_MS = 300;

function boolParam(value: string): boolean | null {
  return value === '' ? null : value === 'true';
}

export default function UsersPage() {
  const [role, setRole] = useState<'ADMIN' | 'EMPLOYEE' | null>(null);
  const [stats, setStats] = useState<UserStats | 'error' | null>(null);

  const [filters, setFilters] = useState<UserFilters>(INITIAL_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [usersData, setUsersData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [banTarget, setBanTarget] = useState<BanTarget | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await authorizedFetch(`${environment.apiUrl}/api/admin/user-stats`);
      setStats(response.ok ? ((await response.json()) as UserStats) : 'error');
    } catch {
      setStats('error');
    }
  }, []);

  const fetchUsers = useCallback(async (current: UserFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(current).forEach(([key, value]) => {
        if (value !== null && value !== '') params.append(key, String(value));
      });
      const response = await authorizedFetch(`${environment.apiUrl}/api/admin/users?${params}`);
      if (response.ok) {
        setUsersData((await response.json()) as UsersResponse);
      } else if (response.status === 403) {
        setError('Lista użytkowników jest dostępna tylko dla administratora.');
      } else {
        setError((await response.text()) || 'Nie udało się pobrać listy użytkowników.');
      }
    } catch {
      setError('Błąd połączenia z serwerem.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const userType = getUserData()?.userType;
    if (userType === 'ADMIN' || userType === 'EMPLOYEE') setRole(userType);
    void fetchStats();
  }, [fetchStats]);

  // Każda zmiana filtrów (w tym strony) to jedno zapytanie
  useEffect(() => {
    void fetchUsers(filters);
  }, [filters, fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => (prev.searchTerm === searchInput ? prev : { ...prev, searchTerm: searchInput, page: 0 }));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateFilter = (patch: Partial<UserFilters>) => setFilters((prev) => ({ ...prev, ...patch, page: 0 }));

  const refresh = () => {
    void fetchStats();
    void fetchUsers(filters);
  };

  const hasFilters = filters.searchTerm !== '' || filters.userType !== '' || filters.verified !== null || filters.banned !== null;

  return (
    <div className={consolePage}>
      <PageHeader
        title="Użytkownicy"
        description="Konta na platformie — wyszukiwanie, stan i blokady."
        actions={
          <Button variant="secondary" leftIcon={<LuRefreshCw size={16} />} onClick={refresh} disabled={loading}>
            Odśwież
          </Button>
        }
      />

      <StatsRow stats={stats} />

      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Input
            containerClassName="col-span-2"
            label="Szukaj"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Imię, nazwisko, e-mail…"
            leftIcon={<LuSearch size={16} />}
          />
          <Select label="Typ konta" value={filters.userType} onChange={(e) => updateFilter({ userType: e.target.value })}>
            <option value="">Wszystkie</option>
            {USER_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            label="Stan"
            value={filters.banned === null ? '' : String(filters.banned)}
            onChange={(e) => updateFilter({ banned: boolParam(e.target.value) })}
          >
            <option value="">Wszystkie</option>
            <option value="false">Aktywni</option>
            <option value="true">Zablokowani</option>
          </Select>
          <Select
            label="Weryfikacja"
            value={filters.verified === null ? '' : String(filters.verified)}
            onChange={(e) => updateFilter({ verified: boolParam(e.target.value) })}
          >
            <option value="">Wszystkie</option>
            <option value="true">Zweryfikowani</option>
            <option value="false">Niezweryfikowani</option>
          </Select>
          <Select
            label="Sortuj"
            value={`${filters.sortBy}:${filters.sortDirection}`}
            onChange={(e) => {
              const [sortBy, sortDirection] = e.target.value.split(':');
              updateFilter({ sortBy, sortDirection: sortDirection as 'asc' | 'desc' });
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        {hasFilters && (
          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchInput('');
                setFilters({ ...INITIAL_FILTERS, sortBy: filters.sortBy, sortDirection: filters.sortDirection });
              }}
            >
              Wyczyść filtry
            </Button>
          </div>
        )}
      </Card>

      <Card padding="none" className="overflow-hidden">
        {error ? (
          <div role="alert" className="flex flex-col items-start gap-3 p-4 sm:p-5">
            <p className="flex items-center gap-2 text-sm text-danger">
              <LuCircleAlert size={16} aria-hidden /> {error}
            </p>
            <Button variant="secondary" size="sm" onClick={() => void fetchUsers(filters)}>
              Spróbuj ponownie
            </Button>
          </div>
        ) : !usersData ? (
          <div className="space-y-2 p-4 sm:p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-ui-sm bg-surface-sunken" />
            ))}
          </div>
        ) : usersData.users.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium text-ink">Brak użytkowników</p>
            <p className="mt-1 text-sm text-ink-muted">{hasFilters ? 'Nikt nie pasuje do filtrów.' : 'Na platformie nie ma jeszcze kont.'}</p>
          </div>
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : undefined}>
            <UsersTable users={usersData.users} onBan={setBanTarget} />
            <UsersCards users={usersData.users} onBan={setBanTarget} />
          </div>
        )}
      </Card>

      {usersData && (
        <Pager
          page={usersData.currentPage}
          totalPages={usersData.totalPages}
          onChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          summary={`${formatCount(usersData.totalElements)} kont`}
          disabled={loading}
        />
      )}

      <BanUserDialog target={banTarget} actorRole={role} onClose={() => setBanTarget(null)} onDone={refresh} />
    </div>
  );
}

function StatsRow({ stats }: { stats: UserStats | 'error' | null }) {
  if (stats === 'error') return null; // Statystyki są dodatkiem — ich brak nie blokuje listy
  const v = (pick: (s: UserStats) => number) => (stats ? formatCount(pick(stats)) : '…');
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <MetricCard
        label="Konta"
        value={v((s) => s.totalUsers.total)}
        hint={stats ? `${formatCount(stats.totalUsers.active)} aktywnych` : undefined}
        icon={<LuUsers size={18} />}
      />
      <MetricCard label="Zablokowane" value={v((s) => s.totalUsers.banned)} icon={<LuUserRoundX size={18} />} />
      <MetricCard
        label="Firmy"
        value={v((s) => s.companies.total)}
        hint={stats ? `${formatCount(stats.companies.active)} aktywnych` : undefined}
        icon={<LuStore size={18} />}
      />
      <MetricCard
        label="Nowe w 7 dni"
        value={v((s) => s.registrations.weekly)}
        hint={stats ? `dziś ${stats.registrations.daily} · 30 dni ${stats.registrations.monthly}` : undefined}
        icon={<LuUserPlus size={18} />}
      />
    </div>
  );
}

function fullName(user: User): string {
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || `Użytkownik #${user.id}`;
}

function StatusBadges({ user }: { user: User }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {user.banned ? (
        <Badge tone="danger" dot>
          Zablokowany
        </Badge>
      ) : (
        <Badge tone="success" dot>
          Aktywny
        </Badge>
      )}
      {!user.verified && (
        <Badge tone="warning" dot>
          Niezweryfikowany
        </Badge>
      )}
    </div>
  );
}

function UserActions({ user, onBan }: { user: User; onBan: (t: BanTarget) => void }) {
  return (
    <ActionMenu
      label={`Akcje: ${fullName(user)}`}
      items={[
        {
          label: user.banned ? 'Odblokuj' : 'Zablokuj',
          icon: user.banned ? <LuLockOpen size={16} /> : <LuLock size={16} />,
          tone: user.banned ? 'default' : 'danger',
          onSelect: () => onBan({ id: user.id, name: fullName(user), banned: user.banned }),
        },
      ]}
    />
  );
}

function UsersTable({ users, onBan }: { users: User[]; onBan: (t: BanTarget) => void }) {
  return (
    <table className="hidden w-full text-sm md:table">
      <thead>
        <tr className="border-b border-line bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-subtle">
          <th className="px-4 py-2.5 font-medium sm:px-5">Użytkownik</th>
          <th className="px-3 py-2.5 font-medium">Telefon</th>
          <th className="px-3 py-2.5 font-medium">Stan</th>
          <th className="px-3 py-2.5 font-medium">Rejestracja</th>
          <th className="w-14 px-3 py-2.5">
            <span className="sr-only">Akcje</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id} className="border-b border-line last:border-0 hover:bg-surface-muted/60">
            <td className="px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <Avatar name={fullName(user)} size="sm" />
                <div className="min-w-0">
                  <Link href={`/profile/${user.id}`} className="block truncate font-medium text-ink hover:text-brand">
                    {fullName(user)}
                  </Link>
                  <p className="truncate text-xs text-ink-muted">
                    {user.email} · ID {user.id}
                  </p>
                </div>
              </div>
            </td>
            <td className="px-3 py-3 tabular-nums text-ink-muted">{user.phoneNumber || '—'}</td>
            <td className="px-3 py-3">
              <StatusBadges user={user} />
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-ink-muted">{formatShortDateTime(user.createDate)}</td>
            <td className="px-3 py-2 text-right">
              <UserActions user={user} onBan={onBan} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function UsersCards({ users, onBan }: { users: User[]; onBan: (t: BanTarget) => void }) {
  return (
    <ul className="divide-y divide-line md:hidden">
      {users.map((user) => (
        <li key={user.id} className="flex items-start gap-3 px-4 py-3">
          <Avatar name={fullName(user)} size="sm" className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <Link href={`/profile/${user.id}`} className="inline-flex items-center gap-1 font-medium text-ink">
              {fullName(user)}
              <LuExternalLink size={12} className="text-ink-subtle" aria-hidden />
            </Link>
            <p className="truncate text-xs text-ink-muted">{user.email}</p>
            <div className="mt-2">
              <StatusBadges user={user} />
            </div>
            <p className="mt-1.5 text-xs text-ink-subtle">
              ID {user.id} · {formatShortDateTime(user.createDate)}
            </p>
          </div>
          <UserActions user={user} onBan={onBan} />
        </li>
      ))}
    </ul>
  );
}
