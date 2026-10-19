"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiChevronsLeft, FiLogOut, FiX } from 'react-icons/fi';
import { IconButton, Logo, cn } from '../ui';
import { isNavActive, type NavItem } from './navConfig';
import { SoonTag } from './NavLinkItem';

interface SidebarProps {
  items: NavItem[];
  title: string;
  collapsed: boolean;
  animate: boolean;
  onToggleCollapse: () => void;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
  onLogout: () => void;
}

/** Podpowiedź przy ikonie w trybie rail. Widoczna na hover i przy fokusie z klawiatury. */
function RailTooltip({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-ui-sm bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-pop transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}

function SidebarItem({ item, active, rail }: { item: NavItem; active: boolean; rail: boolean }) {
  const Icon = item.icon;
  const base = cn(
    'group relative flex h-10 items-center gap-3 rounded-ui-sm text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
    rail ? 'justify-center px-0' : 'px-3'
  );
  const label = (
    <span className={cn('flex-1 truncate', rail && 'sr-only')}>
      {item.label}
    </span>
  );

  if (!item.href) {
    return (
      <div aria-disabled="true" tabIndex={rail ? 0 : -1} className={cn(base, 'cursor-default text-ink-subtle')}>
        <Icon size={18} className="shrink-0" />
        {label}
        {!rail && <SoonTag />}
        {rail && <RailTooltip>{item.label} · wkrótce</RailTooltip>}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(base, active ? 'bg-brand-soft text-brand-strong' : 'text-brand-ink/75 hover:bg-surface-sunken hover:text-brand-ink')}
    >
      <Icon size={18} className={cn('shrink-0', active && 'text-brand')} />
      {label}
      {rail && <RailTooltip>{item.label}</RailTooltip>}
    </Link>
  );
}

function SidebarBody({
  items,
  title,
  rail,
  onLogout,
  footer,
  header,
}: {
  items: NavItem[];
  title: string;
  rail: boolean;
  onLogout: () => void;
  footer?: React.ReactNode;
  header?: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';
  return (
    <>
      <div className={cn('flex h-topbar shrink-0 items-center gap-2 border-b border-line', rail ? 'justify-center px-2' : 'px-4')}>
        <Logo compact={rail} />
        {!rail && <span className="truncate text-xs font-medium text-ink-subtle">{title}</span>}
        {header}
      </div>
      {/* W trybie rail overflow musi być widoczny, inaczej tooltipy zostaną ucięte */}
      <nav aria-label={title} className={cn('flex-1 py-3', rail ? 'overflow-visible px-2' : 'overflow-y-auto px-3')}>
        <ul className="flex flex-col gap-0.5">
          {items.map(item => (
            <li key={item.label}>
              <SidebarItem item={item} active={isNavActive(pathname, item)} rail={rail} />
            </li>
          ))}
        </ul>
      </nav>
      <div className={cn('flex shrink-0 flex-col gap-0.5 border-t border-line py-3', rail ? 'px-2' : 'px-3')}>
        <button
          type="button"
          onClick={onLogout}
          className={cn(
            'group relative flex h-10 items-center gap-3 rounded-ui-sm text-sm font-medium text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
            rail ? 'justify-center' : 'px-3'
          )}
        >
          <FiLogOut size={18} className="shrink-0" />
          <span className={cn(rail && 'sr-only')}>Wyloguj</span>
          {rail && <RailTooltip>Wyloguj</RailTooltip>}
        </button>
        {footer}
      </div>
    </>
  );
}

export function Sidebar({ items, title, collapsed, animate, onToggleCollapse, drawerOpen, onCloseDrawer, onLogout }: SidebarProps) {
  // Escape zamyka drawer; blokada przewijania tła, gdy otwarty
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseDrawer();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen, onCloseDrawer]);

  return (
    <>
      {/* Desktop: stały sidebar, zwijany do railu */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface lg:flex',
          animate && 'transition-[width] duration-200 ease-out motion-reduce:transition-none',
          collapsed ? 'w-[72px]' : 'w-sidebar'
        )}
      >
        <SidebarBody
          items={items}
          title={title}
          rail={collapsed}
          onLogout={onLogout}
          footer={
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Rozwiń menu' : 'Zwiń menu'}
              className={cn(
                'group relative flex h-10 items-center gap-3 rounded-ui-sm text-sm font-medium text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                collapsed ? 'justify-center' : 'px-3'
              )}
            >
              <FiChevronsLeft size={18} className={cn('shrink-0 transition-transform duration-200', collapsed && 'rotate-180')} />
              <span className={cn(collapsed && 'sr-only')}>Zwiń menu</span>
              {collapsed && <RailTooltip>Rozwiń menu</RailTooltip>}
            </button>
          }
        />
      </aside>

      {/* Mobile: drawer z pełną listą */}
      <div className={cn('fixed inset-0 z-50 lg:hidden', drawerOpen ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!drawerOpen}>
        <div
          className={cn('absolute inset-0 bg-neutral-900/40 transition-opacity duration-200', drawerOpen ? 'opacity-100' : 'opacity-0')}
          onClick={onCloseDrawer}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn(
            'absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-surface shadow-pop transition-transform duration-200 ease-out motion-reduce:transition-none',
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {drawerOpen && (
            <SidebarBody
              items={items}
              title={title}
              rail={false}
              onLogout={onLogout}
              header={<IconButton label="Zamknij menu" icon={<FiX size={20} />} onClick={onCloseDrawer} className="-mr-2 ml-auto" />}
            />
          )}
        </aside>
      </div>
    </>
  );
}
