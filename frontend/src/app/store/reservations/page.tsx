"use client";

import { useCallback, useEffect, useState } from 'react';
import { LuCalendar, LuChevronLeft, LuChevronRight, LuTriangleAlert } from 'react-icons/lu';
import { environment } from '../../../config';
import { authorizedFetch } from '../../../utils/auth';
import { describeApiError } from '../../../utils/apiErrors';
import { useRoleGate } from '../../../hooks/useRoleGate';
import { StoreReservationList } from '../../../components/store/StoreReservationList';
import { Button, Card, Chip, PageHeader, Spinner, consolePage } from '../../../components/ui';
import type { PageResponse, ReservationStatus, StoreReservation } from '../../../types/reservation';

const PAGE_SIZE = 20;
const ENDPOINT = `${environment.apiUrl}/api/v1/reservations/for-store`;

/** Filtry statusu — wartość trafia 1:1 do ?status= (backend filtruje po statusie efektywnym). */
const FILTERS: { value: ReservationStatus | null; label: string }[] = [
  { value: null, label: 'Wszystkie' },
  { value: 'RESERVED', label: 'Do odbioru' },
  { value: 'COLLECTED', label: 'Odebrane' },
  { value: 'EXPIRED', label: 'Wygasłe' },
  { value: 'CANCELLED', label: 'Anulowane' },
];

/** Rezerwacje na oferty sklepu (docs/08 #8). Tylko konto firmowe. */
export default function StoreReservationsPage() {
  const gate = useRoleGate('COMPANY');
  const [status, setStatus] = useState<ReservationStatus | null>(null);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResponse<StoreReservation> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number, targetStatus: ReservationStatus | null) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(targetPage), size: String(PAGE_SIZE) });
      if (targetStatus) params.set('status', targetStatus);
      const response = await authorizedFetch(`${ENDPOINT}?${params}`);
      if (!response.ok) {
        setError(describeApiError(await response.text(), 'Nie udało się pobrać rezerwacji.'));
        return;
      }
      setData(await response.json());
    } catch {
      setError('Brak połączenia z serwerem. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (gate === 'granted') load(page, status);
  }, [gate, page, status, load]);

  const changeFilter = (value: ReservationStatus | null) => {
    setStatus(value);
    setPage(0);
  };

  if (gate !== 'granted') {
    return (
      <div className="flex justify-center p-10">
        <Spinner />
      </div>
    );
  }

  const totalPages = data?.totalPages ?? 0;

  return (
    <div className={consolePage}>
      <PageHeader
        title="Rezerwacje"
        description="Rezerwacje klientów na oferty Twojego sklepu. Odbiór potwierdza pracownik kodem okazanym przez klienta."
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtr statusu">
        {FILTERS.map(f => (
          <Chip key={f.label} selected={status === f.value} onClick={() => changeFilter(f.value)} className="shrink-0">
            {f.label}
          </Chip>
        ))}
      </div>

      <Card padding="none" className="p-4 sm:p-5">
        {error ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <LuTriangleAlert size={28} className="text-danger" aria-hidden />
            <p className="text-sm text-ink-muted">{error}</p>
            <Button variant="secondary" onClick={() => load(page, status)}>
              Spróbuj ponownie
            </Button>
          </div>
        ) : !data && loading ? (
          <div className="space-y-3" aria-busy>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-ui-md bg-surface-sunken" />
            ))}
          </div>
        ) : data && data.content.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand" aria-hidden>
              <LuCalendar size={22} />
            </span>
            <p className="font-medium text-ink">{status ? 'Brak rezerwacji w tym statusie' : 'Nie ma jeszcze rezerwacji'}</p>
            <p className="max-w-sm text-sm text-ink-muted">
              {status ? 'Zmień filtr, żeby zobaczyć pozostałe.' : 'Gdy klient zarezerwuje Twoją ofertę, zobaczysz to tutaj.'}
            </p>
          </div>
        ) : data ? (
          <div className={loading ? 'opacity-60 transition-opacity' : undefined}>
            <StoreReservationList items={data.content} />
          </div>
        ) : null}
      </Card>

      {data && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-ink-muted">
          <span>
            Strona {data.page + 1} z {totalPages} · {data.totalElements} rezerwacji
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)} leftIcon={<LuChevronLeft size={16} />}>
              Poprzednia
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages - 1 || loading} onClick={() => setPage(p => p + 1)} rightIcon={<LuChevronRight size={16} />}>
              Następna
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
