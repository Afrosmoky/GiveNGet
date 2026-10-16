package com.example.gng.reservation.entity;

/**
 * Cykl życia rezerwacji (docs/04_REZERWACJE_DESIGN.md, sekcja 4).
 *
 * Status trzymamy na rezerwacji, nie na ofercie — „wyprzedane" to wyliczana
 * dostępność równa 0, a {@code OfferStatus} pozostaje bez zmian.
 *
 * Przejścia:
 * <ul>
 *   <li>{@code RESERVED → COLLECTED} — potwierdzenie odbioru (kolejny etap, nie ten)</li>
 *   <li>{@code RESERVED → EXPIRED} — scheduler, gdy expiresAt minęło</li>
 *   <li>{@code RESERVED → CANCELLED} — anulowanie przez użytkownika</li>
 * </ul>
 * {@code COLLECTED}, {@code EXPIRED} i {@code CANCELLED} są terminalne.
 */
public enum ReservationStatus {
    RESERVED("Zarezerwowana"),
    COLLECTED("Odebrana"),
    EXPIRED("Wygasła"),
    CANCELLED("Anulowana");

    private final String displayName;

    ReservationStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    /** Czy status jest końcowy — nie da się z niego nigdzie przejść. */
    public boolean isTerminal() {
        return this != RESERVED;
    }
}
