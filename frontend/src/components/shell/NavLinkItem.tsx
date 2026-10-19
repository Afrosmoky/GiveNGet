"use client";

import Link from 'next/link';
import { cn } from '../ui';
import type { NavItem } from './navConfig';

/** Etykieta „wkrótce” dla pozycji bez strony. */
export function SoonTag({ className }: { className?: string }) {
  return (
    <span className={cn('rounded-full bg-surface-sunken px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-ink-subtle', className)}>
      wkrótce
    </span>
  );
}

/** Link w górnym pasku konsumenta. */
export function TopNavLink({ item, active }: { item: NavItem; active: boolean }) {
  const base = 'inline-flex h-9 items-center gap-1.5 rounded-ui-sm px-3 text-sm font-medium transition-colors';
  if (!item.href) {
    return (
      <span aria-disabled="true" className={cn(base, 'cursor-default text-ink-subtle')}>
        {item.label}
        <SoonTag />
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(base, active ? 'bg-brand-soft text-brand-strong' : 'text-ink-muted hover:bg-surface-sunken hover:text-ink')}
    >
      {item.label}
    </Link>
  );
}
