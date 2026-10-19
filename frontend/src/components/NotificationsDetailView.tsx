import React from 'react';
import { ComingSoon } from './profile/ComingSoon';
import { PushOptIn } from './PushOptIn';

export const NotificationsDetailView: React.FC = () => (
  <div className="flex flex-col gap-4">
    {/* Zgoda na powiadomienia push działa już dziś — pokazuje się, dopóki jej nie udzielono */}
    <PushOptIn variant="inline" />
    <ComingSoon
      title="Ustawienia powiadomień"
      description="Wkrótce wybierzesz, o czym chcesz dostawać powiadomienia: rezerwacje, wiadomości, nowe oferty w okolicy."
    />
  </div>
);
