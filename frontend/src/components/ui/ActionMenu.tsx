"use client";

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { LuEllipsisVertical } from 'react-icons/lu';
import { useDismiss } from '../shell/useDismiss';
import { IconButton } from './IconButton';
import { cn } from './cn';

export interface ActionMenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  /** Ukrywa pozycję bez zmiany indeksów w miejscu wywołania. */
  hidden?: boolean;
}

interface ActionMenuProps {
  /** Nazwa przycisku dla czytników ekranu, np. „Akcje dla Jana Kowalskiego”. */
  label: string;
  items: ActionMenuItem[];
  disabled?: boolean;
}

/** Menu „⋮” dla wiersza tabeli. Zamyka się po wyborze, kliknięciu obok i Escape. */
export function ActionMenu({ label, items, disabled }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, ref, close);

  const visible = items.filter((item) => !item.hidden);

  return (
    <div ref={ref} className="relative inline-block text-left">
      <IconButton
        label={label}
        icon={<LuEllipsisVertical size={18} />}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        active={open}
        aria-haspopup="menu"
        aria-expanded={open}
        className="h-9 w-9 disabled:opacity-50"
      />
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-ui-md border border-line bg-surface py-1 shadow-pop"
        >
          {visible.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                item.tone === 'danger' ? 'text-danger hover:bg-danger-soft' : 'text-ink hover:bg-surface-muted'
              )}
            >
              {item.icon && <span className="shrink-0 text-current opacity-80">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
