"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { environment } from '../../../../config';
import { authorizedFetch } from '../../../../utils/auth';
import { AuthGuard } from '../../../../components/AuthGuard';
import { OfferForm } from '../../../../components/OfferForm';
import { OfferDetails } from '../../../../types/offerDetails';
import { TransactionType, OfferStatus, STATUS_LABELS } from '../../../../types/offer';

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
  pickupTimeFrom: string;
  pickupTimeTo: string;
  expiryDate: Date | null;
  images: File[];
  existingImages?: string[];
  originalImages?: string[];
}

function EditOfferPageContent() {
  const params = useParams();
  const router = useRouter();
  const { offerId } = params as { offerId: string };
  
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

  const transformOfferToFormData = (offer: OfferDetails): Partial<OfferFormData> => {
    return {
      name: offer.name,
      location: offer.location,
      lat: offer.latitude,
      lon: offer.longitude,
      coordinates: `${offer.longitude},${offer.latitude}`,
      description: offer.description,
              offerType: offer.transactionType as TransactionType,
      pickupTimeFrom: offer.pickupDateFrom || '00:00',
      pickupTimeTo: offer.pickupDateTo || '23:59',
      expiryDate: offer.expiryDate ? (() => {
        const date = new Date(offer.expiryDate);
        console.log('Konwertuję expiryDate:', offer.expiryDate, 'na:', date);
        return isNaN(date.getTime()) ? null : date;
      })() : null,
      existingImages: offer.imageUrls,
      originalImages: offer.imageUrls, // Dodane: oryginalne obrazy do porównania
      // TODO: Dodać categoryId i subcategoryId gdy backend będzie je zwracał
      categoryId: 0,
      subcategoryId: 0
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-yellow-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 py-10">
        {error}
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="text-center text-gray-600 py-10">
        Oferta nie została znaleziona
      </div>
    );
  }

  return (
    <div>
      {/* Przycisk zmiany statusu */}
      {offer.status && offer.status !== 'PENDING_VERIFICATION' && (
        <div className="max-w-4xl mx-auto mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Status oferty</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Aktualny status: <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                    offer.status === 'ACTIVE' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {STATUS_LABELS[offer.status]}
                  </span>
                </p>
              </div>
              <button
                onClick={handleStatusChange}
                disabled={statusLoading}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  offer.status === 'ACTIVE'
                    ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                    : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {statusLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    Ładowanie...
                  </div>
                ) : (
                  offer.status === 'ACTIVE' ? 'Dezaktywuj ofertę' : 'Aktywuj ofertę'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Komunikat o ofercie oczekującej na weryfikację */}
      {offer.status === 'PENDING_VERIFICATION' && (
        <div className="max-w-4xl mx-auto mb-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Informacja:</strong> Ta oferta oczekuje na weryfikację. 
                  Nie możesz zmienić jej statusu do czasu zakończenia procesu weryfikacji.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Komunikat o wyniku operacji (w tym zmiany statusu) */}
      {submitMessage && (
        <div className="max-w-4xl mx-auto mb-6">
          <div
            className={`p-4 rounded-lg border ${
              submitMessage.type === "success"
                ? "bg-green-50 border-green-300 text-green-800"
                : "bg-red-50 border-red-300 text-red-800"
            }`}
          >
            <div className="flex">
              <div className="flex-shrink-0">
                {submitMessage.type === "success" ? (
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">
                  {submitMessage.text}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <OfferForm
        initialData={transformOfferToFormData(offer)}
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