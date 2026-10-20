"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { environment } from '../../../../config';
import { authorizedFetch } from '../../../../utils/auth';
import { AuthGuard } from '../../../../components/AuthGuard';
import { OfferForm } from '../../../../components/OfferForm';
import { OfferDetails } from '../../../../types/offerDetails';
import { TransactionType, OfferStatus, STATUS_LABELS } from '../../../../types/offer';
import { describeApiError, parseApiError } from '../../../../utils/apiErrors';
import { LuCircleAlert, LuCircleCheck, LuTriangleAlert } from 'react-icons/lu';
import { Badge, Button, Card, Spinner, cn } from '../../../../components/ui';
import { usePageFrame } from '../../../../components/shell/usePageFrame';

interface OfferFormData {
  categoryId: number;
  subcategoryId: number;
  name: string;
  location: string;
  lat?: number;
  lon?: number;
  coordinates?: string;
  description: string;
  offerType: TransactionType;
  price?: string;
  currency?: string;
  originalPrice?: string;
  pickupTimeFrom: string;
  pickupTimeTo: string;
  expiryDate: Date | null;
  images: File[];
  existingImages?: string[];
  originalImages?: string[];
}

/**
 * Dane oferty z /api/offer/details → stan formularza. Czysta funkcja (poza komponentem),
 * żeby initialData dało się zmemoizować — OfferForm pobiera kategorie przy każdej zmianie initialData.
 */
function transformOfferToFormData(offer: OfferDetails): Partial<OfferFormData> {
  return {
    name: offer.name,
    location: offer.location,
    lat: offer.latitude,
    lon: offer.longitude,
    coordinates: `${offer.longitude},${offer.latitude}`,
    description: offer.description,
    offerType: offer.transactionType as TransactionType,
    // Cena wczytywana do formularza — bez tego edycja oferty sprzedażowej
    // czyściłaby jej cenę albo wymagała wpisania jej od nowa
    price: offer.price != null ? String(offer.price) : "",
    currency: offer.currency || "PLN",
    originalPrice: offer.originalPrice != null ? String(offer.originalPrice) : "",
    pickupTimeFrom: offer.pickupDateFrom || '00:00',
    pickupTimeTo: offer.pickupDateTo || '23:59',
    expiryDate: offer.expiryDate ? (() => {
      const date = new Date(offer.expiryDate);
      console.log('Konwertuję expiryDate:', offer.expiryDate, 'na:', date);
      return isNaN(date.getTime()) ? null : date;
    })() : null,
    existingImages: offer.imageUrls,
    originalImages: offer.imageUrls, // Dodane: oryginalne obrazy do porównania
    // Kategoria i podkategoria z backendu — formularz startuje od razu w szczegółach
    categoryId: offer.categoryId ?? 0,
    subcategoryId: offer.subcategoryId ?? 0
  };
}

