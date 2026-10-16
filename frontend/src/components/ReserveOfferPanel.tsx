"use client";

import { useState } from 'react';
import { environment } from '../config';
import { authorizedFetch } from '../utils/auth';
import { describeApiError } from '../utils/apiErrors';
import { Reservation, formatDateTime } from '../types/reservation';
import PickupCodeCard from './PickupCodeCard';

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
      <div className="rounded-lg border border-green-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="mb-1 text-lg font-bold text-gray-900">Zarezerwowano</h3>
        <p className="mb-4 text-sm text-gray-600">
          {reservation.quantity === 1
            ? '1 sztuka czeka na Ciebie.'
            : `${reservation.quantity} sztuki czekają na Ciebie.`}{' '}
          Odbierz do <span className="font-semibold">{formatDateTime(reservation.expiresAt)}</span>.
        </p>

        <PickupCodeCard pickupCode={reservation.pickupCode} qrPayload={reservation.qrPayload} />

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <a
            href="/reservations"
            className="flex-1 rounded-lg bg-yellow-400 px-4 py-3 text-center font-bold text-gray-900 transition hover:bg-yellow-500"
          >
            Moje rezerwacje
          </a>
          {available > 0 && (
            <button
              type="button"
              onClick={() => setReservation(null)}
              className="flex-1 rounded-lg border-2 border-gray-200 px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Zarezerwuj więcej
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold text-gray-900">Rezerwacja</h3>
        <span className={`text-sm font-semibold ${soldOut ? 'text-red-600' : 'text-gray-700'}`}>
          {soldOut
            ? 'Brak dostępności'
            : `Dostępne: ${available}${totalQuantity ? ` z ${totalQuantity}` : ''} szt.`}
        </span>
      </div>

      {soldOut ? (
        <p className="text-sm text-gray-600">
          Wszystkie sztuki z tej oferty są już zarezerwowane lub odebrane.
        </p>
      ) : (
        <>
          <label htmlFor="reserve-quantity" className="mb-2 block text-sm font-semibold text-gray-700">
            Liczba sztuk
          </label>
          <div className="mb-4 flex items-stretch gap-2">
            <button
              type="button"
              aria-label="Zmniejsz liczbę sztuk"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || submitting}
              className="w-12 rounded-lg border-2 border-gray-200 text-xl font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              −
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
              className="min-w-0 flex-1 rounded-lg border-2 border-gray-200 p-3 text-center text-lg font-semibold transition-colors focus:border-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-200"
            />
            <button
              type="button"
              aria-label="Zwiększ liczbę sztuk"
              onClick={() => setQuantity((q) => Math.min(available, q + 1))}
              disabled={quantity >= available || submitting}
              className="w-12 rounded-lg border-2 border-gray-200 text-xl font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleReserve}
            disabled={submitting}
            className="w-full rounded-lg bg-yellow-400 py-3 font-bold text-gray-900 transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Rezerwuję…' : 'Rezerwuj'}
          </button>
        </>
      )}

      {error && (
        <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
