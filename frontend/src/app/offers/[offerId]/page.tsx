"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { environment } from "../../../config";
import { authorizedFetch } from "../../../utils/auth";
import OfferDetailsView from "../../../components/OfferDetailsView";
import { OfferDetails } from "../../../types/offerDetails";

// Globalny mechanizm zapobiegający wielokrotnym pobraniom tej samej oferty
const fetchingOffers = new Map<string, Promise<OfferDetails>>();
const VIEW_COOLDOWN = 2000; // 2 sekundy - czas między pobraniami tej samej oferty

export default function OfferDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { offerId } = params as { offerId: string };
  const [offer, setOffer] = useState<OfferDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const redirectedRef = useRef(false);

  useEffect(() => {
    const fetchOffer = async () => {
      if (!offerId) return;
      
      // Sprawdź czy już pobieramy tę ofertę
      const existingFetch = fetchingOffers.get(offerId);
      if (existingFetch) {
        try {
          // Czekaj na zakończenie istniejącego pobierania
          const data = await existingFetch;
          setOffer(data);
          setLoading(false);
          return;
        } catch {
          // Jeśli istniejące pobieranie się nie powiodło, spróbuj ponownie
          fetchingOffers.delete(offerId);
        }
      }
      
      setLoading(true);
      setError(null);
      redirectedRef.current = false;
      
      // Utwórz nowe obietnicę dla tego offerId
      const fetchPromise = (async () => {
        const res = await authorizedFetch(`${environment.apiUrl}/api/offer/details/${offerId}`);
        if (!res.ok) throw new Error("Błąd pobierania ogłoszenia");
        const data = await res.json();
        return data;
      })();
      
      // Zapisz obietnicę przed jej rozpoczęciem
      fetchingOffers.set(offerId, fetchPromise);
      
      try {
        const data = await fetchPromise;
        setOffer(data);
        
        // Sprawdź czy URL zawiera nazwę oferty, jeśli nie - przekieruj na pełny URL
        // Zrób to tylko raz, aby uniknąć wielokrotnych redirectów
        if (!redirectedRef.current) {
          const currentPath = window.location.pathname;
          const expectedPath = `/offers/${offerId}/${encodeURIComponent(data.name)}`;
          
          if (currentPath !== expectedPath) {
            redirectedRef.current = true;
            // Przekieruj na pełny URL z nazwą oferty (SEO-friendly)
            router.replace(expectedPath);
            // Nie czyść obietnicy - nowa strona może z niej skorzystać
            return;
          }
        }
      } catch (e: unknown) {
        // Usuń obietnicę w przypadku błędu
        fetchingOffers.delete(offerId);
        if (e instanceof Error) {
          setError(e.message || "Błąd ładowania ogłoszenia");
        } else {
          setError("Błąd ładowania ogłoszenia");
        }
      } finally {
        setLoading(false);
        // Usuń obietnicę po VIEW_COOLDOWN, aby umożliwić ponowne pobranie jeśli potrzeba
        if (!redirectedRef.current) {
          setTimeout(() => {
            fetchingOffers.delete(offerId);
          }, VIEW_COOLDOWN);
        }
      }
    };
    
    fetchOffer();
    
    // Cleanup - przy unmount lub zmianie offerId nie robimy nic,
    // obietnica pozostanie w Map i może być wykorzystana przez kolejną instancję
  }, [offerId]); // Usunięto router z zależności - jest stabilny w Next.js

  if (loading) return <div className="flex justify-center items-center h-96">Ładowanie...</div>;
  if (error) return <div className="text-center text-red-600 py-10">{error}</div>;
  if (!offer) return null;

  return (
    <div>
      {/* Komunikat o nieaktywnej ofercie */}
      {offer.status === 'INACTIVE' && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                <strong>Uwaga:</strong> Ta oferta jest nieaktywna i może być nieaktualna. 
                Skontaktuj się z sprzedawcą, aby potwierdzić dostępność przed umówieniem się na odbiór.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Komunikat o ofercie oczekującej na weryfikację */}
      {offer.status === 'PENDING_VERIFICATION' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Informacja:</strong> Ta oferta oczekuje na weryfikację. 
                Może być jeszcze niedostępna lub wymagać dodatkowych informacji.
              </p>
            </div>
          </div>
        </div>
      )}

      <OfferDetailsView offer={offer} />
    </div>
  );
}
