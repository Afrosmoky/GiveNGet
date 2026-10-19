"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LuClock, LuHeart, LuMapPin } from 'react-icons/lu';
import { getImageUrl } from '../utils/imageUtils';
import { useFavorites } from '../hooks/useFavorites';
import { useErrorContext } from '../context/ErrorContext';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { trackOfferClick } from '../utils/auth';
import { canReserveOffer } from '../types/reservation';
import { OfferTileProps, OfferStatus, STATUS_LABELS } from '../types/offer';
import UserRankBadge from './UserRankBadge';
import { Badge, IconButton, Price, StatusPill, buttonClasses, cn, type BadgeTone } from './ui';
import { categoryIcon } from './offer/categoryIcons';

interface ExtendedOfferTileProps extends OfferTileProps {
  isEditing?: boolean;
  showStatus?: boolean;
  onFavoriteToggle?: (offerId: string, currentIsFavorite: boolean) => Promise<void>;
  /** Ukrywa badge sprzedawcy — np. na stronie samego sklepu, gdzie byłby pętlą. */
  hideStoreLink?: boolean;
  className?: string;
}

const OFFER_STATUS_TONE: Record<OfferStatus, BadgeTone> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  PENDING_VERIFICATION: 'warning',
};

/**
 * Kafelek oferty. Cały kafelek prowadzi do oferty przez „rozciągnięty” link w tytule
 * (pseudo-element na całą kartę) — badge sprzedawcy, serduszko i „Rezerwuj” leżą nad nim
 * jako rodzeństwo, więc nie ma zagnieżdżonych <a>/<button> w <a>.
 *
 * Szerokość kafelka wyznacza kontener (siatka / rząd). Propsy width/height/imageWidth/imageHeight
 * zostały w typie dla zgodności, ale nie są już używane.
 */
