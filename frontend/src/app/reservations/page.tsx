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
import { LuCalendar, LuChevronLeft, LuChevronRight, LuSearch, LuShoppingBag, LuTriangleAlert, LuX } from 'react-icons/lu';
import { Button, Card, PageHeader, StatusPill, cn, reservationPillStatus } from '../../components/ui';
import {
  PageResponse,
  Reservation,
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
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Moje rezerwacje"
        description="Pokaż kod odbioru w sklepie, żeby odebrać zarezerwowany towar."
      />

      {cancelError && (
        <div role="alert" className="mb-4 rounded-ui-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {cancelError}
        </div>
      )}

      {loading && !data && <LoadingState />}

      {error && (
        <Card padding="lg" className="flex flex-col items-center gap-3 text-center" role="alert">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
            <LuTriangleAlert size={20} aria-hidden />
          </span>
          <p className="text-sm text-ink">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => loadReservations(page)}>
            Spróbuj ponownie
          </Button>
        </Card>
      )}

      {!error && data && data.content.length === 0 && <EmptyState />}

      {!error && data && data.content.length > 0 && (
        <>
          <ul className={cn('flex flex-col gap-4 transition-opacity', loading && 'opacity-60')} aria-busy={loading || undefined}>
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
  const active = reservation.status === 'RESERVED';

  return (
    <li>
      <Card padding="lg" className={cn(!active && 'bg-surface/80')}>
        <div className="flex gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-ui-md border border-line bg-brand-soft sm:h-24 sm:w-24">
            {reservation.offerImageUrl ? (
              <Image
                src={getImageUrl(reservation.offerImageUrl)}
                alt=""
                fill
                sizes="96px"
                className={cn('object-cover', !active && 'opacity-80 grayscale-[30%]')}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-brand/60">
                <LuShoppingBag size={28} aria-hidden />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {/* Mobile: status nad nazwą (nazwa dostaje całą szerokość); od sm obok siebie */}
            <div className="flex flex-col-reverse items-start gap-1.5 sm:flex-row sm:justify-between sm:gap-3">
              <Link
                href={`/offers/${reservation.offerId}`}
                className="line-clamp-2 text-base font-semibold leading-snug text-ink transition-colors hover:text-brand"
              >
                {reservation.offerName || 'Oferta'}
              </Link>
              <StatusPill
                status={reservationPillStatus(reservation.status)}
                label={RESERVATION_STATUS_LABELS[reservation.status]}
                size="md"
                className="shrink-0"
              />
            </div>

            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              <DetailRow label="Liczba sztuk" value={`${reservation.quantity} szt.`} strong />
              <DetailRow label="Zarezerwowano" value={formatDateTime(reservation.createdAt)} />
              <DetailRow
                label={active ? 'Odbierz do' : reservation.status === 'EXPIRED' ? 'Wygasła' : 'Termin odbioru'}
                value={formatDateTime(reservation.expiresAt)}
                strong={active}
              />
              {reservation.collectedAt && <DetailRow label="Odebrano" value={formatDateTime(reservation.collectedAt)} />}
              {reservation.cancelledAt && <DetailRow label="Anulowano" value={formatDateTime(reservation.cancelledAt)} />}
            </dl>
          </div>
        </div>

        {/* Kod ma sens tylko dopóki towar można odebrać */}
        {active && (
          <div className="mt-4 border-t border-line pt-4">
            <PickupCodeCard pickupCode={reservation.pickupCode} qrPayload={reservation.qrPayload} compact />
          </div>
        )}

        {isCancellable(reservation) && (
          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              loading={cancelling}
              leftIcon={<LuX size={16} aria-hidden />}
              className="text-danger hover:bg-danger-soft hover:text-danger"
            >
              {cancelling ? 'Anuluję…' : 'Anuluj rezerwację'}
            </Button>
          </div>
        )}
      </Card>
    </li>
  );
}

function DetailRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-2 sm:justify-start">
      <dt className="text-ink-muted">{label}:</dt>
      <dd className={cn('whitespace-nowrap text-right sm:ml-1 sm:text-left', strong ? 'font-semibold text-ink' : 'text-ink')}>{value}</dd>
    </div>
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
      <p className="mt-4 text-center text-sm text-ink-muted">
        Rezerwacje: {totalElements}
      </p>
    );
  }

  return (
    <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Paginacja rezerwacji">
      <Button
        variant="secondary"
        size="sm"
        leftIcon={<LuChevronLeft size={16} aria-hidden />}
        onClick={() => onChange(Math.max(0, page - 1))}
        disabled={disabled || page <= 0}
      >
        Poprzednia
      </Button>
      <span className="text-center text-sm text-ink-muted">
        Strona {page + 1} z {totalPages} · {totalElements} rezerwacji
      </span>
      <Button
        variant="secondary"
        size="sm"
        rightIcon={<LuChevronRight size={16} aria-hidden />}
        onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
        disabled={disabled || page >= totalPages - 1}
      >
        Następna
      </Button>
    </nav>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-ui-xl border border-line bg-surface p-5 shadow-card">
          <div className="flex gap-4">
            <div className="h-20 w-20 shrink-0 rounded-ui-md bg-surface-sunken sm:h-24 sm:w-24" />
            <div className="flex-1 space-y-3 py-1">
              <div className="flex justify-between gap-3">
                <div className="h-5 w-1/2 rounded bg-surface-sunken" />
                <div className="h-6 w-20 rounded-full bg-surface-sunken" />
              </div>
              <div className="h-4 w-1/3 rounded bg-surface-sunken" />
              <div className="h-4 w-2/3 rounded bg-surface-sunken" />
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
    <Card padding="lg" className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
        <LuCalendar size={22} aria-hidden />
      </span>
      <h2 className="text-base font-semibold text-ink">Nie masz jeszcze rezerwacji</h2>
      <p className="max-w-md text-sm text-ink-muted">
        Znajdź ofertę w okolicy i zarezerwuj produkty, żeby odebrać je w sklepie.
      </p>
      <Button href="/offers/search" className="mt-2" leftIcon={<LuSearch size={16} aria-hidden />}>
        Przeglądaj oferty
      </Button>
    </Card>
  );
}

export default function ReservationsPage() {
  return (
    <AuthGuard>
      <ReservationsPageContent />
    </AuthGuard>
  );
}
