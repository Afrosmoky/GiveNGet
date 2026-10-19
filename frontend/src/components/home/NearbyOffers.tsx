"use client";

import { useEffect, useState } from 'react';
import { LuArrowRight } from 'react-icons/lu';
import { environment } from '../../config';
import type { OfferTileProps } from '../../types/offer';
import { authorizedFetch } from '../../utils/auth';
import OfferTile from '../OfferTile';
import { Button, Card, cn, pageContainer } from '../ui';

const LIMIT = 4;

/**
 * „Najnowsze w okolicy” dla zalogowanego — pierwsze oferty z /api/offer/newest
 * (backend liczy okolicę z lokalizacji konta). Brak lokalizacji albo błąd = sekcja z CTA
 * do wyszukiwarki zamiast pustej siatki.
 */
export function NearbyOffers() {
  const [offers, setOffers] = useState<OfferTileProps[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    authorizedFetch(`${environment.apiUrl}/api/offer/newest`, { method: 'GET' })
      .then(res => (res.ok ? res.json() : []))
      .then((data: OfferTileProps[]) => {
        if (!cancelled) setOffers(Array.isArray(data) ? data.slice(0, LIMIT) : []);
      })
      .catch(() => {
        if (!cancelled) setOffers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-labelledby="nearby-offers" className="border-t border-line bg-surface-muted">
      <div className={cn(pageContainer, 'py-12 sm:py-16')}>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="nearby-offers" className="text-2xl font-semibold tracking-tight text-brand-ink sm:text-3xl">
              Najnowsze w okolicy
            </h2>
            <p className="mt-2 text-sm text-ink-muted sm:text-base">Świeżo dodane oferty w promieniu 25 km.</p>
          </div>
          <Button href="/offers/search" variant="ghost" rightIcon={<LuArrowRight size={16} />} className="hidden shrink-0 sm:inline-flex">
            Zobacz wszystkie
          </Button>
        </div>

        <div className="mt-6">
          {offers === null ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-4">
              {Array.from({ length: LIMIT }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-ui-xl bg-surface-sunken" />
              ))}
            </div>
          ) : offers.length === 0 ? (
            <Card padding="lg" className="text-center">
              <p className="text-sm text-ink-muted">Nie ma jeszcze nowych ofert w Twojej okolicy.</p>
              <Button href="/offers/search" variant="secondary" className="mt-4">
                Szukaj w innym miejscu
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-4">
              {offers.map(offer => (
                <OfferTile key={offer.id} {...offer} />
              ))}
            </div>
          )}
        </div>

        <Button href="/offers/search" variant="secondary" fullWidth rightIcon={<LuArrowRight size={16} />} className="mt-5 sm:hidden">
          Zobacz wszystkie oferty
        </Button>
      </div>
    </section>
  );
}
