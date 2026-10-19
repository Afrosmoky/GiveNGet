"use client";

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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

const GoogleMapComponent = dynamic(() => import('../../../components/GoogleMapComponent'), { ssr: false });

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
        <p className="text-gray-600">Ładowanie sklepu…</p>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error ?? 'Nie udało się pobrać profilu sklepu.'}
        </p>
        <Link href="/" className="text-sm font-semibold text-gray-700 underline hover:text-gray-900">
          Wróć na stronę główną
        </Link>
      </div>
    );
  }

  const hasMore = page + 1 < totalPages;
  const hasLocation = store.lat !== null && store.lon !== null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
      {/* Nagłówek sklepu */}
      <header className="mb-6 flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50">
          {store.logoUrl ? (
            <Image
              src={getImageUrl(store.logoUrl)}
              alt={`Logo: ${store.name}`}
              width={80}
              height={80}
              className="h-20 w-20 object-cover"
            />
          ) : (
            <span className="text-3xl" aria-hidden="true">🏪</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-2xl font-extrabold text-gray-900 sm:text-3xl">{store.name}</h1>
          {store.address && <p className="mt-1 break-words text-sm text-gray-600">{store.address}</p>}
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-700">
            <span>
              <span className="text-yellow-500" aria-hidden="true">★</span>{' '}
              {store.rating.count > 0
                ? `${store.rating.average.toFixed(1)} (${store.rating.count} ${store.rating.count === 1 ? 'opinia' : 'opinii'})`
                : 'brak opinii'}
            </span>
            <Link href={`/profile/${store.id}`} className="font-semibold underline hover:text-gray-900">
              Opinie
            </Link>
            <span className="text-gray-500">Aktywne oferty: {store.activeOffersCount}</span>
          </p>
        </div>
      </header>

      {/* Opis + mapa */}
      {(store.description || hasLocation) && (
        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {store.description && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="mb-2 text-lg font-bold text-gray-900">O sklepie</h2>
              <p className="whitespace-pre-line break-words text-sm text-gray-700">{store.description}</p>
            </div>
          )}
          {hasLocation && (
            <div className="h-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <GoogleMapComponent userLocation={{ lat: store.lat, lon: store.lon }} offers={[]} />
            </div>
          )}
        </section>
      )}

      {/* Oferty */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Aktualne oferty</h2>

        {offers.length === 0 && !offersError ? (
          <p className="py-8 text-center text-sm text-gray-600">
            Ten sklep nie ma teraz aktywnych ofert. Zajrzyj później.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-4">
            {offers.map((offer) => (
              <OfferTile key={offer.id} {...offer} hideStoreLink />
            ))}
          </div>
        )}

        {offersError && (
          <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {offersError}
          </p>
        )}

        {hasMore && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-lg bg-yellow-400 px-5 py-2.5 font-bold text-gray-900 transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore ? 'Ładowanie…' : 'Pokaż więcej'}
            </button>
          </div>
        )}
      </section>
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
