"use client";

import { useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import { LuChevronDown } from 'react-icons/lu';
import { cn } from './cn';

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  size?: 'md' | 'lg';
  containerClassName?: string;
}

/** Natywny <select> w stylu Input — natywny, bo na mobile daje systemowy picker. */
export function Select({ label, hint, error, size = 'md', id, className, containerClassName, children, ...rest }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined;

  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full appearance-none rounded-ui-md border bg-surface pr-9 text-ink transition-colors',
            'focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-sunken',
            size === 'md' ? 'h-10 pl-3 text-sm' : 'h-12 pl-4 text-base',
            error ? 'border-danger focus:ring-danger/20' : 'border-line focus:border-brand focus:ring-brand/20',
            className
          )}
          {...rest}
        >
          {children}
        </select>
        <LuChevronDown
          aria-hidden
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle"
        />
      </div>
      {error ? (
        <p id={`${selectId}-error`} className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${selectId}-hint`} className="mt-1 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
