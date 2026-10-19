"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { LuCamera, LuCameraOff } from 'react-icons/lu';
import { Button, Card, CardHeader, cn } from './ui';

interface PickupScannerProps {
  /** Wywoływane z surową treścią QR — wyciągnięcie kodu robi strona. */
  onScan: (rawValue: string) => void;
  /** Blokuje skaner, gdy trwa potwierdzanie poprzedniego kodu albo na ekranie jest wynik. */
  paused?: boolean;
  /** Podpis pod podglądem kamery w czasie pauzy. */
  pausedLabel?: string;
}

const READER_ELEMENT_ID = 'pickup-qr-reader';

/**
 * Skaner QR kodów odbioru dla panelu pracownika sklepu.
 *
 * Biblioteka jest ładowana dynamicznie w efekcie, nie statycznym importem: dotyka
 * `navigator.mediaDevices` i `document`, więc przy prerenderze strony w `next build`
 * wysadziłaby budowanie.
 *
 * Kamera wymaga bezpiecznego kontekstu — HTTPS albo localhost. Pod samym IP bez
 * certyfikatu `getUserMedia` nie istnieje, dlatego sprawdzamy to zawczasu i mówimy
 * wprost, że trzeba użyć wpisywania ręcznego, zamiast pokazywać nieokreślony błąd.
 */
export default function PickupScanner({ onScan, paused = false, pausedLabel = 'Potwierdzam odbiór…' }: PickupScannerProps) {
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Instancja biblioteki trzymana w ref — nie jest częścią stanu renderowania
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const onScanRef = useRef(onScan);
  const pausedRef = useRef(paused);

  // Callback i pauza przez ref: biblioteka dostaje handler raz przy starcie, a nie
  // przy każdym renderze — inaczej skaner restartowałby się na każdą zmianę stanu strony
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      await scanner.stop();
      scanner.clear();
    } catch {
      // Skaner mógł się już zatrzymać sam — nie ma czego raportować
    }
  }, []);

  // Sprzątanie przy odmontowaniu: bez tego kamera zostaje włączona
  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  const handleStart = async () => {
    setError(null);

    if (typeof window === 'undefined' || !window.isSecureContext) {
      setError(
        'Skanowanie wymaga połączenia HTTPS. Na tym adresie przeglądarka nie udostępni kamery — wpisz kod ręcznie.'
      );
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Ta przeglądarka nie udostępnia kamery. Wpisz kod ręcznie.');
      return;
    }

    setStarting(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      setActive(true);

      // Element podglądu musi istnieć w DOM przed startem biblioteki
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const scanner = new Html5Qrcode(READER_ELEMENT_ID, { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText: string) => {
          // Skaner strzela wielokrotnie w ten sam kod; gdy trwa potwierdzanie, ignorujemy
          if (pausedRef.current) return;
          onScanRef.current(decodedText);
        },
        () => {
          // Brak odczytu w klatce to normalny stan pracy skanera, nie błąd
        }
      );
    } catch (e) {
      await stopScanner();
      setActive(false);
      const name = e instanceof Error ? e.name : '';
      if (name === 'NotAllowedError' || String(e).includes('Permission')) {
        setError('Brak zgody na dostęp do kamery. Zezwól w ustawieniach przeglądarki albo wpisz kod ręcznie.');
      } else if (name === 'NotFoundError') {
        setError('Nie znaleziono kamery w tym urządzeniu. Wpisz kod ręcznie.');
      } else {
        setError('Nie udało się uruchomić kamery. Wpisz kod ręcznie.');
      }
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    await stopScanner();
    setActive(false);
  };

  return (
    <Card padding="md">
      <CardHeader
        title="Skan kodu QR"
        description={!active && !error ? 'Skieruj kamerę na kod QR z telefonu klienta.' : undefined}
        actions={
          active ? (
            <Button variant="secondary" leftIcon={<LuCameraOff size={16} />} onClick={handleStop}>
              Zatrzymaj
            </Button>
          ) : (
            <Button variant="secondary" leftIcon={<LuCamera size={16} />} loading={starting} onClick={handleStart}>
              {starting ? 'Uruchamiam…' : 'Włącz kamerę'}
            </Button>
          )
        }
      />

      {/* Kontener biblioteki. Musi istnieć zawsze, gdy skaner jest aktywny. */}
      <div id={READER_ELEMENT_ID} className={cn('overflow-hidden rounded-ui-lg', active ? 'block bg-black' : 'hidden')} />

      {active && <p className="mt-3 text-sm text-ink-muted">{paused ? pausedLabel : 'Skieruj kamerę na kod QR klienta.'}</p>}

      {error && (
        <div role="alert" className="rounded-ui-md border border-warning/30 bg-warning-soft px-3.5 py-3 text-sm text-warning">
          {error}
        </div>
      )}
    </Card>
  );
}
