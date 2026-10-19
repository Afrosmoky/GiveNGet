"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LuArrowLeft,
  LuCalendar,
  LuChevronLeft,
  LuChevronRight,
  LuClock,
  LuExpand,
  LuFlag,
  LuHeart,
  LuMapPin,
  LuMessageSquare,
  LuPencil,
  LuPhone,
  LuStore,
  LuUser,
  LuX,
} from "react-icons/lu";
import { getImageUrl } from "../utils/imageUtils";
import { environment } from "../config";
import { authorizedFetch, getUserData } from "../utils/auth";
import { useFavorites } from "../hooks/useFavorites";
import { useErrorContext } from "../context/ErrorContext";
import GoogleMapComponent from "./GoogleMapComponent";
import UserRankBadge from "./UserRankBadge";
import ReserveOfferPanel from "./ReserveOfferPanel";
import { canReserveOffer } from "../types/reservation";
import { categoryIcon } from "./offer/categoryIcons";
import { Badge, Button, Card, IconButton, Price, StatusPill, Textarea, cn } from "./ui";

interface OfferDetails {
  id?: string;
  name: string;
  description: string;
  transactionType: string;
  expiryDate?: string;
  pickupDateFrom?: string;
  pickupDateTo?: string;
  createdAt?: string;
  updatedAt?: string;
  price?: number;
  currency?: string;
  /** Cena przed obniżką; null = bez przeceny. */
  originalPrice?: number | null;
  /** Rabat w % wyliczony w backendzie. */
  discountPercent?: number | null;
  location: string;
  latitude?: number;
  longitude?: number;
  imageUrls: string[];
  sellerId?: number;
  sellerEmail?: string;
  sellerPhoneNumber?: string;
  sellerAvatar?: string;
  sellerName?: string;
  sellerType?: "REGULAR" | "COMPANY";
  sellerRank?: string;
  sellerTrustPoints?: number;
  isFavorite?: boolean;
  categoryId?: number;
  quantity?: number;
  availableQuantity?: number;
}

interface OfferDetailsViewProps {
  offer: OfferDetails;
  isPreview?: boolean;
  onBackToEdit?: () => void;
  previewImageUrls?: string[]; // Dodatkowe URL-e dla podglądu
}

const transactionTypeLabels: Record<string, string> = {
  sale: "Sprzedaż",
  exchange: "Wymiana",
  free: "Za darmo",
};

