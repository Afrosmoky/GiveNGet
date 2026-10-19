"use client";

import { useEffect, useState } from 'react';
import { LuBell, LuBellOff, LuCheck } from 'react-icons/lu';
import { Button, cn } from './ui';
import { enablePush, getPushPermission, type PushPermission } from '../utils/push';

const DISMISS_KEY = 'pushOptInDismissed';

type Status = 'idle' | 'working' | 'enabled' | 'error';

interface PushOptInProps {
  /** „card” — po rezerwacji; „inline” — pasek na liście rezerwacji. */
  variant?: 'card' | 'inline';
  className?: string;
}

/**
 * Zaproszenie do powiadomień o rezerwacjach. Prośba o zgodę idzie dopiero po kliknięciu
 * (przeglądarki ignorują albo wyciszają prośby bez gestu). Gdy zgoda już jest albo przeglądarka
 * nie obsługuje pushy — nic nie renderujemy. „Nie teraz” chowa zaproszenie w tej przeglądarce.
 */
export function PushOptIn({ variant = 'card', className }: PushOptInProps) {
  const [permission, setPermission] = useState<PushPermission>('unsupported');
  const [dismissed, setDismissed] = useState(true);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setPermission(getPushPermission());
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (status === 'enabled') {
    return (
      <p role="status" className={cn('flex items-center gap-2 rounded-ui-md bg-success-soft px-3 py-2.5 text-sm text-brand-strong', className)}>
        <LuCheck size={16} aria-hidden /> {message ?? 'Powiadomienia włączone — damy znać przed końcem rezerwacji.'}
      </p>
    );
  }

  if (permission === 'unsupported' || permission === 'granted' || dismissed) return null;

  if (permission === 'denied') {
    // Tylko na liście rezerwacji — po rezerwacji nie ma sensu przypominać o blokadzie
    if (variant !== 'inline') return null;
    return (
      <p className={cn('flex items-start gap-2 rounded-ui-md border border-line bg-surface-muted px-3 py-2.5 text-xs leading-5 text-ink-muted', className)}>
        <LuBellOff size={14} className="mt-0.5 shrink-0" aria-hidden />
        Powiadomienia o rezerwacjach są zablokowane w tej przeglądarce. Możesz je włączyć w ustawieniach strony (ikona obok adresu).
      </p>
    );
  }

  const enable = async () => {
    setStatus('working');
    setMessage(null);
    const result = await enablePush();
    setPermission(getPushPermission());
    if (result.ok) {
      setStatus('enabled');
      if (!result.deliveryEnabled) {
        setMessage('Zgoda zapisana. Serwer powiadomień jest chwilowo wyłączony — zaczną przychodzić po jego włączeniu.');
      }
    } else {
      setStatus('error');
      setMessage(result.message);
    }
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Prywatny tryb — schowamy tylko do odświeżenia strony
    }
  };

  return (
    <div
      className={cn(
        'rounded-ui-md border border-brand/20 bg-brand-soft p-3.5',
        variant === 'inline' && 'sm:flex sm:items-center sm:gap-4',
        className
      )}
    >
      <div className="flex items-start gap-3 sm:flex-1">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-brand">
          <LuBell size={18} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-ink">Powiadomienia o rezerwacjach</p>
          <p className="mt-0.5 text-xs leading-5 text-ink-muted">
            Przypomnimy, gdy możesz odebrać, i ostrzeżemy przed końcem rezerwacji.
          </p>
          {status === 'error' && message && (
            <p role="alert" className="mt-1 text-xs text-danger">
              {message}
            </p>
          )}
        </div>
      </div>
      <div className={cn('mt-3 flex gap-2', variant === 'inline' && 'sm:mt-0 sm:shrink-0')}>
        <Button size="sm" loading={status === 'working'} onClick={enable} leftIcon={<LuBell size={14} />}>
          Włącz
        </Button>
        <Button size="sm" variant="ghost" onClick={dismiss}>
          Nie teraz
        </Button>
      </div>
    </div>
  );
}
