"use client";

import React, { useRef, useState, useCallback } from 'react';
import OfferTile from './OfferTile';
import { OfferTileProps } from '../types/offer';

export interface OfferTileListProps {
  offers: OfferTileProps[];
  loading?: boolean;
  emptyMessage?: string;
  tileWidth?: number;
  tileHeight?: number;
  imageWidth?: number;
  imageHeight?: number;
  isEditing?: boolean;
  showStatus?: boolean;
  onFavoriteToggle?: (offerId: string, currentIsFavorite: boolean) => Promise<void>;
}

export default function OfferTileList({
  offers,
  loading = false,
  emptyMessage = 'Brak ofert',
  tileWidth = 200,
  tileHeight = 220,
  imageWidth = 150,
  imageHeight = 90,
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
      <div className="flex justify-center items-center p-10">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-yellow-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <p className="text-gray-600 text-base text-center p-10">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="relative group">
      {/* Przycisk w lewo */}
      <button
        onClick={() => scrollTo('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white border border-gray-200 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 -ml-4"
        aria-label="Przewiń w lewo"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Przycisk w prawo */}
      <button
        onClick={() => scrollTo('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white border border-gray-200 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 -mr-4"
        aria-label="Przewiń w prawo"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Kontener z ofertami */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
        style={{
          padding: '10px 0'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {offers.map((offer) => (
          <div key={offer.id} className="flex-shrink-0">
            <OfferTile
              {...offer}
              width={tileWidth}
              height={tileHeight}
              imageWidth={imageWidth}
              imageHeight={imageHeight}
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