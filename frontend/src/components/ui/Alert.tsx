import type { ReactNode } from 'react';
import { LuCircleAlert, LuCircleCheck, LuInfo, LuTriangleAlert } from 'react-icons/lu';
import { cn } from './cn';

export type AlertTone = 'success' | 'danger' | 'warning' | 'info';

const tones: Record<AlertTone, { box: string; icon: ReactNode }> = {
  success: { box: 'border-success/30 bg-success-soft text-success', icon: <LuCircleCheck size={16} aria-hidden /> },
  danger: { box: 'border-danger/30 bg-danger-soft text-danger', icon: <LuCircleAlert size={16} aria-hidden /> },
  warning: { box: 'border-warning/30 bg-warning-soft text-warning', icon: <LuTriangleAlert size={16} aria-hidden /> },
  info: { box: 'border-line bg-surface-muted text-ink-muted', icon: <LuInfo size={16} aria-hidden /> },
};

/** Komunikat w treści (wynik zapisu formularza, ostrzeżenie). Błędy ogłaszane jako alert. */
export function Alert({ tone = 'info', className, children }: { tone?: AlertTone; className?: string; children: ReactNode }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2.5 rounded-ui-md border px-3.5 py-2.5 text-sm', tones[tone].box, className)}
    >
      <span className="mt-0.5 shrink-0">{tones[tone].icon}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
