import { Badge } from './Badge';
import { cn } from './cn';

export function formatPrice(price: number, currency?: string | null): string {
  try {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: currency || 'PLN' }).format(price);
  } catch {
    // Nieznany kod waluty z API — pokaż liczbę i kod zamiast wywracać widok
    return `${price.toFixed(2)} ${currency ?? ''}`.trim();
  }
}

interface PriceProps {
  transactionType: string;
  price?: number | null;
  currency?: string | null;
  /** Cena przed obniżką — pokazywana przekreślona, gdy wyższa od ceny. */
  originalPrice?: number | null;
  /** Rabat w % wyliczony w backendzie; null = bez badge'a. */
  discountPercent?: number | null;
  size?: 'sm' | 'lg';
  className?: string;
}

/**
 * Cena oferty — jeden komponent dla kafelka i szczegółów, żeby przecena wyglądała wszędzie tak samo.
 * Procent rabatu przychodzi z API (discountPercent) — klient go nie przelicza.
 */
export function Price({ transactionType, price, currency, originalPrice, discountPercent, size = 'sm', className }: PriceProps) {
  const big = size === 'lg';

  if (transactionType === 'sale' && price != null) {
    const showOriginal = originalPrice != null && originalPrice > price;
    return (
      <div className={cn('flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1', className)}>
        <span className={cn('font-bold text-brand', big ? 'text-3xl tracking-tight' : 'text-base')}>
          {formatPrice(price, currency)}
        </span>
        {showOriginal && (
          <span className={cn('text-ink-subtle line-through', big ? 'text-lg' : 'text-xs')}>
            <span className="sr-only">Cena przed obniżką: </span>
            {formatPrice(originalPrice, currency)}
          </span>
        )}
        {showOriginal && discountPercent != null && (
          <Badge tone="danger" size={big ? 'md' : 'sm'} className="self-center font-semibold">
            −{discountPercent}%
          </Badge>
        )}
      </div>
    );
  }

  if (transactionType === 'free') {
    return <span className={cn('font-bold text-brand', big ? 'text-3xl tracking-tight' : 'text-base', className)}>Za darmo</span>;
  }

  if (transactionType === 'exchange') {
    return <span className={cn('font-medium text-ink-muted', big ? 'text-xl' : 'text-sm', className)}>Wymiana</span>;
  }

  return null;
}
