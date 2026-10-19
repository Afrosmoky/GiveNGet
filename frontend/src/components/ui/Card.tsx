import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

type Padding = 'none' | 'sm' | 'md' | 'lg';

const paddings: Record<Padding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Padding;
  /** Podświetlenie po najechaniu — dla kart klikalnych (np. oferta). */
  interactive?: boolean;
}

export function Card({ padding = 'md', interactive, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-ui-xl border border-line bg-surface shadow-card',
        interactive && 'cursor-pointer transition-shadow hover:border-line-strong hover:shadow-pop',
        paddings[padding],
        className
      )}
      {...rest}
    />
  );
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, actions, className }: CardHeaderProps) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
