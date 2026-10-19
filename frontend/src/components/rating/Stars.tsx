"use client";

import { useState } from 'react';
import { cn } from '../ui';

const STAR_PATH = 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';

function Star({ fill, size }: { fill: number; size: number }) {
  // fill 0–1: część gwiazdki wypełniona kolorem (oceny średnie, np. 4,3)
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 24 24" className="absolute inset-0 fill-current text-line-strong" aria-hidden>
        <path d={STAR_PATH} />
      </svg>
      {fill > 0 && (
        <span className="absolute inset-0 overflow-hidden" style={{ width: `${Math.min(1, fill) * 100}%` }}>
          <svg width={size} height={size} viewBox="0 0 24 24" className="fill-current text-brand-accent" aria-hidden>
            <path d={STAR_PATH} />
          </svg>
        </span>
      )}
    </span>
  );
}

/** Ocena tylko do odczytu (0–5, także ułamkowa). */
export function StarRating({ value, size = 18, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`Ocena ${value.toFixed(1)} na 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} fill={Math.max(0, Math.min(1, value - (i - 1)))} />
      ))}
    </span>
  );
}

interface StarInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  size?: number;
  className?: string;
}

/** Wybór oceny 1–5 z podglądem po najechaniu. Każda gwiazdka to osobny przycisk (klawiatura, czytniki). */
export function StarInput({ value, onChange, label, size = 26, className }: StarInputProps) {
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value;
  return (
    <div role="group" aria-label={label} className={cn('inline-flex items-center gap-0.5', className)} onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i} na 5`}
          aria-pressed={value === i}
          onClick={() => onChange(i)}
          onMouseEnter={() => setHovered(i)}
          onFocus={() => setHovered(i)}
          onBlur={() => setHovered(0)}
          className="rounded-ui-sm p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <Star size={size} fill={i <= shown ? 1 : 0} />
        </button>
      ))}
    </div>
  );
}
