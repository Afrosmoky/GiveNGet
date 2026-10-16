/**
 * Typy statystyk platformy — odpowiadają DTO z GET /api/v1/stats/platform (tylko ADMIN).
 *
 * „Stan" (konta łącznie, sklepy, aktywne oferty) jest liczony na teraz, „przepływ"
 * (nowe konta, wystawione oferty, rezerwacje, odbiory) — w zakresie from..to, dni UTC.
 */
export interface PlatformStats {
  from: string | null;
  to: string | null;
  users: { total: number; verified: number; newInRange: number };
  stores: { verified: number };
  offers: { active: number; createdInRange: number };
  reservations: {
    createdInRange: number;
    byStatus: { reserved: number; collected: number; expired: number; cancelled: number };
  };
  pickups: { collected: number; savedUnits: number };
}
