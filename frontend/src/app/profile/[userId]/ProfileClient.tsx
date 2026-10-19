"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { LuChevronRight, LuLayoutGrid, LuList, LuMapPin, LuMessageSquare, LuStar, LuStore } from 'react-icons/lu';
import { getImageUrl } from '../../../utils/imageUtils';
import { environment } from '../../../config';
import { authorizedFetch, trackOfferClick } from '../../../utils/auth';
import OfferTile from '../../../components/OfferTile';
import { OfferTile as OfferTileType } from '../../../types/offer';
import { StarInput, StarRating } from '../../../components/rating/Stars';
import { Alert, Avatar, Badge, Button, Card, CardHeader, Dialog, IconButton, Spinner, Textarea, cn, pageContainer } from '../../../components/ui';

const GoogleMapComponent = dynamic(() => import('../../../components/GoogleMapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-surface-muted">
      <Spinner className="h-5 w-5 text-brand" label="Ładowanie mapy" />
    </div>
  ),
});

type RatingCategory = 'cleanliness' | 'quality' | 'transactionRating';

const CATEGORIES: { key: RatingCategory; label: string; stat: 'cleanliness' | 'quality' | 'transaction' }[] = [
  { key: 'cleanliness', label: 'Czystość', stat: 'cleanliness' },
  { key: 'quality', label: 'Jakość', stat: 'quality' },
  { key: 'transactionRating', label: 'Transakcja', stat: 'transaction' },
];

const STAR_WORDS = ['One', 'Two', 'Three', 'Four', 'Five'] as const;

const TRANSACTION_LABEL: Record<string, string> = { free: 'Za darmo', sale: 'Na sprzedaż', exchange: 'Wymiana' };

const OFFER_GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-4';

function opinionsLabel(count: number) {
  if (count === 0) return 'Brak opinii';
  if (count === 1) return '1 opinia';
  const lastTwo = count % 100;
  const last = count % 10;
  return `${count} ${last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'opinie' : 'opinii'}`;
}


export interface UserProfileData {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  location?: string | null;
  lat: number;
  lon: number;
  userType: string;
  id: string; // Added for rate submission
}

export interface RateData {
  rate: number;
  count: number;
}

export interface NewRateData {
  cleanliness: number;
  quality: number;
  transactionRating: number;
  averageRating: number;
  comment: string;
  createdAt: string;
}

export interface NewStarStats {
  cleanlinessOneStarCount: number;
  cleanlinessTwoStarCount: number;
  cleanlinessThreeStarCount: number;
  cleanlinessFourStarCount: number;
  cleanlinessFiveStarCount: number;
  qualityOneStarCount: number;
  qualityTwoStarCount: number;
  qualityThreeStarCount: number;
  qualityFourStarCount: number;
  qualityFiveStarCount: number;
  transactionOneStarCount: number;
  transactionTwoStarCount: number;
  transactionThreeStarCount: number;
  transactionFourStarCount: number;
  transactionFiveStarCount: number;
}

const EMPTY_STATS: NewStarStats = {
  cleanlinessOneStarCount: 0,
  cleanlinessTwoStarCount: 0,
  cleanlinessThreeStarCount: 0,
  cleanlinessFourStarCount: 0,
  cleanlinessFiveStarCount: 0,
  qualityOneStarCount: 0,
  qualityTwoStarCount: 0,
  qualityThreeStarCount: 0,
  qualityFourStarCount: 0,
  qualityFiveStarCount: 0,
  transactionOneStarCount: 0,
  transactionTwoStarCount: 0,
  transactionThreeStarCount: 0,
  transactionFourStarCount: 0,
  transactionFiveStarCount: 0
};

