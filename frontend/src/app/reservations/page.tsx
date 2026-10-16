"use client";

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { environment } from '../../config';
import { authorizedFetch } from '../../utils/auth';
import { describeApiError } from '../../utils/apiErrors';
import { getImageUrl } from '../../utils/imageUtils';
import { AuthGuard } from '../../components/AuthGuard';
import PickupCodeCard from '../../components/PickupCodeCard';
import {
  PageResponse,
  Reservation,
  RESERVATION_STATUS_BADGE,
  RESERVATION_STATUS_LABELS,
  formatDateTime,
  isCancellable,
} from '../../types/reservation';

const PAGE_SIZE = 20;

function ReservationsPageContent() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResponse<Reservation> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Id rezerwacji w trakcie anulowania — blokuje tylko jej przycisk. */
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadReservations = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authorizedFetch(
        `${environment.apiUrl}/api/v1/reservations?page=${targetPage}&size=${PAGE_SIZE}`
      );
      const body = await response.text();

      if (!response.ok) {
        setError(describeApiError(body, 'Nie udało się pobrać rezerwacji.'));
        return;
      }
      setData(JSON.parse(body) as PageResponse<Reservation>);
    } catch {
      setError('Błąd połączenia z serwerem. Sprawdź połączenie internetowe.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations(page);
  }, [page, loadReservations]);

  const handleCancel = async (reservationId: string) => {
    setCancelError(null);
    setCancellingId(reservationId);
    try {
      const response = await authorizedFetch(
        `${environment.apiUrl}/api/v1/reservations/${reservationId}/cancel`,
        { method: 'POST' }
      );
      const body = await response.text();

      if (!response.ok) {
        setCancelError(describeApiError(body, 'Nie udało się anulować rezerwacji.'));
        return;
      }
      // Odświeżamy z serwera, a nie lokalnie: anulowanie zwalnia dostępność oferty
      // i status mógł się w tym czasie zmienić także z innego powodu (np. wygaśnięcie).
      await loadReservations(page);
    } catch {
      setCancelError('Błąd połączenia z serwerem. Sprawdź połączenie internetowe.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Moje rezerwacje</h1>
        <p className="mt-1 text-sm text-gray-600">
          Pokaż kod odbioru w sklepie, żeby odebrać zarezerwowany towar.
        </p>
      </header>

      {cancelError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {cancelError}
        </div>
      )}

      {loading && !data && <LoadingState />}

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => loadReservations(page)}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {!error && data && data.content.length === 0 && <EmptyState />}

      {!error && data && data.content.length > 0 && (
        <>
          <ul className={`flex flex-col gap-4 ${loading ? 'opacity-60' : ''}`}>
            {data.content.map((reservation) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                cancelling={cancellingId === reservation.id}
                onCancel={() => handleCancel(reservation.id)}
              />
            ))}
          </ul>

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            disabled={loading}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}

function ReservationCard({
  reservation,
  cancelling,
  onCancel,
}: {
  reservation: Reservation;
  cancelling: boolean;
  onCancel: () => void;
}) {
  return (
    <li className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Image
          src={reservation.offerImageUrl ? getImageUrl(reservation.offerImageUrl) : '/images/food-image.svg'}
          alt={reservation.offerName || 'Oferta'}
          width={96}
          height={96}
          className="h-24 w-24 shrink-0 rounded-lg border border-gray-200 object-cover"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Link
              href={`/offers/${reservation.offerId}`}
              className="text-lg font-bold text-gray-900 hover:text-yellow-600"
            >
              {reservation.offerName || 'Oferta'}
            </Link>
            <span
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                RESERVATION_STATUS_BADGE[reservation.status]
              }`}
            >
              {RESERVATION_STATUS_LABELS[reservation.status]}
            </span>
          </div>

          <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-2 sm:justify-start">
              <dt className="text-gray-500">Liczba sztuk:</dt>
              <dd className="font-semibold text-gray-900 sm:ml-2">{reservation.quantity}</dd>
            </div>
            <div className="flex justify-between gap-2 sm:justify-start">
              <dt className="text-gray-500">Zarezerwowano:</dt>
              <dd className="text-gray-900 sm:ml-2">{formatDateTime(reservation.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-2 sm:justify-start">
              <dt className="text-gray-500">
                {reservation.status === 'RESERVED' ? 'Odbierz do:' : 'Termin odbioru:'}
              </dt>
              <dd className="text-gray-900 sm:ml-2">{formatDateTime(reservation.expiresAt)}</dd>
            </div>
            {reservation.collectedAt && (
              <div className="flex justify-between gap-2 sm:justify-start">
                <dt className="text-gray-500">Odebrano:</dt>
                <dd className="text-gray-900 sm:ml-2">{formatDateTime(reservation.collectedAt)}</dd>
              </div>
            )}
            {reservation.cancelledAt && (
              <div className="flex justify-between gap-2 sm:justify-start">
                <dt className="text-gray-500">Anulowano:</dt>
                <dd className="text-gray-900 sm:ml-2">{formatDateTime(reservation.cancelledAt)}</dd>
              </div>
            )}
          </dl>

          {/* Kod ma sens tylko dopóki towar można odebrać */}
          {reservation.status === 'RESERVED' && (
            <div className="mt-3">
              <PickupCodeCard
                pickupCode={reservation.pickupCode}
                qrPayload={reservation.qrPayload}
                compact
              />
            </div>
          )}

          {isCancellable(reservation) && (
            <button
              type="button"
              onClick={onCancel}
              disabled={cancelling}
              className="mt-3 rounded-lg border-2 border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelling ? 'Anuluję…' : 'Anuluj rezerwację'}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function Pagination({
  page,
  totalPages,
  totalElements,
  disabled,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalElements: number;
  disabled: boolean;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return (
      <p className="mt-4 text-center text-sm text-gray-500">
        Rezerwacje: {totalElements}
      </p>
    );
  }

  return (
    <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Paginacja rezerwacji">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, page - 1))}
        disabled={disabled || page <= 0}
        className="rounded-lg border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Poprzednia
      </button>
      <span className="text-sm text-gray-600">
        Strona {page + 1} z {totalPages} · {totalElements} rezerwacji
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
        disabled={disabled || page >= totalPages - 1}
        className="rounded-lg border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Następna
      </button>
    </nav>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
          <div className="flex gap-4">
            <div className="h-24 w-24 shrink-0 rounded-lg bg-gray-200" />
            <div className="flex-1 space-y-3 py-1">
              <div className="h-5 w-1/2 rounded bg-gray-200" />
              <div className="h-4 w-1/3 rounded bg-gray-200" />
              <div className="h-4 w-2/3 rounded bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Ładowanie rezerwacji…</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-8 text-center">
      <h2 className="text-lg font-bold text-gray-900">Nie masz jeszcze rezerwacji</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
        Znajdź ofertę w okolicy i zarezerwuj produkty, żeby odebrać je w sklepie.
      </p>
      <Link
        href="/offers/search"
        className="mt-4 inline-block rounded-lg bg-yellow-400 px-5 py-3 font-bold text-gray-900 transition hover:bg-yellow-500"
      >
        Przeglądaj oferty
      </Link>
    </div>
  );
}

export default function ReservationsPage() {
  return (
    <AuthGuard>
      <ReservationsPageContent />
    </AuthGuard>
  );
}
