"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FiMapPin, FiMenu, FiSearch } from 'react-icons/fi';
import { Button, IconButton, Logo, cn, pageContainer } from '../ui';
import { useChatNotifications } from '../../hooks/useChatNotifications';
import type { AuthTokenData } from '../../utils/auth';
import { consumerTopNav, isNavActive, storeNav, userMenuItems, type ShellVariant } from './navConfig';
import { NotificationsBell } from './NotificationsBell';
import { TopNavLink } from './NavLinkItem';
import { UserMenu } from './UserMenu';

interface TopBarProps {
  variant: ShellVariant;
  isLoggedIn: boolean;
  user: Partial<AuthTokenData> | null;
  /** Tytuł sekcji w konsoli (firma/admin). */
  consoleTitle?: string;
  onOpenDrawer?: () => void;
  onLogout: () => void;
}

/**
 * Jeden komponent paska dla wszystkich powłok — dzięki temu hook powiadomień czatu
 * żyje w jednym miejscu i nie remontuje się przy zmianie powłoki.
 */
export function TopBar({ variant, isLoggedIn, user, consoleTitle, onOpenDrawer, onLogout }: TopBarProps) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { unreadChats, markRead } = useChatNotifications();

  const isConsole = variant === 'company' || variant === 'admin';
  // Przeglądanie ofert, ulubione i rezerwacje są za logowaniem (backend), więc gość widzi tylko
  // logo i wejście do konta — inaczej każdy klik kończyłby się odbiciem na /login.
  const showConsumerNav = variant === 'consumer' && isLoggedIn;
  const hasLocation = Boolean(user?.lat && user?.lon);

  const accountArea =
    variant === 'pending' ? null : isLoggedIn ? (
      <>
        <NotificationsBell unreadChats={unreadChats} markRead={markRead} />
        <UserMenu user={user} items={userMenuItems(variant, user?.userType ?? null)} unreadCount={unreadChats.length} onLogout={onLogout} />
      </>
    ) : (
      <>
        <Button href="/login" variant="ghost" size="sm">
          Zaloguj
        </Button>
        <Button href="/register" variant="primary" size="sm">
          Załóż konto
        </Button>
      </>
    );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className={cn('flex h-topbar items-center gap-3', isConsole ? 'px-4' : pageContainer)}>
        {isConsole && (
          <IconButton label="Otwórz menu" icon={<FiMenu size={20} />} onClick={onOpenDrawer} className="-ml-2 lg:hidden" />
        )}

        {/* W konsoli logo jest w sidebarze; na mobile (sidebar schowany) pokazujemy je tutaj */}
        <Logo className={cn('shrink-0', isConsole && 'lg:hidden')} compact={isConsole} />

        {isConsole && consoleTitle && <p className="truncate text-sm font-semibold text-ink lg:text-base">{consoleTitle}</p>}

        {showConsumerNav && (
          <>
            <nav aria-label="Główna nawigacja" className="ml-2 hidden items-center gap-0.5 lg:flex">
              {consumerTopNav.map(item => (
                <TopNavLink key={item.label} item={item} active={isNavActive(pathname, item)} />
              ))}
            </nav>

            {/* Wyszukiwarka prowadzi do wyszukiwania ofert — tam są filtry i lokalizacja */}
            <button
              type="button"
              onClick={() => router.push('/offers/search')}
              className="ml-auto hidden h-10 w-full max-w-xs items-center gap-2 rounded-full border border-line bg-surface-muted px-4 text-left text-sm text-ink-subtle transition-colors hover:border-line-strong md:flex"
            >
              <FiSearch size={16} />
              Czego szukasz?
            </button>

            <Link
              href="/offers/search"
              className="hidden h-10 items-center gap-1.5 rounded-full px-3 text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink xl:flex"
              title={hasLocation ? 'Szukasz w pobliżu zapisanej lokalizacji' : 'Ustaw lokalizację w wyszukiwaniu'}
            >
              <FiMapPin size={16} className={hasLocation ? 'text-brand' : undefined} />
              {hasLocation ? 'Twoja okolica' : 'Ustaw lokalizację'}
            </Link>
          </>
        )}

        {variant === 'store' && (
          <nav aria-label="Nawigacja pracownika" className="ml-2 flex items-center gap-0.5">
            {storeNav.map(item => (
              <TopNavLink key={item.label} item={item} active={isNavActive(pathname, item)} />
            ))}
          </nav>
        )}

        <div className={cn('flex shrink-0 items-center gap-1', !showConsumerNav && 'ml-auto', showConsumerNav && 'ml-auto md:ml-0')}>
          {accountArea}
        </div>
      </div>

      {/* Mobile: pasek wyszukiwania pod logo (jak dotychczasowy MobileHeader) */}
      {showConsumerNav && (
        <div className={cn(pageContainer, 'pb-3 md:hidden')}>
          <button
            type="button"
            onClick={() => router.push('/offers/search')}
            className="flex h-10 w-full items-center gap-2 rounded-full border border-line bg-surface-muted px-4 text-left text-sm text-ink-subtle"
          >
            <FiSearch size={16} />
            Czego szukasz?
          </button>
        </div>
      )}
    </header>
  );
}
