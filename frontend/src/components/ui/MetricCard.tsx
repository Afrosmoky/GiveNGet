import type { ReactNode } from 'react';
import { Card } from './Card';
import { cn } from './cn';

interface MetricCardProps {
  label: ReactNode;
  value: ReactNode;
  /** Jednostka obok wartości (np. „kg”, „zł”). */
  unit?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  /** Zmiana względem poprzedniego okresu — wyliczona w backendzie, tu tylko wyświetlana. */
  delta?: { label: ReactNode; trend: 'up' | 'down' | 'flat' };
  className?: string;
}

const trendClass = {
  up: 'text-success',
  down: 'text-danger',
  flat: 'text-ink-muted',
};

const trendArrow = { up: '↑', down: '↓', flat: '→' };

export function MetricCard({ label, value, unit, hint, icon, delta, className }: MetricCardProps) {
  return (
    <Card padding="md" className={className}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ui-sm bg-brand-soft text-brand">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 flex items-baseline gap-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {value}
        {unit && <span className="text-base font-medium text-ink-muted">{unit}</span>}
      </p>
      {(delta || hint) && (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
          {delta && (
            <span className={cn('font-semibold', trendClass[delta.trend])}>
              {trendArrow[delta.trend]} {delta.label}
            </span>
          )}
          {hint && <span className="text-ink-muted">{hint}</span>}
        </div>
      )}
    </Card>
  );
}
