"use client";

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { FaLocationCrosshairs } from 'react-icons/fa6';
import { LuChevronDown, LuList, LuMap, LuMapPin, LuRefreshCw, LuSearchX, LuSlidersHorizontal } from 'react-icons/lu';
import { environment } from '../../../config';
import { authorizedFetch } from '../../../utils/auth';
import { AuthGuard } from '../../../components/AuthGuard';
import { LocationField } from '../../../components/location/LocationField';
import { OfferMapCard } from '../../../components/map/OfferMapCard';
import { Button, Chip, Select, Spinner, cn } from '../../../components/ui';
import { useLocationPicker } from '../../../hooks/useLocationPicker';
import { offersForMap, zoomForRange } from '../../../utils/offerMap';
import type { ApiOffer, Category, TransactionType } from '../../../types/offer';

// Google Maps tylko w przeglądarce (dotyka window przy ładowaniu skryptu)
const GoogleMapComponent = dynamic(() => import('../../../components/GoogleMapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-surface-muted">
      <Spinner className="h-6 w-6 text-brand" label="Ładowanie mapy" />
    </div>
  ),
});

const RANGES_KM = [2, 5, 10, 25];
const TYPES: { value: TransactionType; label: string }[] = [
  { value: 'free', label: 'Za darmo' },
  { value: 'sale', label: 'Sprzedaż' },
  { value: 'exchange', label: 'Wymiana' },
];

type View = 'map' | 'list';

/**
 * Mapa ofert (mapa-first). Te same dane co /offers/search — GET /api/offer z lat/lon/zasięgiem
 * i filtrami — ale bez ekranu filtrów: po wejściu od razu piny wokół zapisanej lokalizacji.
 */
