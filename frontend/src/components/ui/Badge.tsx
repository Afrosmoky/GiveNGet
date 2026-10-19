import type { ReactNode } from 'react';
import { cn } from './cn';

export type BadgeTone = 'neutral' | 'brand' | 'accent' | 'highlight' | 'success' | 'warning' | 'danger';

const tones: Record<BadgeTone, { pill: string; dot: string }> = {
  neutral: { pill: 'bg-surface-sunken text-ink-muted', dot: 'bg-ink-subtle' },
  brand: { pill: 'bg-brand-soft text-brand-strong', dot: 'bg-brand' },
  accent: { pill: 'bg-accent-50 text-accent-700', dot: 'bg-accent-400' },
  // Pomarańcz z logo — tylko drobne akcenty (np. „Zostało 2”). Ostrzeżenia to `warning` (bursztyn).
  highlight: { pill: 'bg-brand-accent/15 text-brand-accent-ink', dot: 'bg-brand-accent' },
  success: { pill: 'bg-success-soft text-success', dot: 'bg-success' },
  warning: { pill: 'bg-warning-soft text-warning', dot: 'bg-warning' },
  danger: { pill: 'bg-danger-soft text-danger', dot: 'bg-danger' },
};

interface BadgeProps {
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  /** Kropka przed tekstem — dla statusów. */
  dot?: boolean;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', size = 'sm', dot, icon, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        tones[tone].pill,
        className
      )}
    >
      {dot && <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', tones[tone].dot)} />}
      {icon}
      {children}
    </span>
  );
}
