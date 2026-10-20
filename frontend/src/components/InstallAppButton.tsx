"use client";

import { useEffect, useState } from 'react';
import { LuDownload } from 'react-icons/lu';
import { Button, cn } from './ui';
import { useInstallPrompt } from '../utils/installPrompt';

const STANDALONE_QUERY = '(display-mode: standalone)';

/** Czy działamy jako zainstalowana aplikacja (Chrome/Edge: display-mode, Safari: navigator.standalone). */
function useIsStandalone() {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(STANDALONE_QUERY);
    const update = () =>
      setStandalone(media.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return standalone;
}

/**
 * Stały przycisk „Pobierz aplikację” w pasku — główne wejście do instalacji PWA na desktopie.
 * Pokazuje się tylko, gdy przeglądarka zgłosiła instalowalność i nie jesteśmy już w zainstalowanej
 * aplikacji. Na mobile ukryty (tam jest karta InstallAppPrompt i systemowe „Dodaj do ekranu”).
 */
export function InstallAppButton({ className }: { className?: string }) {
  const { available, install } = useInstallPrompt();
  const standalone = useIsStandalone();

  if (!available || standalone) return null;

  return (
    <Button
      variant="secondary"
      size="sm"
      leftIcon={<LuDownload size={16} aria-hidden />}
      onClick={() => void install()}
      className={cn('!hidden md:!inline-flex', className)}
    >
      Pobierz aplikację
    </Button>
  );
}