export default function OfferTile({
  id,
  name,
  location,
  imageUrl,
  transactionType,
  status,
  isFavorite = false,
  isEditing = false,
  showStatus = false,
  sellerRank,
  sellerTrustPoints,
  sellerId,
  sellerType,
  storeName,
  distance,
  categoryId,
  price,
  currency,
  originalPrice,
  discountPercent,
  availableQuantity,
  pickupDateTo,
  hideStoreLink = false,
  onFavoriteToggle,
  className,
}: ExtendedOfferTileProps) {
  const { toggleFavorite, loading } = useFavorites();
  const { addError } = useErrorContext();
  const { user } = useCurrentUser();
  const [localIsFavorite, setLocalIsFavorite] = useState(isFavorite);

  // Synchronizuj lokalny stan z propem gdy się zmieni
  useEffect(() => {
    setLocalIsFavorite(isFavorite);
  }, [isFavorite]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onFavoriteToggle) {
      // Użyj zewnętrznej funkcji do synchronizacji między sekcjami
      await onFavoriteToggle(id, localIsFavorite);
      // Nie aktualizuj lokalnego stanu - będzie zaktualizowany przez rodzica
    } else {
      // Użyj lokalnego hooka (dla kompatybilności wstecznej)
      const newFavoriteState = await toggleFavorite(id, localIsFavorite, addError);
      if (newFavoriteState !== undefined) {
        setLocalIsFavorite(newFavoriteState);
      }
    }
  };

  const handleOfferClick = () => {
    // Zapisz kliknięcie tylko dla ofert nie będących w trybie edycji
    if (!isEditing) {
      trackOfferClick(id);
    }
  };

  const href = isEditing ? `/offers/edit/${id}` : `/offers/${id}/${name}`;

  // Badge sprzedawcy: sklep → profil sklepu, osoba prywatna → jej profil
  const isCompany = sellerType === 'COMPANY';
  const showSeller = !hideStoreLink && !isEditing && !!sellerId;
  const sellerHref = isCompany ? `/stores/${sellerId}` : `/profile/${sellerId}`;
  const sellerLabel = [isCompany ? storeName || 'Sklep' : 'Osoba prywatna', distance].filter(Boolean).join(' · ');

  // Prawy górny róg: darmowa oferta albo stan sztuk (wyliczony w backendzie)
  const pill =
    transactionType === 'free' ? (
      <StatusPill status="free" />
    ) : typeof availableQuantity === 'number' ? (
      availableQuantity > 0 ? <StatusPill status="remaining" count={availableQuantity} /> : <StatusPill status="soldout" />
    ) : null;

  const showReserve =
    !isEditing && canReserveOffer(user, { sellerId, availableQuantity }) && (availableQuantity ?? 0) > 0;

  const CategoryIcon = categoryIcon(categoryId);

  return (
    <article
      className={cn(
        'group relative flex min-w-0 flex-col overflow-hidden rounded-ui-xl border border-line bg-surface shadow-card transition-shadow',
        'hover:border-line-strong hover:shadow-pop focus-within:ring-2 focus-within:ring-brand/40',
        className
      )}
    >
      {/* Obraz */}
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-soft">
        {imageUrl ? (
          <Image
            src={getImageUrl(imageUrl)}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, 260px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-brand/60">
            <CategoryIcon size={44} strokeWidth={1.5} aria-hidden />
          </div>
        )}

        {/* Jeden rząd: badge sprzedawcy się skraca, pigułka statusu nie — na wąskiej karcie nie nachodzą na siebie */}
        {(showSeller || pill) && (
          <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-start justify-between gap-1.5">
            {showSeller ? (
              <Link
                href={sellerHref}
                onClick={e => e.stopPropagation()}
                title={isCompany ? `Zobacz sklep: ${storeName || ''}` : 'Zobacz profil sprzedającego'}
                className="pointer-events-auto min-w-0 truncate rounded-full bg-surface/90 px-2.5 py-1 text-xs font-medium text-ink shadow-card backdrop-blur transition-colors hover:bg-surface"
              >
                {sellerLabel}
              </Link>
            ) : (
              <span />
            )}
            {pill && <div className="shrink-0">{pill}</div>}
          </div>
        )}
      </div>

      {/* Treść */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5 text-ink" title={name}>
          <Link
            href={href}
            onClick={handleOfferClick}
            className="after:absolute after:inset-0 after:content-[''] focus:outline-none"
          >
            {name}
          </Link>
        </h3>

        {(pickupDateTo || location) && (
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-muted">
            {pickupDateTo && (
              <span className="inline-flex items-center gap-1">
                <LuClock size={13} aria-hidden />
                do {pickupDateTo}
              </span>
            )}
            {location && (
              <span className="inline-flex min-w-0 items-center gap-1" title={location}>
                <LuMapPin size={13} aria-hidden className="shrink-0" />
                <span className="truncate">{location}</span>
              </span>
            )}
          </div>
        )}

        {(sellerRank || (status && (isEditing || showStatus))) && (
          <div className="relative z-10 flex flex-wrap items-center gap-1.5">
            {sellerRank && (
              <UserRankBadge rank={sellerRank} trustPoints={sellerTrustPoints} showPoints={false} size="small" clickable={true} />
            )}
            {status && (isEditing || showStatus) && <Badge tone={OFFER_STATUS_TONE[status]}>{STATUS_LABELS[status]}</Badge>}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <Price
            transactionType={transactionType}
            price={price}
            currency={currency}
            originalPrice={originalPrice}
            discountPercent={discountPercent}
          />

          <IconButton
            label={localIsFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
            icon={<LuHeart size={18} fill={localIsFavorite ? 'currentColor' : 'none'} />}
            onClick={handleFavoriteClick}
            disabled={loading(id)}
            aria-pressed={localIsFavorite}
            className={cn('relative z-10 -mr-1.5 h-8 w-8 shrink-0', localIsFavorite && '!text-danger')}
          />
        </div>

        {showReserve && (
          // Rezerwacja (wybór liczby sztuk) jest w szczegółach oferty — kafelek tylko tam prowadzi
          <Link href={href} onClick={handleOfferClick} className={cn(buttonClasses('primary', 'sm', true), 'relative z-10')}>
            Rezerwuj
          </Link>
        )}
      </div>
    </article>
  );
}
