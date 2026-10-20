"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LuDownload, LuShare, LuSquarePlus } from 'react-icons/lu';
import { Button, Dialog, IconButton, cn } from './ui';
import { useInstallPrompt } from '../utils/installPrompt';

const STANDALONE_QUERY = '(display-mode: standalone)';

/**
 * Sposób instalacji w tej przeglądarce:
 * - prompt — Chrome/Edge/Android: systemowe okno z `beforeinstallprompt`,
 * - ios — iPhone/iPad (każda przeglądarka to WebKit): instrukcja „Dodaj do ekranu początkowego”,
 * - macos-safari — Safari na Macu: instrukcja „Dodaj do Docka”,
 * - null — już zainstalowane albo brak wsparcia: nic nie pokazujemy.
 */
type InstallMode = 'prompt' | 'ios' | 'macos-safari' | null;

function isStandalone(): boolean {
  return (
    window.matchMedia(STANDALONE_QUERY).matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectPlatform(): 'ios' | 'macos-safari' | null {
  const ua = navigator.userAgent;
  // iPadOS 13+ przedstawia się jako Mac — odróżnia go ekran dotykowy
  const isIPadAsMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || isIPadAsMac) return 'ios';
  // Chrome/Edge/Firefox/Opera na Macu też mają „Safari/” w UA — wykluczamy je po własnych znacznikach
  const isSafari = /Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/.test(ua);
  if (/Macintosh/.test(ua) && isSafari) return 'macos-safari';
  return null;
}

function useInstallMode(available: boolean): InstallMode {
  const [mode, setMode] = useState<InstallMode>(null);

  useEffect(() => {
    const media = window.matchMedia(STANDALONE_QUERY);
    const update = () => setMode(isStandalone() ? null : available ? 'prompt' : detectPlatform());
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [available]);

  return mode;
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-strong">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

const Kbd = ({ children }: { children: ReactNode }) => <span className="font-semibold text-ink">{children}</span>;

function IosInstructions() {
  return (
    <div className="flex flex-col gap-4 text-sm text-ink-muted">
      <ol className="flex flex-col gap-3">
        <Step n={1}>
          Dotknij ikony <Kbd>Udostępnij</Kbd>{' '}
          <LuShare size={16} aria-label="(kwadrat ze strzałką)" className="inline -translate-y-0.5 text-brand" /> na dole ekranu.
        </Step>
        <Step n={2}>
          Wybierz <Kbd>„Dodaj do ekranu początkowego”</Kbd>{' '}
          <LuSquarePlus size={16} aria-hidden className="inline -translate-y-0.5 text-brand" />.
        </Step>
        <Step n={3}>
          Potwierdź <Kbd>„Dodaj”</Kbd>.
        </Step>
      </ol>
      <p>Aplikacja pojawi się jak zwykła ikona, a powiadomienia push zaczną działać.</p>
    </div>
  );
}

function MacInstructions() {
  return (
    <div className="flex flex-col gap-3 text-sm text-ink-muted">
      <p>
        W menu <Kbd>Plik → „Dodaj do Docka…”</Kbd> (lub ikona <Kbd>Udostępnij</Kbd>{' '}
        <LuShare size={16} aria-hidden className="inline -translate-y-0.5 text-brand" /> → <Kbd>„Dodaj do Docka”</Kbd>).
      </p>
      <p>Aplikacja pojawi się w Docku.</p>
      <p className="text-xs text-ink-subtle">Wymaga Safari 17+ (macOS Sonoma).</p>
    </div>
  );
}

/**
 * Stały przycisk „Pobierz aplikację” w pasku — główne wejście do instalacji PWA.
 * Chrome/Edge: systemowe okno instalacji (tylko desktop). Safari nie ma `beforeinstallprompt`,
 * więc tam przycisk otwiera instrukcję: na iOS widoczny także na mobile, na Macu na desktopie.
 * W zainstalowanej aplikacji i w nieobsługiwanych przeglądarkach nie renderuje nic.
 */
export function InstallAppButton({ className }: { className?: string }) {
  const { available, install } = useInstallPrompt();
  const mode = useInstallMode(available);
  const [helpOpen, setHelpOpen] = useState(false);

  if (!mode) return null;

  const onClick = () => (mode === 'prompt' ? void install() : setHelpOpen(true));

  return (
    <>
      {/* iOS na wąskim ekranie: sama ikona — pełny napis nie mieści się obok logo, dzwonka i awatara */}
      {mode === 'ios' && (
        <IconButton label="Pobierz aplikację" icon={<LuDownload size={20} />} onClick={onClick} className={cn('sm:hidden', className)} />
      )}
      <Button
        variant="secondary"
        size="sm"
        leftIcon={<LuDownload size={16} aria-hidden />}
        onClick={onClick}
        className={cn(mode === 'ios' ? '!hidden sm:!inline-flex' : '!hidden md:!inline-flex', className)}
      >
        Pobierz aplikację
      </Button>

      {/* Portal: pasek ma backdrop-blur, który zamyka position: fixed w obrębie nagłówka */}
      {mode !== 'prompt' &&
        helpOpen &&
        createPortal(
          <Dialog
            open
            onClose={() => setHelpOpen(false)}
            title={mode === 'ios' ? 'Zainstaluj Biovlo na iPhone/iPad' : 'Zainstaluj Biovlo na Macu'}
            footer={<Button onClick={() => setHelpOpen(false)}>Rozumiem</Button>}
          >
            {mode === 'ios' ? <IosInstructions /> : <MacInstructions />}
          </Dialog>,
          document.body
        )}
    </>
  );
}
