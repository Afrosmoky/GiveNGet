import Image from 'next/image';
import Link from 'next/link';
import { LuShoppingBag } from 'react-icons/lu';
import {
  STORE_RESERVATION_STATUS_LABELS,
  formatDateTime,
  type StoreReservation,
} from '../../types/reservation';
import { getImageUrl } from '../../utils/imageUtils';
import { StatusPill, cn, reservationPillStatus } from '../ui';

/** Druga data zależna od statusu: termin odbioru, moment odbioru albo anulowania. */
function secondaryTime(r: StoreReservation): { label: string; value: string } {
  switch (r.status) {
    case 'COLLECTED':
      return { label: 'Odebrano', value: formatDateTime(r.collectedAt) };
    case 'CANCELLED':
      return { label: 'Anulowano', value: formatDateTime(r.cancelledAt) };
    case 'EXPIRED':
      return { label: 'Wygasła', value: formatDateTime(r.expiresAt) };
    default:
      return { label: 'Wygasa', value: formatDateTime(r.expiresAt) };
  }
}

function Thumb({ r }: { r: StoreReservation }) {
  return (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-ui-sm bg-brand-soft text-brand/70">
      {r.offerImageUrl ? (
        <Image src={getImageUrl(r.offerImageUrl)} alt="" fill sizes="40px" className="object-cover" />
      ) : (
        <LuShoppingBag size={18} aria-hidden />
      )}
    </span>
  );
}

function OfferName({ r }: { r: StoreReservation }) {
  const name = r.offerName ?? 'Oferta usunięta';
  return r.offerId ? (
    <Link href={`/offers/${r.offerId}/${encodeURIComponent(name)}`} className="font-medium text-ink hover:text-brand">
      {name}
    </Link>
  ) : (
    <span className="font-medium text-ink-muted">{name}</span>
  );
}

function Pill({ r }: { r: StoreReservation }) {
  return <StatusPill status={reservationPillStatus(r.status)} label={STORE_RESERVATION_STATUS_LABELS[r.status]} />;
}

/**
 * Rezerwacje na oferty sklepu: tabela od md, karty na mobile. Bez kodu odbioru —
 * sklep go nie zna (potwierdza go pracownik po okazaniu przez klienta).
 */
export function StoreReservationList({ items, className }: { items: StoreReservation[]; className?: string }) {
  return (
    <div className={className}>
      {/* Desktop: tabela */}
      <table className="hidden w-full text-left text-sm md:table">
        <thead>
          <tr className="border-b border-line text-xs font-medium uppercase tracking-wide text-ink-subtle">
            <th className="py-2.5 pr-3 font-medium">Oferta</th>
            <th className="px-3 py-2.5 font-medium">Klient</th>
            <th className="px-3 py-2.5 text-right font-medium">Ilość</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Zarezerwowano</th>
            <th className="py-2.5 pl-3 font-medium">Termin</th>
          </tr>
        </thead>
        <tbody>
          {items.map(r => {
            const second = secondaryTime(r);
            return (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="py-3 pr-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Thumb r={r} />
                    <span className="line-clamp-2 min-w-0">
                      <OfferName r={r} />
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-ink-muted">{r.customerFirstName ?? '—'}</td>
                <td className="px-3 py-3 text-right font-medium tabular-nums text-ink">{r.quantity} szt.</td>
                <td className="px-3 py-3">
                  <Pill r={r} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-ink-muted">{formatDateTime(r.createdAt)}</td>
                <td className="whitespace-nowrap py-3 pl-3 tabular-nums text-ink-muted">
                  <span className="text-ink-subtle">{second.label}:</span> {second.value}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile: karty */}
      <ul className="divide-y divide-line md:hidden">
        {items.map(r => {
          const second = secondaryTime(r);
          return (
            <li key={r.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <Thumb r={r} />
              <div className="min-w-0 flex-1 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="line-clamp-2 min-w-0">
                    <OfferName r={r} />
                  </span>
                  <span className="shrink-0">
                    <Pill r={r} />
                  </span>
                </div>
                <p className="mt-1 text-ink-muted">
                  {r.quantity} szt.{r.customerFirstName ? ` · ${r.customerFirstName}` : ''}
                </p>
                <p className={cn('mt-0.5 text-xs tabular-nums text-ink-subtle')}>
                  {formatDateTime(r.createdAt)} · {second.label.toLowerCase()} {second.value}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
