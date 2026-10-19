"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { environment } from "../../../config";
import { authorizedFetch } from "../../../utils/auth";
import OfferDetailsView from "../../../components/OfferDetailsView";
import { Card, Spinner, cn, pageContainer } from "../../../components/ui";
import { LuCircleAlert, LuTriangleAlert } from "react-icons/lu";
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
        if (!res.ok) throw new Error("Błąd pobierania oferty");
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
          setError(e.message || "Błąd ładowania oferty");
        } else {
          setError("Błąd ładowania oferty");
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

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner className="h-7 w-7 text-brand" label="Wczytywanie oferty" />
      </div>
    );
  }
  if (error) {
    return (
      <div className={cn(pageContainer, 'py-8')}>
        <Card padding="lg" role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
            <LuCircleAlert size={22} aria-hidden />
          </span>
          <p className="text-sm text-ink">{error}</p>
        </Card>
      </div>
    );
  }
  if (!offer) return null;

  const notice =
    offer.status === 'INACTIVE'
      ? {
          className: 'border-danger/30 bg-danger-soft text-danger',
          icon: <LuCircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />,
          lead: 'Uwaga:',
          text: 'Ta oferta jest nieaktywna i może być nieaktualna. Skontaktuj się ze sprzedawcą, aby potwierdzić dostępność przed umówieniem się na odbiór.',
        }
      : offer.status === 'PENDING_VERIFICATION'
        ? {
            className: 'border-warning/30 bg-warning-soft text-warning',
            icon: <LuTriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />,
            lead: 'Informacja:',
            text: 'Ta oferta oczekuje na weryfikację. Może być jeszcze niedostępna lub wymagać dodatkowych informacji.',
          }
        : null;

  return (
    <div>
      {/* Komunikat o nieaktywnej / weryfikowanej ofercie — w kolumnie treści szczegółów */}
      {notice && (
        <div className={cn(pageContainer, 'pt-6 sm:pt-8')}>
          <p role="status" className={cn('flex items-start gap-2.5 rounded-ui-md border px-4 py-3 text-sm', notice.className)}>
            {notice.icon}
            <span>
              <strong>{notice.lead}</strong> {notice.text}
            </span>
          </p>
        </div>
      )}

      <OfferDetailsView offer={offer} />
    </div>
  );
}