export default function OfferDetailsView({ offer, isPreview = false, onBackToEdit, previewImageUrls }: OfferDetailsViewProps) {
  const router = useRouter();
  const [imageIndex, setImageIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  // Stan dla modalu zgłaszania oferty
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportExplanation, setReportExplanation] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [showReportSuccess, setShowReportSuccess] = useState(false);

  // Obsługa ulubionych
  const { toggleFavorite, loading } = useFavorites();
  const { addError } = useErrorContext();
  const [localIsFavorite, setLocalIsFavorite] = useState(offer.isFavorite || false);

  // Dostępność w stanie — po rezerwacji panel podnosi tu nową wartość z odpowiedzi backendu
  const [availableQuantity, setAvailableQuantity] = useState(offer.availableQuantity);
  useEffect(() => {
    setAvailableQuantity(offer.availableQuantity);
  }, [offer.availableQuantity]);

  // Sprawdź czy użytkownik jest autorem oferty
  const userData = getUserData();
  const isAuthor = userData?.id === offer.sellerId;
  const isModeratorOrAdmin = userData?.userType === 'EMPLOYEE' || userData?.userType === 'ADMIN';

  // Reguła widoczności rezerwacji wspólna z kafelkiem oferty (types/reservation.ts)
  const canReserve = !isPreview && Boolean(offer.id) && canReserveOffer(userData, offer);

  // Zdjęcia: w podglądzie lokalne URL-e z formularza, inaczej ścieżki z backendu
  const images = isPreview && previewImageUrls ? previewImageUrls : offer.imageUrls.map(url => getImageUrl(url));
  const hasImages = images.length > 0;
  const currentImage = images[imageIndex] ?? images[0];
  const CategoryIcon = categoryIcon(offer.categoryId);

  const showPrev = () => setImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  const showNext = () => setImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));

  const isCompany = offer.sellerType === 'COMPANY';
  const sellerHref = offer.sellerId ? (isCompany ? `/stores/${offer.sellerId}` : `/profile/${offer.sellerId}`) : null;

  // Funkcja do obsługi zgłaszania oferty
  const handleReportOffer = () => {
    setReportExplanation("");
    setShowReportModal(true);
  };

  // Funkcja do obsługi ulubionych
  const handleFavoriteClick = async () => {
    if (!offer.id) return;

    const newFavoriteState = await toggleFavorite(offer.id, localIsFavorite, addError);
    if (newFavoriteState !== undefined) {
      setLocalIsFavorite(newFavoriteState);
    }
  };

  // Funkcja do wysyłania zgłoszenia oferty
  const submitReport = async () => {
    if (!offer.id || !reportExplanation.trim()) return;

    setIsSubmittingReport(true);
    try {
      const response = await authorizedFetch(`${environment.apiUrl}/api/complaint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          explanation: reportExplanation,
          offerId: offer.id
        })
      });

      if (response.status === 201) {
        setShowReportModal(false);
        setReportExplanation("");
        setShowReportSuccess(true);
        // Ukryj powiadomienie po 5 sekundach
        setTimeout(() => setShowReportSuccess(false), 5000);
      } else {
        console.error('Błąd podczas wysyłania zgłoszenia');
      }
    } catch (error) {
      console.error('Błąd podczas wysyłania zgłoszenia:', error);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const galleryNavButton =
    'absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink shadow-card backdrop-blur transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40';

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Mobile: galeria → szczegóły i rezerwacja → opis. Desktop: galeria i opis po lewej, panel po prawej. */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_1fr] lg:gap-8">
          {/* Galeria zdjęć */}
          <section aria-label="Zdjęcia oferty" className="min-w-0 lg:col-start-1 lg:row-start-1">
            <div className="relative aspect-[4/3] overflow-hidden rounded-ui-xl border border-line bg-surface-sunken">
              {hasImages ? (
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="absolute inset-0 cursor-zoom-in"
                  aria-label="Powiększ zdjęcie"
                >
                  <Image
                    src={currentImage}
                    alt={offer.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 720px"
                    className="object-contain"
                    priority
                  />
                </button>
              ) : (
                <div className="flex h-full items-center justify-center bg-brand-soft text-brand/60">
                  <CategoryIcon size={72} strokeWidth={1.25} aria-hidden />
                </div>
              )}

              {/* Wrapper pozycjonuje — IconButton ma własne `relative` (pod licznik), które przebija `absolute` */}
              {hasImages && (
                <div className="absolute right-3 top-3 z-10">
                  <IconButton
                    label="Powiększ zdjęcie"
                    icon={<LuExpand size={18} />}
                    onClick={() => setShowModal(true)}
                    className="bg-surface/90 shadow-card backdrop-blur hover:bg-surface"
                  />
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button type="button" className={cn(galleryNavButton, 'left-3')} onClick={showPrev} aria-label="Poprzednie zdjęcie">
                    <LuChevronLeft size={20} />
                  </button>
                  <button type="button" className={cn(galleryNavButton, 'right-3')} onClick={showNext} aria-label="Następne zdjęcie">
                    <LuChevronRight size={20} />
                  </button>
                  <span className="absolute bottom-3 right-3 z-10 rounded-full bg-neutral-900/70 px-2 py-0.5 text-xs font-medium text-white">
                    {imageIndex + 1} / {images.length}
                  </span>
                </>
              )}
            </div>

            {/* Miniatury */}
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.map((url, idx) => (
                  <button
                    key={`${url}-${idx}`}
                    type="button"
                    onClick={() => setImageIndex(idx)}
                    aria-label={`Wybierz zdjęcie ${idx + 1}`}
                    aria-current={idx === imageIndex ? 'true' : undefined}
                    className={cn(
                      'relative h-16 w-20 shrink-0 overflow-hidden rounded-ui-sm border-2 bg-surface-sunken transition-colors',
                      idx === imageIndex ? 'border-brand' : 'border-transparent hover:border-line-strong'
                    )}
                  >
                    <Image src={url} alt="" fill sizes="80px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Panel: szczegóły, rezerwacja, sprzedawca, lokalizacja */}
          <aside className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start lg:sticky lg:top-[calc(var(--shell-topbar-h)+24px)]">
            <Card padding="lg">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="neutral">{transactionTypeLabels[offer.transactionType] || offer.transactionType}</Badge>
                  {offer.expiryDate && (
                    <Badge tone="neutral" icon={<LuCalendar size={12} aria-hidden />}>
                      Ważne do {offer.expiryDate}
                    </Badge>
                  )}
                </div>
                {!isPreview && (
                  <div className="-mr-2 -mt-1 flex shrink-0 items-center">
                    <IconButton
                      label={localIsFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                      icon={<LuHeart size={20} fill={localIsFavorite ? 'currentColor' : 'none'} />}
                      onClick={handleFavoriteClick}
                      disabled={loading(offer.id || '')}
                      aria-pressed={localIsFavorite}
                      className={cn(localIsFavorite && '!text-danger')}
                    />
                    <IconButton label="Zgłoś ofertę" icon={<LuFlag size={18} />} onClick={handleReportOffer} />
                  </div>
                )}
              </div>

              <h1 className="text-2xl font-semibold leading-tight tracking-tight text-brand-ink">{offer.name}</h1>
              {offer.createdAt && (
                <p className="mt-1 text-xs text-ink-subtle">Dodane {new Date(offer.createdAt).toLocaleDateString()}</p>
              )}

              <div className="mt-4">
                <Price
                  transactionType={offer.transactionType}
                  price={offer.price}
                  currency={offer.currency}
                  originalPrice={offer.originalPrice}
                  discountPercent={offer.discountPercent}
                  size="lg"
                />
              </div>

              <dl className="mt-4 flex flex-col gap-2.5 border-t border-line pt-4 text-sm">
                {typeof availableQuantity === 'number' && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-muted">Dostępność</dt>
                    <dd>
                      {availableQuantity > 0 ? (
                        <StatusPill status="remaining" count={availableQuantity} size="md" />
                      ) : (
                        <StatusPill status="soldout" size="md" />
                      )}
                    </dd>
                  </div>
                )}
                {offer.pickupDateFrom && offer.pickupDateTo && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-ink-muted">
                      <LuClock size={15} aria-hidden /> Odbiór
                    </dt>
                    <dd className="font-medium text-ink">
                      {offer.pickupDateFrom}–{offer.pickupDateTo}
                    </dd>
                  </div>
                )}
                {offer.location && (
                  <div className="flex items-start justify-between gap-3">
                    <dt className="flex shrink-0 items-center gap-1.5 text-ink-muted">
                      <LuMapPin size={15} aria-hidden /> Miejsce
                    </dt>
                    <dd className="min-w-0 text-right font-medium text-ink">{offer.location}</dd>
                  </div>
                )}
                {offer.sellerName && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-muted">Sprzedawca</dt>
                    <dd className="min-w-0">
                      {sellerHref && !isPreview ? (
                        <Link
                          href={sellerHref}
                          className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-brand-soft hover:text-brand-strong"
                        >
                          {isCompany ? <LuStore size={13} aria-hidden /> : <LuUser size={13} aria-hidden />}
                          <span className="truncate">{offer.sellerName}</span>
                        </Link>
                      ) : (
                        <span className="font-medium text-ink">{offer.sellerName}</span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>

              {!isPreview && (
                <div className="mt-5 flex flex-col gap-2">
                  {isModeratorOrAdmin && offer.id && (
                    <Button
                      variant="secondary"
                      fullWidth
                      leftIcon={<LuPencil size={16} />}
                      onClick={() => router.push(`/offers/mod-edit/${offer.id}`)}
                      title="Edytuj ofertę jako moderator"
                    >
                      Edytuj ofertę
                    </Button>
                  )}
                  <Button
                    // Gdy jest rezerwacja, to ona jest główną akcją — czat schodzi na drugi plan
                    variant={canReserve ? 'secondary' : 'primary'}
                    size="lg"
                    fullWidth
                    leftIcon={<LuMessageSquare size={18} />}
                    disabled={isAuthor}
                    title={isAuthor ? 'Nie możesz wysłać wiadomości do siebie' : undefined}
                    onClick={() => {
                      if (!isAuthor && offer.sellerId) {
                        router.push(`/chats?userId=${offer.sellerId}`);
                      }
                    }}
                  >
                    {isAuthor ? 'To Twoja oferta' : 'Wyślij wiadomość'}
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    leftIcon={<LuPhone size={16} />}
                    disabled={!offer.sellerPhoneNumber}
                    title={!offer.sellerPhoneNumber ? 'Sprzedający nie udostępnia numeru telefonu' : (showPhone ? 'Kliknij aby zadzwonić' : 'Kliknij aby zobaczyć numer')}
                    onClick={() => {
                      if (offer.sellerPhoneNumber) {
                        if (showPhone) {
                          // Jeśli numer jest już widoczny, przekieruj do aplikacji do rozmów
                          window.location.href = `tel:${offer.sellerPhoneNumber}`;
                        } else {
                          // Jeśli numer nie jest widoczny, pokaż go
                          setShowPhone(true);
                        }
                      }
                    }}
                  >
                    {offer.sellerPhoneNumber && showPhone ? offer.sellerPhoneNumber : 'Zadzwoń'}
                  </Button>
                </div>
              )}

              {isPreview && onBackToEdit && (
                <Button variant="secondary" size="lg" fullWidth className="mt-5" leftIcon={<LuArrowLeft size={18} />} onClick={onBackToEdit}>
                  Powrót do edycji
                </Button>
              )}
            </Card>

            {canReserve && offer.id && (
              <ReserveOfferPanel
                offerId={offer.id}
                availableQuantity={availableQuantity as number}
                totalQuantity={offer.quantity ?? null}
                onAvailabilityChange={setAvailableQuantity}
              />
            )}

            {/* Sprzedawca */}
            {offer.sellerName && (
              <Card padding="lg" className="flex items-center gap-4">
                <Image
                  src={offer.sellerAvatar ? getImageUrl(offer.sellerAvatar) : "/images/food-image.svg"}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 shrink-0 rounded-full border border-line object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{offer.sellerName}</p>
                  <p className="text-sm text-ink-muted">{isCompany ? 'Firma' : 'Osoba prywatna'}</p>
                  {offer.sellerRank && (
                    <div className="mt-1.5">
                      <UserRankBadge
                        rank={offer.sellerRank}
                        trustPoints={offer.sellerTrustPoints}
                        showPoints={true}
                        size="small"
                        clickable={true}
                      />
                    </div>
                  )}
                  {sellerHref && !isPreview && (
                    <Link href={sellerHref} className="mt-1.5 inline-block text-sm font-medium text-brand hover:underline">
                      {isCompany ? 'Zobacz sklep i jego oferty' : 'Wyświetl profil sprzedającego'}
                    </Link>
                  )}
                </div>
              </Card>
            )}

            {/* Lokalizacja */}
            {offer.latitude && offer.longitude && (
              <Card padding="none" className="overflow-hidden">
                <div className="h-44">
                  <GoogleMapComponent userLocation={{ lat: offer.latitude, lon: offer.longitude }} offers={[]} />
                </div>
                <p className="flex items-center gap-1.5 px-4 py-3 text-sm text-ink-muted">
                  <LuMapPin size={15} aria-hidden className="shrink-0" />
                  <span className="truncate">{offer.location}</span>
                </p>
              </Card>
            )}
          </aside>

          {/* Opis */}
          <Card padding="lg" className="min-w-0 lg:col-start-1 lg:row-start-2 lg:self-start">
            <h2 className="mb-2 text-base font-semibold text-ink">Opis</h2>
            <p className="max-w-prose whitespace-pre-line text-sm leading-relaxed text-ink-muted">{offer.description}</p>
            {offer.id && (
              <div className="mt-5 flex flex-wrap justify-between gap-2 border-t border-line pt-3 text-xs text-ink-subtle">
                <span>ID: {offer.id}</span>
                {offer.createdAt && <span>Dodano: {new Date(offer.createdAt).toLocaleString()}</span>}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal powiększonego zdjęcia */}
      {showModal && hasImages && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Powiększone zdjęcie"
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/80 p-4"
          onClick={() => setShowModal(false)}
        >
          <div className="relative h-[85vh] w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <Image src={currentImage} alt={offer.name} fill sizes="100vw" className="object-contain" />
            <div className="absolute right-2 top-2">
              <IconButton
                label="Zamknij powiększenie"
                icon={<LuX size={20} />}
                onClick={() => setShowModal(false)}
                className="bg-surface/90 hover:bg-surface"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal do zgłaszania oferty */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4">
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            padding="lg"
            className="max-h-[80vh] w-full max-w-lg overflow-auto shadow-pop"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 id="report-title" className="text-lg font-semibold text-ink">Zgłoś ofertę</h3>
              <IconButton label="Zamknij" icon={<LuX size={20} />} onClick={() => setShowReportModal(false)} className="-mr-2" />
            </div>

            {/* Zgłaszana oferta */}
            <div className="mb-4 rounded-ui-md bg-surface-sunken p-4">
              <p className="mb-1 text-xs text-ink-muted">Zgłaszana oferta:</p>
              <p className="text-sm font-medium text-ink">{offer.name}</p>
            </div>

            <Textarea
              label="Wyjaśnienie"
              value={reportExplanation}
              onChange={(e) => setReportExplanation(e.target.value)}
              placeholder="Opisz powód zgłoszenia..."
              rows={4}
            />

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowReportModal(false)}>
                Anuluj
              </Button>
              <Button
                variant="danger"
                onClick={submitReport}
                disabled={!reportExplanation.trim()}
                loading={isSubmittingReport}
              >
                {isSubmittingReport ? 'Wysyłanie...' : 'Zgłoś'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Powiadomienie o sukcesie */}
      {showReportSuccess && (
        <div role="status" className="fixed right-4 top-20 z-50 rounded-ui-md bg-brand px-4 py-3 text-sm font-medium text-brand-contrast shadow-pop">
          Zgłoszenie zostało wysłane pomyślnie
        </div>
      )}
    </>
  );
}
