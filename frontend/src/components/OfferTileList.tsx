"use client";

import React, { useRef, useState, useCallback } from 'react';
import OfferTile from './OfferTile';
import { OfferTileSkeleton } from './offer/OfferTileSkeleton';
import { OfferTileProps } from '../types/offer';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { cn } from './ui';

const ARROW =
  'absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/95 text-ink-muted shadow-pop opacity-0 transition-opacity duration-200 hover:text-ink group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:hover)]:flex';

export interface OfferTileListProps {
  offers: OfferTileProps[];
  loading?: boolean;
  emptyMessage?: string;
  /** @deprecated Kafelek jest płynny, szerokość w rzędzie wyznacza lista. Ignorowane. */
  tileWidth?: number;
  /** @deprecated Ignorowane. */
  tileHeight?: number;
  /** @deprecated Ignorowane. */
  imageWidth?: number;
  /** @deprecated Ignorowane. */
  imageHeight?: number;
  isEditing?: boolean;
  showStatus?: boolean;
  onFavoriteToggle?: (offerId: string, currentIsFavorite: boolean) => Promise<void>;
}

export default function OfferTileList({
  offers,
  loading = false,
  emptyMessage = 'Brak ofert',
  isEditing = false,
  showStatus = false,
  onFavoriteToggle
}: OfferTileListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const scrollTo = useCallback((direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollAmount = container.offsetWidth * 0.8; // Przewiń o 80% szerokości kontenera
    
    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeft(scrollContainerRef.current?.scrollLeft || 0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const x = e.touches[0].pageX - (scrollContainerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    }
  }, [isDragging, startX, scrollLeft]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden py-2.5" aria-busy="true">
        {Array.from({ length: 5 }, (_, i) => (
          <OfferTileSkeleton key={i} className="w-[220px] shrink-0" />
        ))}
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <p className="p-10 text-center text-sm text-ink-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="relative group">
      {/* Strzałki przewijania — tylko na urządzeniach z kursorem (hover) */}
      <button
        type="button"
        onClick={() => scrollTo('left')}
        className={cn(ARROW, 'left-0 -ml-3')}
        aria-label="Przewiń w lewo"
      >
        <LuChevronLeft size={18} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => scrollTo('right')}
        className={cn(ARROW, 'right-0 -mr-3')}
        aria-label="Przewiń w prawo"
      >
        <LuChevronRight size={18} aria-hidden />
      </button>

      {/* Kontener z ofertami */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth py-2.5"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {offers.map((offer) => (
          // Stała szerokość w rzędzie przewijanym poziomo — kafelek sam jest płynny
          <div key={offer.id} className="flex w-[220px] shrink-0">
            <OfferTile
              {...offer}
              className="w-full"
              isEditing={isEditing}
              showStatus={showStatus}
              onFavoriteToggle={onFavoriteToggle}
            />
          </div>
        ))}
      </div>

      {/* CSS dla ukrycia scrollbara */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
} 