function EditOfferPageContent() {
  const params = useParams();
  const router = useRouter();
  const { offerId } = params as { offerId: string };
  
  const { column: pageColumn } = usePageFrame();
  const [offer, setOffer] = useState<OfferDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await authorizedFetch(`${environment.apiUrl}/api/offer/details/${offerId}`);
        
        if (response.ok) {
          const data = await response.json();
          setOffer(data);
        } else {
          setError('Błąd pobierania oferty');
        }
      } catch (error) {
        console.error('Błąd połączenia:', error);
        setError('Błąd połączenia z serwerem');
      } finally {
        setLoading(false);
      }
    };

    if (offerId) {
      fetchOffer();
    }
  }, [offerId]);

  const handleStatusChange = async () => {
    if (!offer) return;

    try {
      setStatusLoading(true);
      setError(null);

      const newStatus: OfferStatus = offer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      
      const response = await authorizedFetch(`${environment.apiUrl}/api/offer/${offerId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus
        })
      });

      if (response.ok) {
        // Aktualizuj lokalny stan oferty
        setOffer(prev => prev ? { ...prev, status: newStatus } : null);
        
        setSubmitMessage({
          type: 'success',
          text: `Oferta została ${newStatus === 'ACTIVE' ? 'aktywowana' : 'dezaktywowana'} pomyślnie`
        });
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Błąd zmiany statusu oferty');
      }
    } catch (error) {
      console.error('Błąd podczas zmiany statusu:', error);
      setSubmitMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Błąd zmiany statusu oferty'
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSubmit = async (formData: OfferFormData, isPreview: boolean = false) => {
    if (isPreview) {
      // Implementacja podglądu
      console.log('Podgląd oferty:', formData);
      setSubmitMessage({
        type: 'success',
        text: 'Podgląd oferty został wygenerowany. Sprawdź konsolę przeglądarki (F12) aby zobaczyć szczegóły.'
      });
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('categoryId', formData.categoryId.toString());
      if (formData.subcategoryId && formData.subcategoryId !== 0) {
        formDataToSend.append('subcategoryId', formData.subcategoryId.toString());
      }
      formDataToSend.append('name', formData.name);
      formDataToSend.append('location', formData.location);
      if (formData.lat) formDataToSend.append('lat', formData.lat.toString());
      if (formData.lon) formDataToSend.append('lon', formData.lon.toString());
      if (formData.coordinates) formDataToSend.append('coordinates', formData.coordinates);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('offerType', formData.offerType);
      // Cena tylko dla ofert sprzedażowych — dla pozostałych typów backend odrzuca
      // price/currency jako PRICE_NOT_ALLOWED_FOR_FREE
      if (formData.offerType === 'sale') {
        if (formData.price) {
          formDataToSend.append('price', formData.price.trim().replace(',', '.'));
        }
        formDataToSend.append('currency', formData.currency || 'PLN');
        // Edycja: brak pola = bez zmian (kontrakt dla klientów, którzy nie znają przeceny),
        // więc opróżnione pole wysyłamy jako jawne usunięcie przeceny
        if (formData.originalPrice?.trim()) {
          formDataToSend.append('originalPrice', formData.originalPrice.trim().replace(',', '.'));
        } else {
          formDataToSend.append('clearOriginalPrice', 'true');
        }
      }
      formDataToSend.append('pickupTimeFrom', formData.pickupTimeFrom);
      formDataToSend.append('pickupTimeTo', formData.pickupTimeTo);
      if (formData.expiryDate) {
        formDataToSend.append('expiryDate', formData.expiryDate.toISOString().split('T')[0]);
      }
      
      // Dodaj nowe obrazy
      formData.images.forEach((image) => {
        formDataToSend.append('images', image);
      });

      // Dodaj informacje o zachowanych obrazach
      if (formData.existingImages && formData.existingImages.length > 0) {
        formData.existingImages.forEach((imageUrl) => {
          formDataToSend.append('existingImages', imageUrl);
        });
      }

      // Dodaj informacje o usuniętych obrazach
      const removedImages = formData.originalImages?.filter(
        originalImage => !formData.existingImages?.includes(originalImage)
      ) || [];
      
      removedImages.forEach((imageUrl) => {
        formDataToSend.append('removedImages', imageUrl);
      });

      const response = await authorizedFetch(`${environment.apiUrl}/api/offer/${offerId}`, {
        method: 'PUT',
        body: formDataToSend
      });

      if (response.ok) {
        // Pobierz tekst odpowiedzi
        const responseText = await response.text();
        
        // Pokaż komunikat sukcesu
        setSubmitMessage({
          type: 'success',
          text: responseText || 'Oferta została zaktualizowana pomyślnie'
        });
        
        // Przekieruj po 2 sekundach na profil do zakładki "My offers"
        setTimeout(() => {
          router.push('/profile?view=myOffers');
        }, 2000);
      } else if (response.status === 202) {
        // Obsługa statusu 202 - oferta poddana weryfikacji
        const responseText = await response.text();
        setSubmitMessage({
          type: 'success',
          text: responseText || 'Oferta została przesłana do weryfikacji. Zostanie sprawdzona przez administrację przed publikacją.'
        });
        
        // Przekieruj po 3 sekundach na profil do zakładki "My offers"
        setTimeout(() => {
          router.push('/profile?view=myOffers');
        }, 3000);
      } else {
        const errorText = await response.text();

        // Błędy /api/v1 i wyjątki domenowe mają kształt { code, message, details } —
        // rozgałęziamy się po code, nie po treści komunikatu (CLAUDE.md 6.3)
        if (parseApiError(errorText)) {
          throw new Error(describeApiError(errorText, 'Błąd aktualizacji oferty'));
        }

        // Obsługa nowych błędów walidacji typów transakcji
        if (response.status === 400) {
          if (errorText.includes('Typ transakcji') && errorText.includes('nie jest dozwolony')) {
            if (errorText.includes('Plony z działki (domowe)') || errorText.includes('Dania domowe')) {
              throw new Error('Ta podkategoria nie pozwala na sprzedaż. Wybierz typ transakcji: darowizna lub wymiana.');
            } else if (errorText.includes('Dania domowe (prywatne)')) {
              throw new Error('Ta kategoria nie pozwala na sprzedaż. Wybierz typ transakcji: darowizna lub wymiana.');
            } else {
              throw new Error('Wybrany typ transakcji nie jest dostępny dla tej kategorii. Wybierz inną kategorię lub typ transakcji.');
            }
          } else if (errorText.includes('konta firmowe')) {
            throw new Error('Sprzedaż w tej kategorii/podkategorii dostępna tylko dla kont firmowych. Zmień typ transakcji na darowiznę lub wymianę.');
          } else {
            throw new Error(errorText || 'Błąd walidacji danych');
          }
        } else {
          throw new Error(errorText || 'Błąd aktualizacji oferty');
        }
      }
    } catch (error) {
      console.error('Błąd podczas aktualizacji:', error);
      throw error;
    }
  };

  // Stała referencja — inaczej każdy render tej strony zmuszał OfferForm do ponownego pobrania kategorii
  const initialFormData = useMemo(() => (offer ? transformOfferToFormData(offer) : undefined), [offer]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner label="Wczytywanie oferty" />
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <Card className="text-center">
          <p className="text-sm text-danger">{error || 'Oferta nie została znaleziona'}</p>
          <Button href="/profile" variant="secondary" className="mt-4">
            Wróć do ofert
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className={cn(pageColumn, 'space-y-4')}>
        {/* Status oferty i jego zmiana */}
        {offer.status && offer.status !== 'PENDING_VERIFICATION' && (
          <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-ink">Status oferty</h2>
              <Badge tone={offer.status === 'ACTIVE' ? 'success' : 'neutral'} dot>
                {STATUS_LABELS[offer.status]}
              </Badge>
            </div>
            <Button
              variant={offer.status === 'ACTIVE' ? 'secondary' : 'primary'}
              size="sm"
              onClick={handleStatusChange}
              loading={statusLoading}
              className={offer.status === 'ACTIVE' ? '!text-danger' : undefined}
            >
              {statusLoading ? 'Zapisuję…' : offer.status === 'ACTIVE' ? 'Dezaktywuj ofertę' : 'Aktywuj ofertę'}
            </Button>
          </Card>
        )}

        {/* Oferta oczekująca na weryfikację */}
        {offer.status === 'PENDING_VERIFICATION' && (
          <div className="flex items-start gap-3 rounded-ui-md border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
            <LuTriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
            <p>
              <strong className="font-semibold">Oferta czeka na weryfikację.</strong> Nie możesz zmienić jej statusu do
              czasu zakończenia weryfikacji.
            </p>
          </div>
        )}

        {/* Komunikat o wyniku operacji (w tym zmiany statusu) */}
        {submitMessage && (
          <div
            role={submitMessage.type === 'error' ? 'alert' : 'status'}
            className={cn(
              'flex items-start gap-2 rounded-ui-md border px-4 py-3 text-sm',
              submitMessage.type === 'success'
                ? 'border-success/30 bg-success-soft text-brand-strong'
                : 'border-danger/30 bg-danger-soft text-danger'
            )}
          >
            {submitMessage.type === 'success' ? (
              <LuCircleCheck size={18} className="mt-0.5 shrink-0" aria-hidden />
            ) : (
              <LuCircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
            )}
            <p className="font-medium">{submitMessage.text}</p>
          </div>
        )}
      </div>

      <OfferForm
        initialData={initialFormData}
        onSubmit={handleSubmit}
        isEditing={true}
        submitMessage={submitMessage}
        setSubmitMessage={setSubmitMessage}
      />
    </div>
  );
}

export default function EditOfferPage() {
  return (
    <AuthGuard>
      <EditOfferPageContent />
    </AuthGuard>
  );
} 