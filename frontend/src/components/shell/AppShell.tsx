"use client";

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '../ui';
import { Footer } from '../Footer';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { logout } from '../../utils/auth';
import { adminNav, companyNav, shellVariantFor } from './navConfig';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useSidebarCollapsed } from './useSidebarCollapsed';

/**
 * Ekrany auth (formularze i ich statusy) — bez dolnej nawigacji na mobile: zakładki i tak
 * prowadzą gościa do logowania, a nad klawiaturą tylko zasłaniają formularz.
 */
const AUTH_ROUTES = ['/login', '/register', '/reset-password', '/activate', '/user-not-confirmed'];

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
}

/**
 * Powłoka aplikacji wybierana po typie konta:
 * konsument (gość/REGULAR), konsola firmy (COMPANY), konsola admina (ADMIN/EMPLOYEE),
 * minimalny układ pracownika sklepu (STORE_EMPLOYEE).
 *
 * WAŻNE: `children` zawsze leży w tym samym miejscu drzewa (div > div > main), a powłoki
 * różnią się tylko rodzeństwem. Dzięki temu strona nie remontuje się, gdy po odczycie
 * localStorage zmienia się powłoka (pending → company itd.) — brak podwójnych fetchy.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { ready, isLoggedIn, user, userType } = useCurrentUser();
  const variant = shellVariantFor(ready, userType);
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { collapsed, toggle, animate } = useSidebarCollapsed();

  // Nawigacja zamyka drawer
  useEffect(() => setDrawerOpen(false), [pathname]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const handleLogout = useCallback(() => {
    logout();
    router.push('/?message=logged-out');
  }, [router]);

  // Dolny pasek tylko dla zalogowanego konsumenta — wszystkie jego pozycje wymagają konta
  const showBottomNav = variant === 'consumer' && isLoggedIn && !isAuthRoute(pathname);
  const isConsole = variant === 'company' || variant === 'admin';
  const consoleTitle = variant === 'company' ? 'Panel sklepu' : variant === 'admin' ? 'Panel administracyjny' : undefined;
  const consoleItems = variant === 'company' ? companyNav(user?.id) : variant === 'admin' ? adminNav(userType === 'ADMIN') : [];

  return (
    <div className="flex min-h-screen bg-surface-muted">
      {isConsole ? (
        <Sidebar
          items={consoleItems}
          title={consoleTitle!}
          collapsed={collapsed}
          animate={animate}
          onToggleCollapse={toggle}
          drawerOpen={drawerOpen}
          onCloseDrawer={closeDrawer}
          onLogout={handleLogout}
        />
      ) : null}

      {/* Odstęp na dolną nawigację mobile na całej kolumnie — stopka też nie może pod nią wejść */}
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col',
          showBottomNav && 'pb-[calc(var(--shell-bottomnav-h)+env(safe-area-inset-bottom))] md:pb-0'
        )}
      >
        <TopBar
          variant={variant}
          isLoggedIn={isLoggedIn}
          user={user}
          consoleTitle={consoleTitle}
          onOpenDrawer={() => setDrawerOpen(true)}
          onLogout={handleLogout}
        />

        <main
          className={cn(
            'flex-1',
            // Strony na AuthCard: main jako kolumna, żeby karta mogła wypełnić wysokość między paskiem a stopką
            'has-[[data-auth-page]]:flex has-[[data-auth-page]]:flex-col',
            variant === 'store' && 'mx-auto w-full max-w-3xl'
          )}
        >
          {children}
        </main>

        {variant === 'consumer' ? <Footer /> : null}

        {showBottomNav ? <BottomNav /> : null}
      </div>
    </div>
  );
}
