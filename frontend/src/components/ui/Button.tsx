import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-ui-sm font-semibold transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-brand-contrast hover:bg-brand-hover',
  secondary: 'border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-muted',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-sunken hover:text-ink',
  danger: 'bg-danger text-white hover:bg-danger/90',
  // Akcja na zielonym panelu potwierdzenia (np. „Następny” po odbiorze)
  success: 'bg-success text-white hover:bg-success/90',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', fullWidth = false) {
  return cn(base, variants[variant], sizes[size], fullWidth && 'w-full');
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Gdy podany — renderuje next/link wyglądający jak przycisk. */
  href?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  href,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = cn(buttonClasses(variant, size, fullWidth), className);
  const content = (
    <>
      {loading ? <Spinner className="h-4 w-4" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
}
