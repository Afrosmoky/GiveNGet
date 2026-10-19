"use client";

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { LuX } from 'react-icons/lu';
import { IconButton } from './IconButton';
import { cn } from './cn';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** Przyciski akcji — wyrównane do prawej, na mobile pełna szerokość. */
  footer?: ReactNode;
  size?: 'md' | 'lg';
  children?: ReactNode;
}

/**
 * Okno modalne konsoli. Na mobile wyjeżdża od dołu (arkusz), od sm — wyśrodkowane.
 * Escape i kliknięcie w tło zamykają; treść przewija się, a nagłówek i stopka zostają na miejscu.
 */
export function Dialog({ open, onClose, title, description, footer, size = 'md', children }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // onClose przez ref: rodzic zwykle podaje nową funkcję w każdym renderze, a efekt
  // (fokus, blokada przewijania) ma się wykonać tylko przy otwarciu
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    // Strona pod spodem nie przewija się razem z oknem
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div aria-hidden className="absolute inset-0 bg-neutral-900/50" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-ui-xl bg-surface shadow-pop focus:outline-none sm:rounded-ui-xl',
          size === 'md' ? 'sm:max-w-md' : 'sm:max-w-2xl'
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-ink">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
          </div>
          <IconButton label="Zamknij" icon={<LuX size={18} />} onClick={onClose} className="-mr-2 -mt-1 h-9 w-9 shrink-0" />
        </div>
        {children && <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>}
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface-muted px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
