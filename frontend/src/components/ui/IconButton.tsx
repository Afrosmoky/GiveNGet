import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Wymagany — przycisk bez tekstu musi mieć nazwę dla czytników ekranu. */
  label: string;
  icon: ReactNode;
  /** Licznik w rogu (np. nieprzeczytane). 0 / undefined = ukryty. */
  badge?: number;
  active?: boolean;
}

export function IconButton({ label, icon, badge, active, className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-flex h-10 w-10 items-center justify-center rounded-ui-sm text-ink-muted transition-colors',
        'hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        active && 'bg-surface-sunken text-ink',
        className
      )}
      {...rest}
    >
      {icon}
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold leading-none text-white ring-2 ring-surface">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </button>
  );
}
