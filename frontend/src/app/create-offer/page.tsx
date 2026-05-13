"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { environment } from '../../config';
import { authorizedFetch, getUserData } from '../../utils/auth';
import { AuthGuard } from '../../components/AuthGuard';
import { OfferForm } from '../../components/OfferForm';
import { TransactionType } from '../../types/offer';

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
}

function CreateOfferPageContent() {
  const router = useRouter();
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

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

    // Walidacja darmowych ofert
    const userData = getUserData();
    if (userData && userData.freeOffersCount !== undefined && userData.freeOffersCount <= 0) {
      setSubmitMessage({
        type: 'error',
        text: 'Nie możesz utworzyć nowej oferty. Wykorzystałeś wszystkie darmowe oferty w tym miesiącu. Spróbuj ponownie w następnym miesiącu lub rozważ boost.'
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
      
      // Dodaj obrazy
      formData.images.forEach((image) => {
        formDataToSend.append('images', image);
      });

      const response = await authorizedFetch(`${environment.apiUrl}/api/offer`, {
        method: 'POST',
        body: formDataToSend
      });

      if (response.ok) {
        // Pobierz tekst odpowiedzi
        const responseText = await response.text();
        
        // Pokaż komunikat sukcesu
        setSubmitMessage({
          type: 'success',
          text: responseText || 'Ogłoszenie zostało pomyślnie utworzone!'
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
          throw new Error(errorText || 'Błąd tworzenia oferty');
        }
      }
    } catch (error) {
      console.error('Błąd podczas tworzenia:', error);
      throw error;
    }
  };

  return (
    <OfferForm
      onSubmit={handleSubmit}
      isEditing={false}
      submitMessage={submitMessage}
      setSubmitMessage={setSubmitMessage}
    />
  );
}

export default function CreateOfferPage() {
  return (
    <AuthGuard>
      <CreateOfferPageContent />
    </AuthGuard>
  );
}
