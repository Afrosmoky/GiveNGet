"use client";

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { FiChevronDown, FiLogOut } from 'react-icons/fi';
import { Avatar, cn } from '../ui';
import type { AuthTokenData } from '../../utils/auth';
import type { NavItem } from './navConfig';
import { useDismiss } from './useDismiss';

interface UserMenuProps {
  user: Partial<AuthTokenData> | null;
  items: NavItem[];
  unreadCount: number;
  onLogout: () => void;
}

export function UserMenu({ user, items, unreadCount, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, ref, close);

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Konto';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Menu konta"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 transition-colors hover:bg-surface-sunken',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
          open && 'bg-surface-sunken'
        )}
      >
        <Avatar name={name} src={user?.profilePhotoUrl || null} size="sm" />
        <FiChevronDown size={14} className="hidden text-ink-subtle sm:block" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-ui-lg border border-line bg-surface shadow-pop">
          <div className="border-b border-line bg-surface-muted px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            {user?.email && <p className="truncate text-xs text-ink-muted">{user.email}</p>}
          </div>
          <div className="p-1.5">
            {items.map(item =>
              item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  role="menuitem"
                  onClick={close}
                  className="flex items-center gap-3 rounded-ui-sm px-2.5 py-2 text-sm text-ink transition-colors hover:bg-surface-sunken"
                >
                  <item.icon size={16} className="text-ink-muted" />
                  <span className="flex-1">{item.label}</span>
                  {item.href === '/chats' && unreadCount > 0 && (
                    <span className="rounded-full bg-danger px-1.5 text-xs font-bold text-white">{unreadCount}</span>
                  )}
                </Link>
              ) : null
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onLogout();
              }}
              className="mt-1 flex w-full items-center gap-3 rounded-ui-sm px-2.5 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-soft"
            >
              <FiLogOut size={16} />
              Wyloguj
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
