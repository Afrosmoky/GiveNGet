"use client";

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import {
  LuBan,
  LuChartColumn,
  LuChevronRight,
  LuFlag,
  LuHeadphones,
  LuLeaf,
  LuPackage,
  LuSearch,
  LuStore,
  LuUsers,
} from 'react-icons/lu';
import { environment } from '../../config';
import { authorizedFetch, getUserData } from '../../utils/auth';
import { Badge, Card, CardHeader, MetricCard, PageHeader, cn, consolePage } from '../../components/ui';
import { formatCount } from '../../types/report';
import type { PlatformStats } from '../../types/platformStats';
import type { ComplaintDto } from '../../types/complaint';
import { formatShortDateTime } from '../../utils/dateFormat';

interface UserStats {
  totalUsers: { total: number; active: number; banned: number };
  companies: { total: number; active: number; banned: number };
  registrations: { daily: number; weekly: number; monthly: number };
}

interface ConsultantChatSummary {
  status: 'OPENED' | 'ASSIGNED' | 'CLOSED';
  moderatorId: number | null;
}

/** Wartość kafelka: liczba, „—” przy błędzie, null w trakcie ładowania. */
type Count = number | 'error' | null;

async function fetchJson<T>(path: string): Promise<T | 'error'> {
  try {
    const response = await authorizedFetch(`${environment.apiUrl}${path}`);
    return response.ok ? ((await response.json()) as T) : 'error';
  } catch {
    return 'error';
  }
}

