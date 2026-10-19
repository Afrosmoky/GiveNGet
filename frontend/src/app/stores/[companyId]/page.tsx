"use client";

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { environment } from '../../../config';
import { authorizedFetch } from '../../../utils/auth';
import { describeApiError } from '../../../utils/apiErrors';
import { getImageUrl } from '../../../utils/imageUtils';
import { AuthGuard } from '../../../components/AuthGuard';
import OfferTile from '../../../components/OfferTile';
import { OfferTile as OfferTileType } from '../../../types/offer';
import { StoreOffersPage, StoreProfile } from '../../../types/store';
import { StarRating } from '../../../components/rating/Stars';
import { LuCircleAlert, LuMapPin, LuMessageSquare, LuPackageOpen, LuStore } from 'react-icons/lu';
import { Alert, Badge, Button, Card, CardHeader, Spinner, cn, pageContainer } from '../../../components/ui';

const GoogleMapComponent = dynamic(() => import('../../../components/GoogleMapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-surface-muted">
      <Spinner className="h-5 w-5 text-brand" label="Ładowanie mapy" />
    </div>
  ),
});

const OFFER_GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-4';

/** Rozmiar strony listy ofert — backend i tak przycina do swojego limitu. */
const PAGE_SIZE = 20;

/**
 * Publiczny profil sklepu (docs/08, pozycja 3): dane firmy i jej aktywne oferty.
 * Opinie zostają na /profile/{id} — tu tylko podsumowanie i link.
 */
function StorePageContent() {
  const params = useParams<{ companyId: string }>();
  const companyId = params?.companyId;

  const [store, setStore] = useState<StoreProfile | null>(null);
  const [offers, setOffers] = useState<OfferTileType[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offersError, setOffersError] = useState<string | null>(null);

  const fetchOffersPage = useCallback(
    async (pageToLoad: number): Promise<StoreOffersPage> => {
      const response = await authorizedFetch(
        `${environment.apiUrl}/api/v1/stores/${companyId}/offers?page=${pageToLoad}&size=${PAGE_SIZE}`
      );
      const body = await response.text();
      if (!response.ok) {
        throw new Error(describeApiError(body, 'Nie udało się pobrać ofert sklepu.'));
      }
      return JSON.parse(body) as StoreOffersPage;
    },
    [companyId]
  );

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setOffersError(null);
      try {
        const [profileResponse, firstPage] = await Promise.all([
          authorizedFetch(`${environment.apiUrl}/api/v1/stores/${companyId}`),
          fetchOffersPage(0).catch((e: unknown) => e as Error),
        ]);
        const profileBody = await profileResponse.text();
        if (cancelled) return;
        if (!profileResponse.ok) {
          setError(describeApiError(profileBody, 'Nie udało się pobrać profilu sklepu.'));
          return;
        }
        setStore(JSON.parse(profileBody) as StoreProfile);
        if (firstPage instanceof Error) {
          setOffersError(firstPage.message);
        } else {
          setOffers(firstPage.content);
          setPage(firstPage.page);
          setTotalPages(firstPage.totalPages);
        }
      } catch {
        if (!cancelled) setError('Błąd połączenia z serwerem. Sprawdź połączenie internetowe.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [companyId, fetchOffersPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    setOffersError(null);
    try {
      const next = await fetchOffersPage(page + 1);
      // Deduplikacja na wypadek nowej oferty dodanej między stronami
      setOffers((prev) => {
        const known = new Set(prev.map((o) => o.id));
        return [...prev, ...next.content.filter((o) => !known.has(o.id))];
      });
      setPage(next.page);
      setTotalPages(next.totalPages);
    } catch (e) {
      setOffersError(e instanceof Error ? e.message : 'Nie udało się pobrać ofert sklepu.');
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <Spinner className="h-7 w-7 text-brand" label="Wczytywanie sklepu" />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className={cn(pageContainer, 'py-8')}>
        <Card padding="lg" role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
            <LuCircleAlert size={22} aria-hidden />
          </span>
          <p className="text-sm text-ink">{error ?? 'Nie udało się pobrać profilu sklepu.'}</p>
          <Button variant="secondary" href="/">
            Wróć na stronę główną
          </Button>
        </Card>
      </div>
    );
  }

  const hasMore = page + 1 < totalPages;
  const hasLocation = store.lat !== null && store.lon !== null;
  const ratingCount = store.rating.count;

  return (
    <div className={cn(pageContainer, 'py-6 sm:py-8')}>
      {/* Nagłówek sklepu */}
      <Card padding="lg" className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {store.logoUrl ? (
            <Image
              src={getImageUrl(store.logoUrl)}
              alt={`Logo: ${store.name}`}
              width={80}
              height={80}
              className="h-16 w-16 shrink-0 rounded-full border border-line object-cover sm:h-20 sm:w-20"
            />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand sm:h-20 sm:w-20" aria-hidden>
              <LuStore size={28} />
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-xl font-semibold tracking-tight text-brand-ink sm:text-2xl">{store.name}</h1>
              <Badge tone="brand">Sklep</Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              {ratingCount > 0 ? (
                <>
                  <StarRating value={store.rating.average} />
                  <span className="font-medium text-ink">{store.rating.average.toFixed(1)}</span>
                  <span className="text-ink-muted">({ratingCount} {ratingCount === 1 ? 'opinia' : 'opinii'})</span>
                </>
              ) : (
                <span className="text-ink-muted">Brak opinii</span>
              )}
              <span aria-hidden className="text-ink-subtle">·</span>
              <span className="text-ink-muted">Aktywne oferty: {store.activeOffersCount}</span>
            </div>
            {store.address && (
              <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-muted">
                <LuMapPin size={14} className="mt-0.5 shrink-0" aria-hidden />
                <span className="break-words">{store.address}</span>
              </p>
            )}
          </div>
        </div>
        <Button variant="secondary" href={`/profile/${store.id}`} leftIcon={<LuMessageSquare size={16} />} className="sm:shrink-0">
          Opinie
        </Button>
      </Card>

      {/* Opis + mapa */}
      {(store.description || hasLocation) && (
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_340px]">
          {store.description ? (
            <Card padding="lg">
              <CardHeader title="O sklepie" className="mb-2" />
              <p className="whitespace-pre-line break-words text-sm text-ink">{store.description}</p>
            </Card>
          ) : (
            <div className="hidden md:block" />
          )}
          {hasLocation && (
            <Card padding="none" className="h-56 overflow-hidden">
              <GoogleMapComponent userLocation={{ lat: store.lat, lon: store.lon }} offers={[]} zoom={14} />
            </Card>
          )}
        </div>
      )}

      {/* Oferty */}
      <Card padding="lg" className="mt-4">
        <CardHeader title="Aktualne oferty" />

        {offers.length === 0 && !offersError ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
              <LuPackageOpen size={22} aria-hidden />
            </span>
            <p className="text-sm text-ink-muted">Ten sklep nie ma teraz aktywnych ofert. Zajrzyj później.</p>
          </div>
        ) : (
          <div className={OFFER_GRID}>
            {offers.map((offer) => (
              <OfferTile key={offer.id} {...offer} hideStoreLink />
            ))}
          </div>
        )}

        {offersError && (
          <Alert tone="danger" className="mt-4">
            {offersError}
          </Alert>
        )}

        {hasMore && (
          <div className="mt-6 flex justify-center">
            <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
              {loadingMore ? 'Wczytywanie…' : 'Pokaż więcej'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function StorePage() {
  return (
    <AuthGuard>
      <StorePageContent />
    </AuthGuard>
  );
}
