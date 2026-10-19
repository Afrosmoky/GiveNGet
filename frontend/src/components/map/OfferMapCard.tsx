"use client";

import Link from 'next/link';
import { getImageUrl } from '../../utils/imageUtils';
import { offerHref, type MapOffer } from '../../utils/offerMap';
import { StatusPill, cn, formatPrice } from '../ui';

/** Karta oferty w popupie mapy: miniatura, nazwa, cena albo typ, dostępność, link. */
export function OfferMapCard({ offer, className }: { offer: MapOffer; className?: string }) {
  const priceLabel =
    offer.transactionType === 'sale' && typeof offer.price === 'number'
      ? formatPrice(offer.price, offer.currency)
      : offer.transactionType === 'exchange'
        ? 'Wymiana'
        : 'Za darmo';

  return (
    <Link href={offerHref(offer)} className={cn('flex gap-3 rounded-ui-md p-2 pr-8 transition-colors hover:bg-surface-muted', className)}>
      <span
        className="h-16 w-16 shrink-0 rounded-ui-md bg-brand-soft bg-cover bg-center"
        style={offer.imageUrl ? { backgroundImage: `url(${getImageUrl(offer.imageUrl)})` } : undefined}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{offer.name}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn('text-sm font-bold', offer.transactionType === 'sale' ? 'text-brand' : 'text-brand-strong')}>{priceLabel}</span>
          {typeof offer.availableQuantity === 'number' &&
            (offer.availableQuantity > 0 ? (
              <StatusPill status="remaining" count={offer.availableQuantity} />
            ) : (
              <StatusPill status="soldout" />
            ))}
        </span>
        <span className="mt-1 block text-xs font-medium text-brand">Zobacz ofertę →</span>
      </span>
    </Link>
  );
}
