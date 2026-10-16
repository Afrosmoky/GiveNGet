/** Typy importu ofert — odpowiadają DTO z POST /api/v1/offers/import. */

export interface OfferImportRowError {
  /** Numer wiersza w Excelu (nagłówek = 1). */
  wiersz: number;
  code: string;
  message: string;
}

export interface OfferImportResult {
  /** Liczba zapisanych ofert, łącznie z tymi w moderacji. */
  utworzone: number;
  bledy: OfferImportRowError[];
  /** Wiersze zapisane jako PENDING — oferty nie są jeszcze widoczne. */
  doWeryfikacji: number[];
}
