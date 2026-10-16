package com.example.gng.store.dto;

import java.math.BigDecimal;

/**
 * Publiczny profil sklepu (docs/08, pozycja 3). Wyłącznie dane, które sklep pokazuje
 * klientom — bez e-maila, telefonu, danych osoby zakładającej konto i liczników
 * wewnętrznych (np. limitu darmowych ofert).
 *
 * @param activeOffersCount liczba ofert ACTIVE — tyle zwróci lista /offers łącznie
 */
public record StoreProfileDTO(
        Long id,
        String name,
        String logoUrl,
        String address,
        String description,
        BigDecimal lat,
        BigDecimal lon,
        long activeOffersCount,
        StoreRating rating
) {

    /** Średnia ocen i ich liczba; średnia 0.0 przy braku ocen. */
    public record StoreRating(double average, long count) {
    }
}
