import type { ReactNode } from 'react';
import { LuSparkles } from 'react-icons/lu';
import { Card, cn } from '../ui';

interface ComingSoonProps {
  title: string;
  description: ReactNode;
  /** Np. przycisk do istniejącego odpowiednika funkcji. */
  action?: ReactNode;
  className?: string;
}

/** Zakładka konta, której funkcja jeszcze nie istnieje — spokojny stan „wkrótce” zamiast „T.B.D”. */
export function ComingSoon({ title, description, action, className }: ComingSoonProps) {
  return (
    <Card padding="lg" className={cn('flex flex-col items-center gap-3 py-10 text-center', className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
        <LuSparkles size={22} aria-hidden />
      </span>
      <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        Wkrótce
      </span>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="max-w-sm text-sm text-ink-muted">{description}</p>
      {action}
    </Card>
  );
}
