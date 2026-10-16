package com.example.gng.offerimport.dto;

import java.util.List;

/**
 * Wynik importu ofert z pliku .xlsx.
 *
 * @param utworzone     liczba zapisanych ofert (łącznie z tymi, które trafiły do moderacji)
 * @param bledy         wiersze odrzucone — nie zostały zapisane
 * @param doWeryfikacji numery wierszy zapisanych jako PENDING przez moderację treści;
 *                      oferty istnieją, ale nie są jeszcze widoczne dla użytkowników
 */
public record OfferImportResult(int utworzone, List<OfferImportRowError> bledy, List<Integer> doWeryfikacji) {
}
