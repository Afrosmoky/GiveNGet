"use client";

import { useEffect, useState } from 'react';
import { LuArrowRight, LuCircleCheck } from 'react-icons/lu';
import { ForStores } from '../components/home/ForStores';
import { HomeHero } from '../components/home/HomeHero';
import { HowItWorks } from '../components/home/HowItWorks';
import { NearbyOffers } from '../components/home/NearbyOffers';
import { Button, cn, pageContainer } from '../components/ui';
import { useCurrentUser, type UserType } from '../hooks/useCurrentUser';

/** CTA w hero zależne od tego, kto patrzy. Uprawnienia i tak egzekwuje backend — to tylko skrót. */
function heroActions(isLoggedIn: boolean, userType: UserType | null) {
  const browse = (href: string) => (
    <Button href={href} size="lg" rightIcon={<LuArrowRight size={18} />}>
      Przeglądaj oferty
    </Button>
  );

  if (!isLoggedIn) {
    return (
      <>
        {/* Oferty są dostępne po zalogowaniu — po nim wracamy prosto do wyszukiwarki */}
        {browse('/login?redirect=/offers/search')}
        <Button href="/register" variant="secondary" size="lg">
          Załóż konto
        </Button>
      </>
    );
  }

  switch (userType) {
    case 'COMPANY':
      return (
        <>
          <Button href="/dashboard" size="lg" rightIcon={<LuArrowRight size={18} />}>
            Przejdź do panelu sklepu
          </Button>
          <Button href="/create-offer" variant="secondary" size="lg">
            Dodaj ofertę
          </Button>
        </>
      );
    case 'ADMIN':
    case 'EMPLOYEE':
      return (
        <>
          <Button href="/admin" size="lg" rightIcon={<LuArrowRight size={18} />}>
            Przejdź do panelu
          </Button>
          <Button href="/offers/search" variant="secondary" size="lg">
            Przeglądaj oferty
          </Button>
        </>
      );
    case 'STORE_EMPLOYEE':
      return (
        <Button href="/store/pickup" size="lg" rightIcon={<LuArrowRight size={18} />}>
          Potwierdź odbiór
        </Button>
      );
    default:
      return (
        <>
          {browse('/offers/search')}
          <Button href="/reservations" variant="secondary" size="lg">
            Moje rezerwacje
          </Button>
        </>
      );
  }
}

export default function Home() {
  const { ready, isLoggedIn, user, userType } = useCurrentUser();
  const [showLoggedOut, setShowLoggedOut] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('message') === 'logged-out') {
      setShowLoggedOut(true);
      const timer = setTimeout(() => setShowLoggedOut(false), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Najnowsze oferty tylko dla konsumenta — firma, admin i pracownik mają swoje panele
  const isConsumer = isLoggedIn && (userType === 'REGULAR' || userType === null);
  const greeting = isLoggedIn && user?.firstName ? `Cześć, ${user.firstName}!` : undefined;

  return (
    <div>
      {showLoggedOut && (
        <div role="status" className="border-b border-success/20 bg-success-soft">
          <p className={cn(pageContainer, 'flex items-center gap-2 py-3 text-sm font-medium text-brand-strong')}>
            <LuCircleCheck size={16} aria-hidden />
            Wylogowano. Do zobaczenia!
          </p>
        </div>
      )}

      {/* Do odczytu sesji CTA się nie pokazują — inaczej gość/zalogowany widziałby mignięcie złych przycisków */}
      <HomeHero greeting={greeting} actions={ready ? heroActions(isLoggedIn, userType) : <div className="h-12" />} />
      <HowItWorks />
      {ready && isConsumer && <NearbyOffers />}
      {ready && !isLoggedIn && <ForStores />}
    </div>
  );
}
