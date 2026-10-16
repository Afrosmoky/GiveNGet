package com.example.gng.platformstats.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDate;

/**
 * Statystyki platformy pod pilotaż (docs/08, pozycja 4). Tylko dla ADMIN.
 *
 * <p>Dwa rodzaje liczb:
 * <ul>
 *   <li><b>stan</b> — na chwilę zapytania, bez filtra dat: konta łącznie, sklepy, aktywne oferty;</li>
 *   <li><b>przepływ</b> — zdarzenia w zakresie {@code from..to} (dni UTC, włącznie): nowe konta,
 *       wystawione oferty, utworzone rezerwacje, odbiory.</li>
 * </ul>
 * Rezerwacje liczone po dacie utworzenia, odbiory po dacie odbioru — tak jak raport oszczędności.
 *
 * @param from null = od początku danych
 * @param to   null = do teraz
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record PlatformStatsDTO(
        LocalDate from,
        LocalDate to,
        Users users,
        Stores stores,
        Offers offers,
        Reservations reservations,
        Pickups pickups
) {

    /**
     * Konta konsumenckie (REGULAR).
     *
     * @param total      stan: wszystkie konta
     * @param verified   stan: konta z potwierdzonym adresem e-mail
     * @param newInRange przepływ: konta założone w zakresie. Konta sprzed 10.2026 bez zapisanej
     *                   daty założenia nie wchodzą do tej liczby (wchodzą do {@code total}).
     */
    public record Users(long total, long verified, long newInRange) {
    }

    /** Sklepy (COMPANY) ze zweryfikowanym kontem — stan. */
    public record Stores(long verified) {
    }

    /**
     * @param active         stan: oferty ACTIVE teraz
     * @param createdInRange przepływ: oferty wystawione w zakresie (dowolny obecny status)
     */
    public record Offers(long active, long createdInRange) {
    }

    /**
     * Rezerwacje utworzone w zakresie, łącznie i według obecnego statusu.
     * Wszystkie cztery statusy są zawsze obecne — brak = 0.
     */
    public record Reservations(long createdInRange, ByStatus byStatus) {
    }

    public record ByStatus(long reserved, long collected, long expired, long cancelled) {
    }

    /**
     * Potwierdzone odbiory w zakresie (po dacie odbioru).
     *
     * @param collected  liczba rezerwacji COLLECTED
     * @param savedUnits uratowane sztuki — ta sama definicja co w raporcie oszczędności
     */
    public record Pickups(long collected, long savedUnits) {
    }
}
