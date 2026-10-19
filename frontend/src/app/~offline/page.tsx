import type { Metadata } from 'next';
import { LuWifiOff } from 'react-icons/lu';
import { AuthCard } from '../../components/auth/AuthCard';
import { Button } from '../../components/ui';

export const metadata: Metadata = { title: 'Brak połączenia' };

/**
 * Powłoka offline — service worker (src/app/sw.ts) podaje ją z precache, gdy nawigacja nie może
 * dojść do sieci. Statyczna i bez danych użytkownika, bo trafia do cache przeglądarki.
 */
export default function OfflinePage() {
  return (
    <AuthCard
      tone="neutral"
      icon={<LuWifiOff size={26} aria-hidden />}
      title="Jesteś offline"
      description="Biovlo potrzebuje internetu, żeby pokazać oferty i Twoje rezerwacje. Sprawdź połączenie i spróbuj ponownie."
    >
      <Button href="/" fullWidth size="lg">
        Spróbuj ponownie
      </Button>
    </AuthCard>
  );
}
