"use client";

import { useEffect, useState } from 'react';
import { LuDownload } from 'react-icons/lu';
import { BrandLogo, Button, cn } from './ui';
import { useInstallPrompt } from '../utils/installPrompt';

const DISMISS_KEY = 'installPromptDismissed';

/**
 * „Zainstaluj Biovlo” — widoczne tylko, gdy przeglądarka zgłosi, że aplikację da się
 * zainstalować (i nie jest już zainstalowana). „Nie teraz” chowa w tej przeglądarce.
 */
export function InstallAppPrompt({ className }: { className?: string }) {
  const { available, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!available || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Prywatny tryb — schowamy do odświeżenia strony
    }
  };

  return (
    <div className={cn('flex items-center gap-3 rounded-ui-md border border-line bg-surface p-3.5 shadow-card', className)}>
      <BrandLogo width={34} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-brand-ink">Zainstaluj aplikację Biovlo</p>
        <p className="mt-0.5 text-xs leading-5 text-ink-muted">Kod odbioru zawsze pod ręką — bez szukania karty w przeglądarce.</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
        <Button size="sm" leftIcon={<LuDownload size={14} />} onClick={() => void install()}>
          Zainstaluj
        </Button>
        <Button size="sm" variant="ghost" onClick={dismiss}>
          Nie teraz
        </Button>
      </div>
    </div>
  );
}
