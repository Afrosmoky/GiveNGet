"use client";

import { useCurrentUser } from '../../hooks/useCurrentUser';
import { consolePage, cn, pageContainer } from '../ui';
import { shellVariantFor } from './navConfig';

/**
 * Zewnętrzna rama treści dla ekranów współdzielonych przez konsumenta i konsolę (formularz
 * oferty, konto). Konsument: wspólny pageContainer — ta sama kolumna co logo w pasku i stopka.
 * Konsola firmy/admina: consolePage (marginesy obok sidebara).
 */
export function usePageFrame() {
  const { ready, userType } = useCurrentUser();
  const variant = shellVariantFor(ready, userType);
  const isConsole = variant === 'company' || variant === 'admin';
  return {
    isConsole,
    /** Rama strony z odstępem pionowym. */
    frame: isConsole ? consolePage : cn(pageContainer, 'py-6 sm:py-8'),
    /** Sama kolumna (bez odstępu u dołu) — gdy pod spodem renderuje się kolejna rama. */
    column: isConsole ? 'mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8' : cn(pageContainer, 'pt-6 sm:pt-8'),
  };
}