function OffersMapContent() {
  const location = useLocationPicker({ useSavedLocation: true });
  const [rangeKm, setRangeKm] = useState(5);
  const [types, setTypes] = useState<TransactionType[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [offers, setOffers] = useState<ApiOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [view, setView] = useState<View>('map');
  /** Mobile: filtry (zasięg, typ, kategoria) zwinięte, żeby mapa miała ekran. */
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const response = await authorizedFetch(`${environment.apiUrl}/api/categories/all`);
        if (response.ok) setCategories((await response.json()) as Category[]);
      } catch {
        // Bez kategorii filtr kategorii po prostu się nie pokaże
      }
    })();
  }, []);

  const lat = location.coords?.lat;
  const lon = location.coords?.lon;
  const typesKey = types.join(',');

  // Każda zmiana lokalizacji albo filtra = nowe pobranie ofert wokół punktu
  useEffect(() => {
    if (lat === undefined || lon === undefined) {
      setOffers([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          lat: String(lat),
          lon: String(lon),
          range: String(rangeKm),
          distanceUnit: 'KILOMETERS',
        });
        typesKey.split(',').filter(Boolean).forEach((type) => params.append('transactionType', type));
        if (categoryId !== null) params.append('categoryId', String(categoryId));

        const response = await authorizedFetch(`${environment.apiUrl}/api/offer?${params}`);
        if (cancelled) return;
        if (!response.ok) {
          setError('Nie udało się pobrać ofert. Spróbuj ponownie za chwilę.');
          return;
        }
        setOffers((await response.json()) as ApiOffer[]);
      } catch {
        if (!cancelled) setError('Brak połączenia — nie udało się pobrać ofert.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lat, lon, rangeKm, typesKey, categoryId, reloadKey]);

  const mapOffers = useMemo(() => offersForMap(offers), [offers]);
  const hasLocation = Boolean(location.coords);

  const toggleType = (type: TransactionType) =>
    setTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));

  const summary = !hasLocation
    ? null
    : loading
      ? 'Szukam ofert…'
      : `${offers.length === 0 ? 'Brak ofert' : `${offers.length} ${pluralOffers(offers.length)}`} w promieniu ${rangeKm} km`;

  const activeFilters = types.length + (categoryId !== null ? 1 : 0);

  const filters = (
    <div className="space-y-3">
      <LocationField picker={location} label="Gdzie szukasz?" />
      <button
        type="button"
        onClick={() => setFiltersOpen((open) => !open)}
        aria-expanded={filtersOpen}
        className="flex w-full items-center justify-between rounded-ui-md border border-line px-3 py-2 text-sm text-ink md:hidden"
      >
        <span className="flex items-center gap-2">
          <LuSlidersHorizontal size={16} aria-hidden />
          Filtry · {rangeKm} km{activeFilters > 0 && ` · ${activeFilters} aktywne`}
        </span>
        <LuChevronDown size={16} className={cn('transition-transform', filtersOpen && 'rotate-180')} aria-hidden />
      </button>
      <div className={cn('space-y-3', filtersOpen ? 'block' : 'hidden', 'md:block')}>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">Zasięg</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Zasięg">
          {RANGES_KM.map((km) => (
            <Chip key={km} selected={rangeKm === km} onClick={() => setRangeKm(km)}>
              {km} km
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">Typ</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Typ oferty">
          {TYPES.map((type) => (
            <Chip key={type.value} selected={types.includes(type.value)} onClick={() => toggleType(type.value)}>
              {type.label}
            </Chip>
          ))}
        </div>
      </div>
      {categories.length > 0 && (
        <Select
          label="Kategoria"
          value={categoryId ?? ''}
          onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Wszystkie kategorie</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      )}
      </div>
    </div>
  );

  const list = (
    <OfferList offers={mapOffers.slice().reverse()} loading={loading} error={error} rangeKm={rangeKm} onRetry={() => setReloadKey((k) => k + 1)} onWiden={() => setRangeKm(25)} />
  );

  const mapArea = hasLocation ? (
    <div className="relative h-full w-full">
      <GoogleMapComponent userLocation={location.coords} offers={mapOffers} zoom={zoomForRange(rangeKm)} className="h-full w-full" />
      {loading && (
        <span className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-pop">
          <Spinner className="h-3.5 w-3.5 text-brand" /> Szukam ofert…
        </span>
      )}
      {!loading && error && (
        <div role="alert" className="absolute inset-x-3 top-3 flex items-center justify-between gap-3 rounded-ui-md bg-surface px-3 py-2 text-sm text-danger shadow-pop">
          {error}
          <Button size="sm" variant="secondary" leftIcon={<LuRefreshCw size={14} />} onClick={() => setReloadKey((k) => k + 1)}>
            Ponów
          </Button>
        </div>
      )}
    </div>
  ) : (
    <NeedLocation picker={location} />
  );

  return (
    <div className="flex h-[calc(100dvh-12rem)] min-h-[28rem] flex-col md:h-[calc(100dvh-var(--shell-topbar-h))] md:flex-row">
      {/* Panel: filtry + lista (desktop) / filtry nad mapą (mobile) */}
      <aside className="flex shrink-0 flex-col border-line bg-surface md:w-[380px] md:border-r">
        <div className="border-b border-line p-3 md:p-4">
          <h1 className="mb-3 hidden text-lg font-semibold tracking-tight text-brand-ink md:block">Mapa ofert</h1>
          {filters}
        </div>
        {summary && (
          <p className="flex items-center gap-1.5 border-b border-line px-4 py-2 text-xs font-medium text-ink-muted" aria-live="polite">
            <LuMapPin size={12} aria-hidden /> {summary}
          </p>
        )}
        <div className="hidden min-h-0 flex-1 overflow-y-auto md:block">{hasLocation && list}</div>
      </aside>

      {/* Mobile: przełącznik Mapa / Lista */}
      {hasLocation && (
        <div className="flex gap-1 border-b border-line bg-surface p-2 md:hidden" role="tablist" aria-label="Widok">
          <ViewTab active={view === 'map'} onClick={() => setView('map')} icon={<LuMap size={16} />}>
            Mapa
          </ViewTab>
          <ViewTab active={view === 'list'} onClick={() => setView('list')} icon={<LuList size={16} />}>
            Lista {offers.length > 0 && `(${offers.length})`}
          </ViewTab>
        </div>
      )}

      <section className={cn('min-h-0 flex-1', hasLocation && view === 'list' ? 'hidden md:block' : 'block')}>{mapArea}</section>
      {hasLocation && view === 'list' && <section className="min-h-0 flex-1 overflow-y-auto bg-surface md:hidden">{list}</section>}
    </div>
  );
}

function ViewTab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-ui-sm text-sm font-medium transition-colors',
        active ? 'bg-brand-soft text-brand-strong' : 'text-ink-muted hover:bg-surface-muted'
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function OfferList({
  offers,
  loading,
  error,
  rangeKm,
  onRetry,
  onWiden,
}: {
  offers: ReturnType<typeof offersForMap>;
  loading: boolean;
  error: string | null;
  rangeKm: number;
  onRetry: () => void;
  onWiden: () => void;
}) {
  if (loading && offers.length === 0) {
    return (
      <div className="space-y-2 p-3" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-ui-md bg-surface-sunken" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <p className="text-sm text-danger">{error}</p>
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Spróbuj ponownie
        </Button>
      </div>
    );
  }
  if (offers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-sunken text-ink-subtle">
          <LuSearchX size={20} aria-hidden />
        </span>
        <p className="text-sm font-medium text-ink">Brak ofert w promieniu {rangeKm} km</p>
        <p className="text-xs text-ink-muted">Zwiększ zasięg albo zmień filtry.</p>
        {rangeKm < 25 && (
          <Button size="sm" variant="secondary" className="mt-2" onClick={onWiden}>
            Pokaż w promieniu 25 km
          </Button>
        )}
      </div>
    );
  }
  return (
    <ul className={cn('divide-y divide-line p-2', loading && 'opacity-60')}>
      {offers.map((offer) => (
        <li key={offer.id}>
          <OfferMapCard offer={offer} className="pr-2" />
        </li>
      ))}
    </ul>
  );
}

/** Brak lokalizacji — spokojna prośba zamiast błędu. Pole miasta jest w panelu obok/nad mapą. */
function NeedLocation({ picker }: { picker: ReturnType<typeof useLocationPicker> }) {
  return (
    <div className="flex h-full items-center justify-center bg-surface-muted p-6">
      <div className="max-w-sm text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
          <LuMapPin size={26} aria-hidden />
        </span>
        <h2 className="text-lg font-semibold text-brand-ink">Podaj lokalizację</h2>
        <p className="mt-1.5 text-sm leading-6 text-ink-muted">
          Wpisz miasto w polu „Gdzie szukasz?” albo użyj GPS — pokażemy oferty w okolicy.
        </p>
        <Button className="mt-5" leftIcon={<FaLocationCrosshairs size={16} />} loading={picker.gpsPending} onClick={picker.requestGps}>
          Użyj mojej lokalizacji
        </Button>
      </div>
    </div>
  );
}

function pluralOffers(count: number): string {
  if (count === 1) return 'oferta';
  const lastTwo = count % 100;
  const last = count % 10;
  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'oferty' : 'ofert';
}

export default function OffersMapPage() {
  return (
    <AuthGuard>
      <OffersMapContent />
    </AuthGuard>
  );
}
