import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandLogo, Card, cn } from '../ui';

export type AuthTone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE_CLASSES: Record<AuthTone, string> = {
  brand: 'bg-brand-soft text-brand',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-surface-sunken text-ink-muted',
};

const WIDTHS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const;

interface AuthCardProps {
  title: ReactNode;
  description?: ReactNode;
  /** Ikona w kółku nad tytułem (ekrany statusowe). Bez ikony — samo logo. */
  icon?: ReactNode;
  tone?: AuthTone;
  /** Logo Biovlo nad kartą — na formularzach tak, na ekranach statusowych zwykle wystarcza ikona. */
  showLogo?: boolean;
  width?: keyof typeof WIDTHS;
  children?: ReactNode;
  /** Linki pod treścią karty (np. „Masz już konto? Zaloguj się”). */
  footer?: ReactNode;
  className?: string;
}

/**
 * Wyśrodkowana karta dla ekranów gościa: logowanie, rejestracja, reset hasła i ekrany statusowe
 * (aktywacja, potwierdzenie rejestracji, brak uprawnień). Leży w <main> powłoki konsumenta.
 */
export function AuthCard({
  title,
  description,
  icon,
  tone = 'brand',
  showLogo = true,
  width = 'sm',
  children,
  footer,
  className,
}: AuthCardProps) {
  return (
    // Wypełnia <main> (flex-1): logo + karta wyśrodkowane w pionie, stopka powłoki zostaje przy dolnej krawędzi ekranu.
    // Mobile: od góry — przy otwartej klawiaturze wyśrodkowany formularz uciekałby pod nią.
    <div data-auth-page className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
      <div className={cn('w-full', WIDTHS[width])}>
        {showLogo && (
          <div className="mb-6 flex justify-center">
            {/* Pełne logo z napisem — na ekranach auth jest na nie miejsce */}
            <Link href="/" aria-label="Biovlo — strona główna" className="rounded-ui-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
              <BrandLogo width={76} />
            </Link>
          </div>
        )}
        <Card padding="none" className={cn('p-5 sm:p-8', className)}>
          <div className="text-center">
            {icon && (
              <div
                className={cn('mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full', TONE_CLASSES[tone])}
                aria-hidden
              >
                {icon}
              </div>
            )}
            <h1 className="text-xl font-semibold tracking-tight text-brand-ink sm:text-2xl">{title}</h1>
            {description && <div className="mt-2 text-sm leading-6 text-ink-muted">{description}</div>}
          </div>
          {children && <div className="mt-6">{children}</div>}
        </Card>
        {footer && <div className="mt-5 text-center text-sm text-ink-muted">{footer}</div>}
      </div>
    </div>
  );
}

/** Komunikat w karcie (sukces / błąd / info). role=alert dla błędów, status dla reszty. */
export function AuthNotice({ tone, children, className }: { tone: 'success' | 'danger' | 'warning' | 'info'; children: ReactNode; className?: string }) {
  const classes = {
    success: 'border-success/30 bg-success-soft text-brand-strong',
    danger: 'border-danger/30 bg-danger-soft text-danger',
    warning: 'border-warning/30 bg-warning-soft text-warning',
    info: 'border-line bg-surface-muted text-ink-muted',
  }[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('rounded-ui-md border px-3.5 py-3 text-sm leading-5', classes, className)}>
      {children}
    </div>
  );
}

/** Link tekstowy w kolorze marki — w stopkach kart i treści komunikatów. */
export const authLinkClass = 'font-semibold text-brand hover:text-brand-hover hover:underline';
