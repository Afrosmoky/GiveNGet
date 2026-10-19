"use client";

import { useState } from 'react';
import { environment } from '../config';
import { authorizedFetch } from '../utils/auth';
import { describeApiError } from '../utils/apiErrors';
import { Reservation, formatDateTime } from '../types/reservation';
import PickupCodeCard from './PickupCodeCard';
import { LuCheck, LuMinus, LuPlus } from 'react-icons/lu';
import { Button, Card, StatusPill } from './ui';

interface ReserveOfferPanelProps {
  offerId: string;
  /** Dostępność z DTO oferty; panel aktualizuje ją po udanej rezerwacji. */
  availableQuantity: number;
  /** Łączna liczba sztuk wystawiona przez sprzedawcę — kontekst dla użytkownika. */
  totalQuantity?: number | null;
}

/**
 * Panel rezerwacji na szczegółach oferty.
 *
 * Renderowany wyłącznie dla konta konsumenckiego, które nie jest właścicielem oferty —
 * decyduje o tym {@code OfferDetailsView}. Backend i tak weryfikuje jedno i drugie
 * (rola ROLE_USER w SecurityConfig, własna oferta → FORBIDDEN w serwisie).
 */
export default function ReserveOfferPanel({
  offerId,
  availableQuantity,
  totalQuantity,
}: ReserveOfferPanelProps) {
  const [available, setAvailable] = useState(availableQuantity);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);

  const soldOut = available <= 0;

  const handleReserve = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const response = await authorizedFetch(`${environment.apiUrl}/api/v1/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId, quantity }),
      });

      const body = await response.text();

      if (!response.ok) {
        setError(describeApiError(body, 'Nie udało się zarezerwować oferty.'));
        return;
      }

      const created: Reservation = JSON.parse(body);
      setReservation(created);

      // Licznik dostępności przychodzi z odpowiedzi — bez dodatkowego zapytania
      if (typeof created.offerAvailableQuantity === 'number') {
        setAvailable(created.offerAvailableQuantity);
      } else {
        setAvailable((prev) => Math.max(0, prev - quantity));
      }
      setQuantity(1);
    } catch {
      setError('Błąd połączenia z serwerem. Sprawdź połączenie internetowe.');
    } finally {
      setSubmitting(false);
    }
  };

  // Po udanej rezerwacji pokazujemy kod odbioru zamiast formularza
  if (reservation) {
    return (
      <Card padding="lg" className="border-brand/30">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <LuCheck size={18} aria-hidden />
          </span>
          <div>
            <h3 className="text-base font-semibold text-ink">Zarezerwowano</h3>
            <p className="mt-0.5 text-sm text-ink-muted">
              {reservation.quantity === 1
                ? '1 sztuka czeka na Ciebie.'
                : `${reservation.quantity} sztuki czekają na Ciebie.`}{' '}
              Odbierz do <span className="font-semibold text-ink">{formatDateTime(reservation.expiresAt)}</span>.
            </p>
          </div>
        </div>

        <PickupCodeCard pickupCode={reservation.pickupCode} qrPayload={reservation.qrPayload} />

        {/* Zawsze w kolumnie — panel żyje w wąskiej kolumnie szczegółów także na desktopie */}
        <div className="mt-4 flex flex-col gap-2">
          <Button href="/reservations" size="lg" fullWidth>
            Moje rezerwacje
          </Button>
          {available > 0 && (
            <Button variant="secondary" size="lg" fullWidth onClick={() => setReservation(null)}>
              Zarezerwuj więcej
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const stepperButton =
    'flex h-12 w-12 shrink-0 items-center justify-center rounded-ui-md border border-line bg-surface text-ink transition-colors ' +
    'hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <Card padding="lg">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-ink">Rezerwacja</h3>
        {soldOut ? (
          <StatusPill status="soldout" size="md" />
        ) : (
          <StatusPill
            status="remaining"
            size="md"
            label={`Zostało ${available}${totalQuantity ? ` z ${totalQuantity}` : ''}`}
          />
        )}
      </div>

      {soldOut ? (
        <p className="text-sm text-ink-muted">
          Wszystkie sztuki z tej oferty są już zarezerwowane lub odebrane.
        </p>
      ) : (
        <>
          <label htmlFor="reserve-quantity" className="mb-1.5 block text-sm font-medium text-ink">
            Liczba sztuk
          </label>
          <div className="mb-4 flex items-stretch gap-2">
            <button
              type="button"
              aria-label="Zmniejsz liczbę sztuk"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || submitting}
              className={stepperButton}
            >
              <LuMinus size={18} aria-hidden />
            </button>
            <input
              id="reserve-quantity"
              type="number"
              inputMode="numeric"
              min={1}
              max={available}
              value={quantity}
              onChange={(e) => {
                const parsed = Number.parseInt(e.target.value, 10);
                if (Number.isNaN(parsed)) {
                  setQuantity(1);
                  return;
                }
                setQuantity(Math.min(Math.max(parsed, 1), available));
              }}
              disabled={submitting}
              className="h-12 min-w-0 flex-1 rounded-ui-md border border-line bg-surface text-center text-lg font-semibold text-ink transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <button
              type="button"
              aria-label="Zwiększ liczbę sztuk"
              onClick={() => setQuantity((q) => Math.min(available, q + 1))}
              disabled={quantity >= available || submitting}
              className={stepperButton}
            >
              <LuPlus size={18} aria-hidden />
            </button>
          </div>

          <Button size="lg" fullWidth onClick={handleReserve} loading={submitting}>
            {submitting ? 'Rezerwuję…' : 'Rezerwuj'}
          </Button>
        </>
      )}

      {error && (
        <div role="alert" className="mt-3 rounded-ui-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {error}
        </div>
      )}
    </Card>
  );
}
