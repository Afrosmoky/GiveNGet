import Image from 'next/image';
import Link from 'next/link';
import { cn } from './cn';

/**
 * Znak marki — jedyne miejsce z logo w nagłówkach, konsoli i stopce.
 * Ikona: public/brand/biovlo-mark-96.png (czysty okrąg wycięty z biovlo-logo.png, 96 px — ostry do 48 px),
 * wordmark tekstem w kolorze --brand-ink. Duże logo z napisem: BrandLogo.
 */
export function Logo({ href = '/', className, compact = false }: { href?: string; className?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2 text-brand-ink', className)} aria-label="Biovlo — strona główna">
      <Image src="/brand/biovlo-mark-96.png" alt="" width={32} height={32} priority className="h-8 w-8 shrink-0" />
      {!compact && <span className="text-lg font-extrabold tracking-tight">Biovlo</span>}
    </Link>
  );
}

/** Pełne logo (znak + napis, plik przycięty) — do dużych miejsc: ekran logowania, stany puste. */
export function BrandLogo({ className, width = 96 }: { className?: string; width?: number }) {
  // biovlo-logo-trim.png ma 670×766 — wysokość z proporcji, żeby nie rozciągać
  const height = Math.round((width * 766) / 670);
  return <Image src="/brand/biovlo-logo-trim.png" alt="Biovlo" width={width} height={height} className={cn('shrink-0', className)} />;
}
