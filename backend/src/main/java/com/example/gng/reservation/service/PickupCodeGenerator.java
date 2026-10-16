package com.example.gng.reservation.service;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/**
 * Generator kodów odbioru (docs/04_REZERWACJE_DESIGN.md, sekcje 3 i 8).
 *
 * Kod jest odczytywany z ekranu telefonu i przepisywany ręcznie przez pracownika sklepu,
 * dlatego alfabet nie zawiera znaków mylących: {@code O} i {@code I} są wykluczone,
 * a {@code 0} i {@code 1} nie należą do zakresu 2–9.
 *
 * Kod jest jednocześnie sekretem potwierdzającym odbiór, więc losujemy go
 * {@link SecureRandom}, nie {@code Random}. 32 znaki alfabetu na 6 pozycjach dają
 * ~1,07 mld kombinacji; twardą gwarancją unikalności jest indeks UNIQUE w bazie,
 * a {@link ReservationService} ponawia losowanie przy kolizji.
 */
@Component
public class PickupCodeGenerator {

    /** A–Z bez O i I, plus 2–9. Razem 32 znaki. */
    static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    static final int CODE_LENGTH = 6;

    private final SecureRandom random = new SecureRandom();

    public String generate() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}
