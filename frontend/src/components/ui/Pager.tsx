import type { ReactNode } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { Button } from './Button';

interface PagerProps {
  /** Numer strony od 0 — jak w API. */
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  /** Podsumowanie po lewej, np. „120 użytkowników”. */
  summary?: ReactNode;
  disabled?: boolean;
}

/** Paginacja list konsoli: „Strona X z Y” + Poprzednia/Następna. Przy jednej stronie nic nie renderuje. */
export function Pager({ page, totalPages, onChange, summary, disabled }: PagerProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-muted">
      <span>
        Strona {page + 1} z {totalPages}
        {summary && <> · {summary}</>}
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || page === 0}
          onClick={() => onChange(page - 1)}
          leftIcon={<LuChevronLeft size={16} />}
        >
          Poprzednia
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || page >= totalPages - 1}
          onClick={() => onChange(page + 1)}
          rightIcon={<LuChevronRight size={16} />}
        >
          Następna
        </Button>
      </div>
    </div>
  );
}
