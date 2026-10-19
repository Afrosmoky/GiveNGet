"use client";

import { QRCodeSVG } from 'qrcode.react';

interface PickupCodeCardProps {
  /** Kod do przepisania przy kasie. */
  pickupCode: string;
  /** Treść QR z backendu ("id:pickupCode"); gdy brak, kodujemy sam kod. */
  qrPayload?: string | null;
  /** Mniejszy wariant do listy rezerwacji. */
  compact?: boolean;
}

/**
 * Kod odbioru wraz z kodem QR.
 *
 * Wspólny dla szczegółów oferty (po rezerwacji) i listy „Moje rezerwacje" — pracownik
 * sklepu wpisuje kod ręcznie albo skanuje QR, więc oba muszą być czytelne w obu miejscach.
 *
 * QR koduje `qrPayload` z backendu, nie sam kod: zawiera też identyfikator rezerwacji,
 * co pozwala pracownikowi na szybki lookup (docs/04_REZERWACJE_DESIGN.md, sekcja 8).
 */
export default function PickupCodeCard({ pickupCode, qrPayload, compact = false }: PickupCodeCardProps) {
  const payload = qrPayload || pickupCode;
  const qrSize = compact ? 96 : 148;

  return (
    <div
      // flex-wrap: w wąskim panelu (szczegóły oferty) tekst schodzi pod QR zamiast się ucinać
      className={`flex flex-wrap items-center gap-4 rounded-ui-lg border-2 border-dashed border-brand/30 bg-brand-soft ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="shrink-0 rounded-ui-sm bg-white p-2 shadow-card">
        <QRCodeSVG value={payload} size={qrSize} level="M" marginSize={0} />
      </div>
      <div className="min-w-[10rem] flex-1">
        <p className={`font-semibold text-ink-muted ${compact ? 'text-xs' : 'text-sm'}`}>
          Kod odbioru
        </p>
        <p
          className={`break-all font-mono font-bold tracking-[0.15em] text-ink ${
            compact ? 'text-xl' : 'text-2xl'
          }`}
        >
          {pickupCode}
        </p>
        {!compact && (
          <p className="mt-2 text-sm text-ink-muted">
            Pokaż ten kod lub QR przy odbiorze. Pracownik sklepu potwierdzi wydanie towaru.
          </p>
        )}
      </div>
    </div>
  );
}
