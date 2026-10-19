"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiPlus } from 'react-icons/fi';
import { cn } from '../ui';
import { consumerBottomNav, isNavActive } from './navConfig';

/** Dolny pasek konsumenta — tylko mobile. Środkowa pozycja („Dodaj”) wyróżniona. */
export function BottomNav() {
  const pathname = usePathname() ?? '';
  return (
    <nav
      aria-label="Nawigacja dolna"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex h-bottomnav max-w-md items-stretch justify-around px-2">
        {consumerBottomNav.map(item => {
          const active = isNavActive(pathname, item);
          const isAdd = item.href === '/create-offer';
          return (
            <li key={item.label} className="flex flex-1">
              <Link
                href={item.href!}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                  active ? 'text-brand' : 'text-ink-muted hover:text-ink'
                )}
              >
                {isAdd ? (
                  <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-brand-contrast shadow-pop ring-4 ring-surface">
                    <FiPlus size={22} />
                  </span>
                ) : (
                  <item.icon size={20} />
                )}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
