import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: ReactNode;
  /** Licznik po prawej (np. liczba ofert w kategorii). */
  count?: number;
}

/** Przełączany filtr. Stan wybrania przekazywany przez aria-pressed. */
export function Chip({ selected = false, icon, count, className, children, type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        selected
          ? 'border-brand/40 bg-brand-soft text-brand-strong'
          : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
        className
      )}
      {...rest}
    >
      {icon}
      {children}
      {count !== undefined && (
        <span className={cn('text-xs', selected ? 'text-brand-strong/70' : 'text-ink-subtle')}>{count}</span>
      )}
    </button>
  );
}
