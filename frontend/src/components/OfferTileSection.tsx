"use client";

import React from 'react';
import OfferTileList, { OfferTileListProps } from './OfferTileList';

export interface OfferTileSectionProps extends OfferTileListProps {
  title: string;
  marginTop?: number;
  showCount?: boolean;
}

export default function OfferTileSection({
  title,
  marginTop = 0,
  showCount = false,
  offers = [],
  ...offerTileListProps
}: OfferTileSectionProps) {
  const getTitle = () => {
    if (showCount && offers.length > 0) {
      return `${title} (${offers.length})`;
    }
    return title;
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 md:p-10" style={{ marginTop: `${marginTop}px` }}>
      <h2 className="text-xl sm:text-2xl md:text-3xl text-gray-800 mb-4 sm:mb-6 font-bold">
        {getTitle()}
      </h2>
      
      <OfferTileList offers={offers} {...offerTileListProps} />
    </div>
  );
} 