"use client";

import { useId, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  containerClassName?: string;
}

export function Textarea({ label, hint, error, id, className, containerClassName, rows = 4, ...rest }: TextareaProps) {
  const autoId = useId();
  const textareaId = id ?? autoId;
  const describedBy = error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined;

  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label htmlFor={textareaId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'w-full resize-y rounded-ui-md border bg-surface px-3 py-2.5 text-sm text-ink transition-colors placeholder:text-ink-subtle',
          'focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-sunken',
          error ? 'border-danger focus:ring-danger/20' : 'border-line focus:border-brand focus:ring-brand/20',
          className
        )}
        {...rest}
      />
      {error ? (
        <p id={`${textareaId}-error`} className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${textareaId}-hint`} className="mt-1 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
