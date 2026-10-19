"use client";

import { useState } from 'react';
import { cn } from './cn';

interface AvatarProps {
  name?: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function initials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

const dims = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-sm',
};

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  // Zdjęcie, które się nie wczytało (usunięty plik, zły URL), zastępujemy inicjałami
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const dim = dims[size];
  if (src && failedSrc !== src) {
    return (
      // Zwykły <img>: URL-e zdjęć pochodzą z backendu (dowolny host), next/image wymagałby whitelisty
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? ''}
        onError={() => setFailedSrc(src)}
        className={cn('shrink-0 rounded-full object-cover', dim, className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn('flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-strong', dim, className)}
    >
      {initials(name)}
    </span>
  );
}
