import React from 'react';
import { ComingSoon } from './profile/ComingSoon';
import { Button } from './ui';

export const FavoritesDetailView: React.FC = () => (
  <ComingSoon
    title="Ulubione w koncie"
    description="Ulubione oferty i kategorie masz już na osobnej stronie — tu pojawi się ich podsumowanie."
    action={<Button href="/favorites">Przejdź do ulubionych</Button>}
  />
);
