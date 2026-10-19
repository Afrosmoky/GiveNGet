"use client";

import React from 'react';
import { LuFilePlus } from 'react-icons/lu';
import { cn } from './ui';

interface FreeOffersCounterProps {
  freeOffersCount: number;
  size?: 'small' | 'medium' | 'large';
  showWarning?: boolean;
  className?: string;
}

const SIZES = {
  small: { pill: 'px-2 py-0.5 text-xs', icon: 12 },
  medium: { pill: 'px-2.5 py-1 text-sm', icon: 14 },
  large: { pill: 'px-3 py-1.5 text-base', icon: 16 },
} as const;

/** Limit darmowych ofert w miesiącu — zielony, gdy jest zapas; ostrzeżenie przy końcu limitu. */
export const FreeOffersCounter: React.FC<FreeOffersCounterProps> = ({
  freeOffersCount,
  size = 'medium',
  showWarning = true,
  className = ''
}) => {
  const sizes = SIZES[size] ?? SIZES.medium;

  const tone =
    freeOffersCount === 0
      ? 'border-danger/30 bg-danger-soft text-danger'
      : freeOffersCount <= 2
        ? 'border-warning/30 bg-warning-soft text-warning'
        : 'border-brand/20 bg-brand-soft text-brand-strong';

  const warning =
    freeOffersCount === 0
      ? 'Brak darmowych ofert! Utwórz ofertę w następnym miesiącu lub rozważ boost.'
      : freeOffersCount <= 2
        ? 'Pozostało tylko kilka darmowych ofert w tym miesiącu.'
        : null;

  return (
    <span className={cn('inline-flex flex-col items-center gap-1', className)}>
      <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-medium', tone, sizes.pill)}>
        <LuFilePlus size={sizes.icon} aria-hidden className="shrink-0" />
        {freeOffersCount} darmowych ofert
      </span>
      {showWarning && warning && <span className="text-center text-xs text-ink-muted">{warning}</span>}
    </span>
  );
};

export default FreeOffersCounter;
