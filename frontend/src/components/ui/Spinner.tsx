import { cn } from './cn';

export function Spinner({ className, label = 'Ładowanie' }: { className?: string; label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn('inline-block animate-spin rounded-full border-2 border-current border-t-transparent', className ?? 'h-5 w-5')}
    />
  );
}
