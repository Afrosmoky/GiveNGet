import React from 'react';
import { ComingSoon } from './profile/ComingSoon';
import { Button } from './ui';

export const OrdersDetailView: React.FC = () => (
  <ComingSoon
    title="Historia zamówień"
    description="Tu zobaczysz zakupy opłacone w aplikacji. Na razie odbiory obsługujemy przez rezerwacje."
    action={
      <Button variant="secondary" href="/reservations">
        Moje rezerwacje
      </Button>
    }
  />
);
