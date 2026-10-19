"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import { cn } from './cn';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  leftIcon?: ReactNode;
  /** Element po prawej wewnątrz pola (np. przycisk GPS). */
  rightSlot?: ReactNode;
  size?: 'md' | 'lg';
  containerClassName?: string;
  /** React 19: ref jako zwykły prop — np. do ustawienia fokusu po akcji. */
  ref?: Ref<HTMLInputElement>;
}

export function Input({
  label,
  hint,
  error,
  leftIcon,
  rightSlot,
  size = 'md',
  id,
  className,
  containerClassName,
  ref,
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle">{leftIcon}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full rounded-ui-md border bg-surface text-ink transition-colors placeholder:text-ink-subtle',
            'focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-sunken',
            size === 'md' ? 'h-10 px-3 text-sm' : 'h-12 px-4 text-base',
            error ? 'border-danger focus:ring-danger/20' : 'border-line focus:border-brand focus:ring-brand/20',
            leftIcon ? 'pl-9' : undefined,
            rightSlot ? 'pr-11' : undefined,
            className
          )}
          {...rest}
        />
        {rightSlot && <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{rightSlot}</span>}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
