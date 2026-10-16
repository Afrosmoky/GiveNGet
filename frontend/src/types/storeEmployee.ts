/** Typy panelu pracowników sklepu — odpowiadają DTO z /api/v1/store-employees. */

export interface StoreEmployee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  storeId: number | null;
  storeName: string | null;
  /** LocalDateTime w UTC bez strefy — formatować przez formatDateTime z types/reservation.ts. */
  createdAt: string | null;
  /** false = firma odebrała dostęp: brak logowania i potwierdzania odbiorów. */
  active: boolean;
}

export interface CreateStoreEmployeePayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
}