export default function ProfileClient({ userData, offers, rate }: { userData: UserProfileData, offers: OfferTileType[], rate: RateData }) {
  const [view, setView] = useState<'tiles' | 'list'>('tiles');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showOpinionsModal, setShowOpinionsModal] = useState(false);
  const [opinions, setOpinions] = useState<NewRateData[]>([]);
  const [loadingOpinions, setLoadingOpinions] = useState(false);
  const [errorOpinions, setErrorOpinions] = useState<string | null>(null);
  const [starStats, setStarStats] = useState<NewStarStats>(EMPTY_STATS);
  const [selectedRatings, setSelectedRatings] = useState<Record<RatingCategory, number>>({
    cleanliness: 0,
    quality: 0,
    transactionRating: 0
  });
  const [selectedStarsFilter, setSelectedStarsFilter] = useState<{ category: RatingCategory, stars: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingNextPage, setLoadingNextPage] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const fetchingOpinionsRef = useRef<string | null>(null);
  useEffect(() => {
    const updateIsMobile = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 640);
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  // Automatycznie ustaw widok na listę na urządzeniach mobilnych
  useEffect(() => {
    if (isMobile && view === 'tiles') {
      setView('list');
    }
  }, [isMobile, view]);

  const ratingComplete = selectedRatings.cleanliness > 0 && selectedRatings.quality > 0 && selectedRatings.transactionRating > 0;

  const handleOpenRatingModal = () => {
    setSubmitError(null);
    setShowRatingModal(true);
  };

  const handleSubmitRating = async () => {
    if (!ratingComplete) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const body = {
        cleanliness: selectedRatings.cleanliness,
        quality: selectedRatings.quality,
        transactionRating: selectedRatings.transactionRating,
        comment: comment.trim() || null,
        userId: userData.id
      };
      const response = await authorizedFetch(`${environment.apiUrl}/api/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        throw new Error('Błąd podczas wysyłania opinii');
      }
      setShowRatingModal(false);
      setSelectedRatings({ cleanliness: 0, quality: 0, transactionRating: 0 });
      setComment('');
      // TODO: Odświeżenie danych po wysłaniu oceny
    } catch (error) {
      console.error('Błąd wysyłania oceny:', error);
      setSubmitError('Nie udało się wysłać opinii. Spróbuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowRatingModal(false);
    setSelectedRatings({ cleanliness: 0, quality: 0, transactionRating: 0 });
    setComment('');
    setSubmitError(null);
  };

  const fetchOpinions = async (stars?: number, page: number = 0, append = false) => {
    // Zapobiegaj podwójnym zapytaniom dla tego samego requestu
    const requestKey = `${stars}-${page}-${append}`;
    if (fetchingOpinionsRef.current === requestKey) return;

    fetchingOpinionsRef.current = requestKey;
    if (page > 0) setLoadingNextPage(true);
    else setLoadingOpinions(true);
    setErrorOpinions(null);
    try {
      let url = `${environment.apiUrl}/api/rates?userId=${userData.id}`;
      if (stars) url += `&stars=${stars}`;
      url += `&page=${page}`;
      const response = await authorizedFetch(url);
      if (!response.ok) throw new Error('Błąd pobierania opinii');
      const data = await response.json();
      const stats = { ...EMPTY_STATS };
      (Object.keys(stats) as (keyof NewStarStats)[]).forEach((key) => {
        stats[key] = data[key] || 0;
      });
      setStarStats(stats);
      setCurrentPage(data.currentPage ?? 0);
      setTotalPages(data.totalPages ?? 1);
      if (append) {
        setOpinions(prev => [...prev, ...(Array.isArray(data.ratesList) ? data.ratesList : [])]);
      } else {
        setOpinions(Array.isArray(data.ratesList) ? data.ratesList : []);
      }
    } catch {
      setErrorOpinions('Nie udało się pobrać opinii.');
      setStarStats(EMPTY_STATS);
      setOpinions([]);
    } finally {
      setLoadingOpinions(false);
      setLoadingNextPage(false);
      fetchingOpinionsRef.current = null;
    }
  };

  const handleOpenOpinionsModal = async () => {
    setShowOpinionsModal(true);
    setSelectedStarsFilter(null);
    setCurrentPage(0);
    setTotalPages(1);
    setOpinions([]);
    await fetchOpinions(undefined, 0, false);
  };

  const handleFilterByStars = async (category: RatingCategory, stars: number) => {
    const newFilter = { category, stars };
    setCurrentPage(0);
    setTotalPages(1);
    setOpinions([]);
    if (selectedStarsFilter?.category === category && selectedStarsFilter?.stars === stars) {
      setSelectedStarsFilter(null);
      await fetchOpinions(undefined, 0, false);
    } else {
      setSelectedStarsFilter(newFilter);
      await fetchOpinions(stars, 0, false);
    }
  };

  const handleCloseOpinionsModal = () => {
    setShowOpinionsModal(false);
    setOpinions([]);
    setErrorOpinions(null);
    setSelectedStarsFilter(null);
    setCurrentPage(0);
    setTotalPages(1);
  };

  const loadMoreOpinions = () => fetchOpinions(selectedStarsFilter?.stars ?? undefined, currentPage + 1, true);

  const hasLocation = Boolean(userData.lat && userData.lon);
  const isCompany = userData.userType === 'COMPANY';

  return (
    <div className={cn(pageContainer, 'py-6 sm:py-8')}>
      {/* Wizytówka */}
      <Card padding="lg" className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {userData.logoUrl ? (
            <Image
              src={getImageUrl(userData.logoUrl)}
              alt=""
              width={80}
              height={80}
              className="h-16 w-16 shrink-0 rounded-full border border-line object-cover sm:h-20 sm:w-20"
            />
          ) : (
            <Avatar name={userData.name} size="lg" className="!h-16 !w-16 !text-xl sm:!h-20 sm:!w-20" />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-xl font-semibold tracking-tight text-brand-ink sm:text-2xl">{userData.name}</h1>
              <Badge tone={isCompany ? 'brand' : 'neutral'}>{isCompany ? 'Firma' : 'Osoba prywatna'}</Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <StarRating value={rate.rate} />
              <span className="font-medium text-ink">{rate.count > 0 ? rate.rate.toFixed(1) : ''}</span>
              <button type="button" onClick={handleOpenOpinionsModal} className="text-ink-muted underline-offset-2 hover:text-ink hover:underline">
                {opinionsLabel(rate.count)}
              </button>
            </div>
            {userData.location && (
              <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-muted">
                <LuMapPin size={14} className="mt-0.5 shrink-0" aria-hidden />
                <span className="break-words">{userData.location}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 sm:shrink-0">
          <Button variant="secondary" leftIcon={<LuMessageSquare size={16} />} onClick={handleOpenOpinionsModal} className="flex-1 sm:flex-none">
            Opinie
          </Button>
          <Button leftIcon={<LuStar size={16} />} onClick={handleOpenRatingModal} className="flex-1 sm:flex-none">
            Wystaw opinię
          </Button>
        </div>
      </Card>

      {/* Konto firmowe: aktualne oferty i dane sklepu żyją na stronie sklepu; tu zostają opinie */}
      {isCompany && (
        <Link
          href={`/stores/${userData.id}`}
          className="mt-4 flex items-center gap-3 rounded-ui-lg border border-brand/20 bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-strong transition-colors hover:bg-brand-soft/70"
        >
          <LuStore size={18} aria-hidden />
          <span className="flex-1">Zobacz sklep i jego aktualne oferty</span>
          <LuChevronRight size={18} aria-hidden />
        </Link>
      )}

      {(userData.description || hasLocation) && (
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_340px]">
          {userData.description ? (
            <Card padding="lg">
              <CardHeader title="Opis" className="mb-2" />
              <p className="whitespace-pre-line break-words text-sm text-ink">{userData.description}</p>
            </Card>
          ) : (
            <div className="hidden md:block" />
          )}
          {hasLocation && (
            <Card padding="none" className="overflow-hidden">
              <div className="h-48">
                <GoogleMapComponent userLocation={{ lat: userData.lat, lon: userData.lon }} offers={[]} zoom={13} />
              </div>
              {userData.location && (
                <p className="flex items-start gap-1.5 border-t border-line px-4 py-3 text-sm text-ink-muted">
                  <LuMapPin size={14} className="mt-0.5 shrink-0" aria-hidden />
                  {userData.location}
                </p>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Oferty */}
      <Card padding="lg" className="mt-4">
        <CardHeader
          title={`Oferty${offers?.length ? ` (${offers.length})` : ''}`}
          actions={
            !isMobile && offers?.length > 0 ? (
              <div className="flex gap-1 rounded-ui-md border border-line bg-surface p-0.5">
                <IconButton label="Widok kafelków" icon={<LuLayoutGrid size={18} />} active={view === 'tiles'} onClick={() => setView('tiles')} className="h-8 w-8" />
                <IconButton label="Widok listy" icon={<LuList size={18} />} active={view === 'list'} onClick={() => setView('list')} className="h-8 w-8" />
              </div>
            ) : undefined
          }
        />
        {offers && offers.length > 0 ? (
          view === 'tiles' ? (
            <div className={OFFER_GRID}>
              {offers.map((offer) => (
                <OfferTile key={offer.id} {...offer} />
              ))}
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {offers.map((offer) => (
                <li key={offer.id}>
                  <Link
                    href={`/offers/${offer.id}/${encodeURIComponent(offer.name)}`}
                    onClick={() => trackOfferClick(offer.id)}
                    className="flex items-center gap-3 rounded-ui-lg border border-line bg-surface p-3 transition-shadow hover:border-line-strong hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-ui-md bg-brand-soft sm:w-24">
                      <Image src={getImageUrl(offer.imageUrl)} alt="" fill sizes="96px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{offer.name}</p>
                      {offer.location && <p className="truncate text-sm text-ink-muted">{offer.location}</p>}
                      <Badge tone="brand" className="mt-1.5">{TRANSACTION_LABEL[offer.transactionType] ?? 'Wymiana'}</Badge>
                    </div>
                    <LuChevronRight size={18} className="shrink-0 text-ink-subtle" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="py-8 text-center text-sm text-ink-muted">Brak ofert.</p>
        )}
      </Card>

      {/* Wystawianie opinii */}
      <Dialog
        open={showRatingModal}
        onClose={handleCloseModal}
        title="Wystaw opinię"
        description={userData.name}
        footer={
          <>
            <Button variant="secondary" onClick={handleCloseModal} disabled={isSubmitting}>
              Anuluj
            </Button>
            <Button onClick={handleSubmitRating} disabled={!ratingComplete || isSubmitting} loading={isSubmitting}>
              {isSubmitting ? 'Wysyłanie…' : 'Wystaw opinię'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {CATEGORIES.map(({ key, label }) => (
            <div key={key} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-ink">{label}</span>
              <StarInput
                label={label}
                value={selectedRatings[key]}
                onChange={(value) => setSelectedRatings((prev) => ({ ...prev, [key]: value }))}
              />
            </div>
          ))}
          <Textarea
            label="Komentarz (opcjonalnie)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Napisz swoją opinię..."
            maxLength={255}
            rows={4}
            hint={`${comment.length}/255 znaków`}
          />
          {submitError && <Alert tone="danger">{submitError}</Alert>}
          <Alert tone="warning">To funkcjonalność testowa. Docelowo ocenę będzie można wystawić tylko po skorzystaniu z oferty.</Alert>
        </div>
      </Dialog>

      {/* Opinie */}
      <Dialog open={showOpinionsModal} onClose={handleCloseOpinionsModal} title="Opinie" description={userData.name} size="lg">
        {/* Rozkład ocen per kategoria — klik filtruje listę po liczbie gwiazdek */}
        <div className="grid grid-cols-3 gap-x-2 gap-y-1">
          {CATEGORIES.map(({ key, label }) => (
            <p key={key} className="pb-1 text-center text-xs font-semibold text-ink-muted">
              {label}
            </p>
          ))}
          {[5, 4, 3, 2, 1].map((star) =>
            CATEGORIES.map(({ key, stat }) => {
              const count = starStats[`${stat}${STAR_WORDS[star - 1]}StarCount` as keyof NewStarStats];
              const active = selectedStarsFilter?.category === key && selectedStarsFilter?.stars === star;
              return (
                <button
                  key={`${key}-${star}`}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleFilterByStars(key, star)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-ui-sm px-1 py-1 text-xs transition-colors',
                    active ? 'bg-brand-soft text-brand-strong' : 'text-ink hover:bg-surface-muted'
                  )}
                >
                  <StarRating value={star} size={isMobile ? 10 : 13} />
                  <span className="min-w-[1.25rem] text-left tabular-nums">{count}</span>
                </button>
              );
            })
          )}
        </div>

        <div className="mt-4 border-t border-line pt-4">
          {loadingOpinions ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-6 w-6 text-brand" label="Wczytywanie opinii" />
            </div>
          ) : errorOpinions ? (
            <Alert tone="danger">{errorOpinions}</Alert>
          ) : opinions.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">Brak opinii.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {opinions.map((op, idx) => (
                <li key={idx} className="flex flex-col gap-3 rounded-ui-lg bg-surface-muted p-4 sm:flex-row sm:gap-5">
                  <div className="flex shrink-0 flex-col gap-1 sm:w-52">
                    <p className="text-xs text-ink-subtle">
                      {new Date(op.createdAt).toLocaleDateString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                    </p>
                    {CATEGORIES.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="w-20 text-xs text-ink-muted">{label}</span>
                        <StarRating value={op[key]} size={14} />
                      </div>
                    ))}
                  </div>
                  <p className="min-w-0 flex-1 break-words text-sm text-ink">
                    {op.comment || <span className="italic text-ink-subtle">Bez komentarza</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {!loadingOpinions && !errorOpinions && currentPage + 1 < totalPages && (
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" onClick={loadMoreOpinions} loading={loadingNextPage}>
                Pokaż więcej opinii
              </Button>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