export default function AdminDashboardPage() {
  const [role, setRole] = useState<'ADMIN' | 'EMPLOYEE' | null>(null);
  const [firstName, setFirstName] = useState('');
  const [openComplaints, setOpenComplaints] = useState<ComplaintDto[] | 'error' | null>(null);
  const [waitingChats, setWaitingChats] = useState<Count>(null);
  const [myChats, setMyChats] = useState<Count>(null);
  const [userStats, setUserStats] = useState<UserStats | 'error' | null>(null);
  const [platform, setPlatform] = useState<PlatformStats | 'error' | null>(null);

  useEffect(() => {
    const user = getUserData();
    const userRole = user?.userType === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE';
    setRole(userRole);
    setFirstName(user?.firstName ?? '');

    // Kolejka moderacji — wspólna dla admina i moderatora (/api/mod/**)
    void fetchJson<ComplaintDto[]>('/api/mod/complaints?resolved=false').then(setOpenComplaints);
    void fetchJson<ConsultantChatSummary[]>('/api/mod/consultant-chat').then((chats) => {
      if (chats === 'error') {
        setWaitingChats('error');
        setMyChats('error');
        return;
      }
      setWaitingChats(chats.filter((c) => c.status === 'OPENED').length);
      setMyChats(chats.filter((c) => c.status === 'ASSIGNED' && c.moderatorId === user?.id).length);
    });

    // Liczby platformy — tylko ADMIN (/api/admin/**, /api/v1/stats/**)
    if (userRole === 'ADMIN') {
      void fetchJson<UserStats>('/api/admin/user-stats').then(setUserStats);
      void fetchJson<PlatformStats>('/api/v1/stats/platform').then(setPlatform);
    }
  }, []);

  const isAdmin = role === 'ADMIN';
  const complaintsCount: Count = openComplaints === null || openComplaints === 'error' ? openComplaints : openComplaints.length;

  return (
    <div className={consolePage}>
      <PageHeader
        title={firstName ? `Dzień dobry, ${firstName}` : 'Panel administracyjny'}
        description={isAdmin ? 'Kolejka moderacji i najważniejsze liczby platformy.' : 'Kolejka moderacji: skargi i czaty z konsultantem.'}
        actions={role && <Badge tone={isAdmin ? 'brand' : 'accent'} size="md">{isAdmin ? 'Administrator' : 'Moderator'}</Badge>}
      />

      <section aria-labelledby="queue-heading" className="mb-6">
        <h2 id="queue-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Do zrobienia
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <LinkedMetric href="/admin/complaints" label="Nierozwiązane skargi" value={complaintsCount} icon={<LuFlag size={18} />} />
          <LinkedMetric href="/admin/consultant-chats" label="Czaty czekające" value={waitingChats} icon={<LuHeadphones size={18} />} hint="bez przypisanego konsultanta" />
          <LinkedMetric
            href="/admin/consultant-chats"
            label="Moje czaty"
            value={myChats}
            icon={<LuHeadphones size={18} />}
            hint="przypisane do Ciebie"
            className="col-span-2 lg:col-span-1"
          />
        </div>
      </section>

      {isAdmin && (
        <section aria-labelledby="platform-heading" className="mb-6">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="platform-heading" className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
              Platforma
            </h2>
            <Link href="/admin/stats" className="text-sm font-medium text-brand hover:text-brand-hover">
              Statystyki pilotażu
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <MetricCard
              label="Użytkownicy"
              value={display(userStats === null || userStats === 'error' ? userStats : userStats.totalUsers.total)}
              hint={userStats && userStats !== 'error' ? `+${formatCount(userStats.registrations.weekly)} w 7 dni` : undefined}
              icon={<LuUsers size={18} />}
            />
            <MetricCard
              label="Sklepy (zweryfikowane)"
              value={display(platform === null || platform === 'error' ? platform : platform.stores.verified)}
              icon={<LuStore size={18} />}
            />
            <MetricCard
              label="Aktywne oferty"
              value={display(platform === null || platform === 'error' ? platform : platform.offers.active)}
              icon={<LuPackage size={18} />}
            />
            <MetricCard
              label="Uratowane sztuki"
              value={display(platform === null || platform === 'error' ? platform : platform.pickups.savedUnits)}
              hint="z potwierdzonych odbiorów"
              icon={<LuLeaf size={18} />}
            />
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Najnowsze nierozwiązane skargi"
            actions={
              <Link href="/admin/complaints" className="text-sm font-medium text-brand hover:text-brand-hover">
                Wszystkie
              </Link>
            }
          />
          <RecentComplaints complaints={openComplaints} />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Skróty" />
          <nav aria-label="Sekcje panelu" className="-mx-2 flex flex-col">
            {isAdmin && <Shortcut href="/admin/users" icon={<LuUsers size={18} />} title="Użytkownicy" description="Lista kont, blokady" />}
            <Shortcut href="/admin/complaints" icon={<LuFlag size={18} />} title="Skargi" description="Zgłoszenia, notatki, blokady ofert" />
            {isAdmin && <Shortcut href="/admin/forbidden-words" icon={<LuBan size={18} />} title="Słowa zakazane" description="Wzorce filtrowane w treściach" />}
            <Shortcut href="/admin/consultant-chats" icon={<LuHeadphones size={18} />} title="Czaty z konsultantem" description="Pomoc dla użytkowników" />
            {isAdmin && <Shortcut href="/admin/stats" icon={<LuChartColumn size={18} />} title="Statystyki pilotażu" description="Liczby do rozmów z siecią" />}
            <Shortcut href="/offers/search" icon={<LuSearch size={18} />} title="Przeglądaj oferty" description="Podgląd jak użytkownik" />
          </nav>
        </Card>
      </div>
    </div>
  );
}

function display(value: Count): ReactNode {
  if (value === null) return <span className="inline-block h-7 w-12 animate-pulse rounded-ui-sm bg-surface-sunken align-middle" aria-label="Ładowanie" />;
  if (value === 'error') return '—';
  return formatCount(value);
}

function LinkedMetric({
  href,
  label,
  value,
  icon,
  hint,
  className,
}: {
  href: string;
  label: string;
  value: Count;
  icon: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn('group block rounded-ui-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40', className)}>
      <MetricCard label={label} value={display(value)} icon={icon} hint={hint} className="h-full transition-shadow group-hover:border-line-strong group-hover:shadow-pop" />
    </Link>
  );
}

function Shortcut({ href, icon, title, description }: { href: string; icon: ReactNode; title: string; description: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-ui-md px-2 py-2.5 transition-colors hover:bg-surface-muted">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ui-sm bg-brand-soft text-brand">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="block truncate text-xs text-ink-muted">{description}</span>
      </span>
      <LuChevronRight size={16} className="shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

function RecentComplaints({ complaints }: { complaints: ComplaintDto[] | 'error' | null }) {
  if (complaints === null) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-ui-sm bg-surface-sunken" />
        ))}
      </div>
    );
  }
  if (complaints === 'error') return <p className="text-sm text-danger">Nie udało się pobrać skarg.</p>;
  if (complaints.length === 0) return <p className="py-6 text-center text-sm text-ink-muted">Brak nierozwiązanych skarg — kolejka jest pusta.</p>;

  const recent = [...complaints].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  return (
    <ul className="-mx-1 divide-y divide-line">
      {recent.map((c) => (
        <li key={c.id}>
          <Link href="/admin/complaints" className="flex items-center gap-3 rounded-ui-sm px-1 py-2.5 hover:bg-surface-muted">
            <Badge tone={c.type === 'CHAT' ? 'accent' : 'warning'}>{c.type === 'CHAT' ? 'Czat' : 'Oferta'}</Badge>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-ink">{c.explanation || 'Bez opisu'}</span>
              <span className="block truncate text-xs text-ink-muted">
                {c.reportedUserName ? `Na: ${c.reportedUserName}` : 'Brak wskazanego użytkownika'} · {formatShortDateTime(c.createdAt)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
