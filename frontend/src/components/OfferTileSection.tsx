"use client";

import React from 'react';
import OfferTileList, { OfferTileListProps } from './OfferTileList';
import { Card, CardHeader } from './ui';

export interface OfferTileSectionProps extends OfferTileListProps {
  title: string;
  /** Opcjonalny link/akcja w nagłówku sekcji (np. „Zobacz wszystkie”). */
  actions?: React.ReactNode;
  /** @deprecated Odstęp między sekcjami nadaje rodzic. Ignorowane. */
  marginTop?: number;
  showCount?: boolean;
  className?: string;
}

/** Sekcja z poziomym rzędem kafelków ofert — te same kafelki co w wyszukiwarce. */
export default function OfferTileSection({
  title,
  actions,
  showCount = false,
  offers = [],
  className,
  ...offerTileListProps
}: OfferTileSectionProps) {
  const heading = showCount && offers.length > 0 ? `${title} (${offers.length})` : title;

  return (
    <Card padding="lg" className={className}>
      <CardHeader title={heading} actions={actions} className="mb-3" />
      <OfferTileList offers={offers} {...offerTileListProps} />
    </Card>
  );
}
