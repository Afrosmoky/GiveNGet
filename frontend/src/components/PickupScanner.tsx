"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

interface PickupScannerProps {
  /** Wywoływane z surową treścią QR — wyciągnięcie kodu robi strona. */
  onScan: (rawValue: string) => void;
  /** Blokuje skaner, gdy trwa potwierdzanie poprzedniego kodu. */
  paused?: boolean;
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
export default function PickupScanner({ onScan, paused = false }: PickupScannerProps) {
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
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-gray-900 sm:text-lg">Skan kodu QR</h2>
        {active ? (
          <button
            type="button"
            onClick={handleStop}
            className="rounded-lg border-2 border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Zatrzymaj
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            disabled={starting}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
          >
            {starting ? 'Uruchamiam…' : 'Włącz kamerę'}
          </button>
        )}
      </div>

      {/* Kontener biblioteki. Musi istnieć zawsze, gdy skaner jest aktywny. */}
      <div
        id={READER_ELEMENT_ID}
        className={`overflow-hidden rounded-lg ${active ? 'block bg-black' : 'hidden'}`}
      />

      {!active && !error && (
        <p className="text-sm text-gray-600">
          Włącz kamerę i skieruj ją na kod QR z telefonu klienta. Możesz też wpisać kod ręcznie poniżej.
        </p>
      )}

      {active && !paused && (
        <p className="mt-3 text-sm text-gray-600">Skieruj kamerę na kod QR klienta.</p>
      )}
      {active && paused && (
        <p className="mt-3 text-sm text-gray-600">Potwierdzam odbiór…</p>
      )}

      {error && (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {error}
        </div>
      )}
    </div>
  );
}
