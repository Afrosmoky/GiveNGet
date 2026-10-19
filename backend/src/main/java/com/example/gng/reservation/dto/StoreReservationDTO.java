package com.example.gng.reservation.dto;

import com.example.gng.reservation.entity.ReservationStatus;

import java.time.LocalDateTime;

/**
 * Rezerwacja widziana przez sklep (panel firmy, docs/08 #8). Nigdy encja JPA (CLAUDE.md 6.1).
 *
 * <p>Świadomie bez {@code pickupCode}/{@code qrPayload} — kod odbioru jest sekretem klienta,
 * który okazuje go pracownikowi przy kasie; gdyby sklep widział go na liście, potwierdzenie
 * odbioru niczego by nie dowodziło. Z danych klienta tylko imię (do rozpoznania przy odbiorze),
 * bez nazwiska, e-maila i telefonu.
 *
 * @param status efektywny — RESERVED po terminie raportujemy jako EXPIRED, nawet jeśli
 *               scheduler jeszcze go nie przestawił (spójnie z {@link ReservationDTO})
 */
public record StoreReservationDTO(
        String id,
        ReservationStatus status,
        int quantity,
        String offerId,
        String offerName,
        String offerImageUrl,
        String customerFirstName,
        LocalDateTime createdAt,
        LocalDateTime expiresAt,
        LocalDateTime collectedAt,
        LocalDateTime cancelledAt
) {
}
