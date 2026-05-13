"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getImageUrl } from "../utils/imageUtils";
import { environment } from "../config";
import { authorizedFetch, getUserData } from "../utils/auth";
import { useFavorites } from "../hooks/useFavorites";
import { useErrorContext } from "../context/ErrorContext";
import GoogleMapComponent from "./GoogleMapComponent";
import FavoriteHeart from "./FavoriteHeart";
import { FaMagnifyingGlass, FaXmark, FaPhone, FaArrowLeft, FaFlag } from "react-icons/fa6";
import Image from "next/image";
import UserRankBadge from "./UserRankBadge";

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
  const [isMobile, setIsMobile] = useState(false);

  // Sprawdź czy jesteśmy na urządzeniu mobilnym
  useEffect(() => {
    const updateIsMobile = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 640);
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  // Stan dla modalu zgłaszania oferty
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportExplanation, setReportExplanation] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [showReportSuccess, setShowReportSuccess] = useState(false);

  // Obsługa ulubionych
  const { toggleFavorite, loading } = useFavorites();
  const { addError } = useErrorContext();
  const [localIsFavorite, setLocalIsFavorite] = useState(offer.isFavorite || false);

  // Sprawdź czy użytkownik jest autorem oferty
  const userData = getUserData();
  const isAuthor = userData?.id === offer.sellerId;
  const isModeratorOrAdmin = userData?.userType === 'EMPLOYEE' || userData?.userType === 'ADMIN';

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

  return (
    <>
      <div className={`w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 md:gap-12 items-start bg-[#f7fafc] min-h-screen py-6 px-2 md:px-8 ${isMobile ? 'pb-32' : ''}`}>
        {/* Prawa kolumna: szczegóły ogłoszenia, sprzedawca, lokalizacja (na mobile na górze) */}
        <div className="flex flex-col gap-6 w-full md:max-w-xs order-1 md:order-2 md:sticky md:top-28">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {offer.createdAt && (
              <div className="text-gray-500 text-xs mb-2">Dodane {new Date(offer.createdAt).toLocaleDateString()}</div>
            )}
            <div className="flex justify-between items-start mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{offer.name}</h1>
              <div className="flex items-center gap-2">
                {!isPreview && (
                  <FavoriteHeart
                    isFavorite={localIsFavorite}
                    onClick={handleFavoriteClick}
                    loading={loading(offer.id || '')}
                    size={20}
                  />
                )}
                {!isPreview && (
                  <button
                    onClick={handleReportOffer}
                    className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="Zgłoś ogłoszenie"
                    type="button"
                  >
                    <FaFlag size={16} />
                    <span className="text-sm font-medium">Zgłoś</span>
                  </button>
                )}
              </div>
            </div>
            {offer.transactionType !== 'free' && offer.price && offer.currency ? (
              <div className="text-3xl font-extrabold text-yellow-500 mb-2">
                {offer.price} {offer.currency}
                {offer.transactionType === 'sale' && <span className="text-base font-normal text-gray-500 ml-2">Do negocjacji</span>}
              </div>
            ) : null}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full mr-2">
                {transactionTypeLabels[offer.transactionType] || offer.transactionType}
              </span>
              {offer.expiryDate && (
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full ml-0">
                  Ważne do: {offer.expiryDate}
                </span>
              )}
            </div>
            {offer.pickupDateFrom && offer.pickupDateTo && (
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-1">Godziny odbioru:</div>
                <div className="text-sm font-medium text-gray-900">
                  {offer.pickupDateFrom} - {offer.pickupDateTo}
                </div>
              </div>
            )}
            {!isPreview && (
              <div className="flex flex-col gap-2">
                {isModeratorOrAdmin && offer.id && (
                  <button
                    onClick={() => router.push(`/offers/mod-edit/${offer.id}`)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    title="Edytuj ofertę jako moderator"
                    type="button"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edytuj ofertę</span>
                  </button>
                )}
                <button 
                  className={`w-full font-bold py-3 rounded-lg transition mb-2 ${
                    isAuthor 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-yellow-400 hover:bg-yellow-500 text-gray-900'
                  }`}
                  onClick={() => {
                    if (!isAuthor && offer.sellerId) {
                      router.push(`/chats?userId=${offer.sellerId}`);
                    }
                  }}
                  disabled={isAuthor}
                  title={isAuthor ? 'Nie możesz wysłać wiadomości do siebie' : ''}
                  type="button"
                >
                  {isAuthor ? 'To Twoja oferta' : 'Wyślij wiadomość'}
                </button>
                <button
                  className="w-full border border-gray-300 text-gray-900 font-bold py-3 rounded-lg transition hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed relative flex items-center justify-center gap-2"
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
                  type="button"
                >
                  {offer.sellerPhoneNumber && showPhone ? (
                    <>
                      <FaPhone className="text-yellow-500" />
                      <span>{offer.sellerPhoneNumber}</span>
                    </>
                  ) : (
                    <>Zadzwoń</>
                  )}
                  {/* Tooltip */}
                  {!offer.sellerPhoneNumber && (
                    <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20">
                      Sprzedający nie udostępnia numeru telefonu
                    </span>
                  )}
                </button>
              </div>
            )}
            {isPreview && onBackToEdit && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={onBackToEdit}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <FaArrowLeft />
                  Powrót do edycji
                </button>
              </div>
            )}
          </div>

          {/* Sprzedawca */}
          {offer.sellerName && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex gap-4 items-center">
              <Image
                src={offer.sellerAvatar ? getImageUrl(offer.sellerAvatar) : "/images/food-image.svg"}
                alt={offer.sellerName}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover border border-gray-200"
              />
              <div>
                <div className="font-bold text-gray-900">{offer.sellerName}</div>
                <div className="text-gray-500 text-sm">{offer.sellerType === 'COMPANY' ? 'Firma' : 'Osoba prywatna'}</div>
                <div className="text-gray-500 text-xs">{offer.sellerPhoneNumber}</div>
                
                {/* Ranga sprzedawcy */}
                {offer.sellerRank && (
                  <div className="mt-2">
                    <UserRankBadge 
                      rank={offer.sellerRank} 
                      trustPoints={offer.sellerTrustPoints}
                      showPoints={true}
                      size="small"
                      clickable={true}
                    />
                  </div>
                )}
                {offer.sellerId && (
                  <button
                    className="mt-3 text-yellow-500 hover:underline font-medium text-xs"
                    onClick={() => router.push(`/profile/${offer.sellerId}`)}
                    type="button"
                  >
                    Wyświetl profil sprzedającego
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Lokalizacja */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex gap-4 items-center">
            <div>
              <div className="font-bold text-gray-900 mb-1">Lokalizacja</div>
              <div className="text-gray-500 text-sm">{offer.location}</div>
            </div>
            {offer.latitude && offer.longitude && (
              <div className="ml-auto">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-yellow-400 flex items-center justify-center bg-gray-50">
                  <GoogleMapComponent
                    userLocation={{ lat: offer.latitude, lon: offer.longitude }}
                    offers={[]}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Lewa kolumna: galeria + opis */}
        <div className="md:col-span-2 w-full max-w-2xl mx-0 flex flex-col gap-6 order-2 md:order-1">
          {/* Galeria zdjęć */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col items-center p-6">
            <div className="w-full flex justify-center items-center relative h-[250px]">
              <Image
                src={isPreview && previewImageUrls 
                  ? (previewImageUrls[imageIndex] || "/images/food-image.svg")
                  : (offer.imageUrls[imageIndex] ? getImageUrl(offer.imageUrls[imageIndex]) : "/images/food-image.svg")
                }
                alt={offer.name}
                width={600}
                height={250}
                className="object-contain rounded-lg h-full w-full bg-gray-50"
                style={{ cursor: 'zoom-in', maxWidth: 600 }}
                onClick={() => setShowModal(true)}
              />
              {/* Przycisk powiększania */}
              <button
                className="absolute top-3 right-3 bg-white/80 hover:bg-yellow-400 text-gray-700 rounded-full p-2 shadow transition z-10"
                onClick={() => setShowModal(true)}
                aria-label="Powiększ zdjęcie"
                type="button"
              >
                <FaMagnifyingGlass size={20} />
              </button>
              {(isPreview ? (previewImageUrls?.length || 0) : offer.imageUrls.length) > 1 && (
                <>
                  <button
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-yellow-400 text-gray-700 rounded-full p-2 shadow transition"
                    onClick={() => {
                      const totalImages = isPreview ? (previewImageUrls?.length || 0) : offer.imageUrls.length;
                      setImageIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
                    }}
                    aria-label="Poprzednie zdjęcie"
                  >
                    &#60;
                  </button>
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-yellow-400 text-gray-700 rounded-full p-2 shadow transition"
                    onClick={() => {
                      const totalImages = isPreview ? (previewImageUrls?.length || 0) : offer.imageUrls.length;
                      setImageIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
                    }}
                    aria-label="Następne zdjęcie"
                  >
                    &#62;
                  </button>
                </>
              )}
              {/* Kółka nawigacji */}
              {(isPreview ? (previewImageUrls?.length || 0) : offer.imageUrls.length) > 1 && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-4 flex gap-2">
                  {(isPreview ? (previewImageUrls || []) : offer.imageUrls).map((url, idx) => (
                    <button
                      key={url}
                      className={`w-4 h-4 rounded-full border-2 ${idx === imageIndex ? 'border-yellow-400 bg-yellow-400' : 'border-gray-300 bg-gray-200'} transition`}
                      onClick={() => setImageIndex(idx)}
                      aria-label={`Wybierz zdjęcie ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Opis */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-10">
            <div className="font-bold text-lg text-gray-900 mb-2 text-left">Opis</div>
            <div className="text-gray-700 whitespace-pre-line mb-2 text-left max-w-prose mx-0">{offer.description}</div>
            {offer.id && (
              <div className="text-xs text-gray-400 mt-4 flex justify-between">
                <span>ID: {offer.id}</span>
                {offer.createdAt && (
                  <span>Dodano: {new Date(offer.createdAt).toLocaleString()}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Modal powiększonego zdjęcia */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowModal(false)}>
          <div className="relative max-w-3xl w-full flex justify-center items-center" onClick={e => e.stopPropagation()}>
            <Image
              src={isPreview && previewImageUrls 
                ? (previewImageUrls[imageIndex] || "/images/food-image.svg")
                : (offer.imageUrls[imageIndex] ? getImageUrl(offer.imageUrls[imageIndex]) : "/images/food-image.svg")
              }
              alt={offer.name}
              width={900}
              height={900}
              className="object-contain rounded-lg max-h-[90vh] w-full bg-white"
              style={{ maxWidth: 900 }}
            />
            <button
              className="absolute top-2 right-2 bg-white/90 hover:bg-yellow-400 text-gray-700 rounded-full p-2 shadow transition"
              onClick={() => setShowModal(false)}
              aria-label="Zamknij powiększenie"
              type="button"
            >
              <FaXmark size={22} />
            </button>
          </div>
        </div>
      )}

      {/* Modal do zgłaszania oferty */}
      {showReportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            maxWidth: 500,
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Zgłoś ogłoszenie</h3>
              <button
                onClick={() => setShowReportModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            {/* Zgłaszane ogłoszenie */}
            <div style={{
              background: '#f3f4f6',
              padding: 16,
              borderRadius: 8,
              marginBottom: 20
            }}>
              <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                Zgłaszane ogłoszenie:
              </div>
              <div style={{ fontSize: 15, color: '#23272f', fontWeight: 500 }}>
                {offer.name}
              </div>
            </div>

            {/* Formularz */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                marginBottom: 8,
                fontSize: 14,
                fontWeight: 500,
                color: '#23272f'
              }}>
                Wyjaśnienie:
              </label>
              <textarea
                value={reportExplanation}
                onChange={(e) => setReportExplanation(e.target.value)}
                placeholder="Opisz powód zgłoszenia..."
                style={{
                  width: '100%',
                  minHeight: 100,
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
            </div>

            {/* Przyciski */}
            <div style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowReportModal(false)}
                style={{
                  background: '#f3f4f6',
                  color: '#23272f',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Anuluj
              </button>
              <button
                onClick={submitReport}
                disabled={!reportExplanation.trim() || isSubmittingReport}
                style={{
                  background: reportExplanation.trim() && !isSubmittingReport ? '#ef4444' : '#f3f4f6',
                  color: reportExplanation.trim() && !isSubmittingReport ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: reportExplanation.trim() && !isSubmittingReport ? 'pointer' : 'not-allowed'
                }}
              >
                {isSubmittingReport ? 'Wysyłanie...' : 'Zgłoś'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Powiadomienie o sukcesie */}
      {showReportSuccess && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: '#10b981',
          color: 'white',
          padding: '12px 20px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 500,
          zIndex: 1001,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          Zgłoszenie zostało wysłane pomyślnie
        </div>
      )}
    </>
  );
} 