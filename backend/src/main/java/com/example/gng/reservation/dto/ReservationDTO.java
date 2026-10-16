package com.example.gng.reservation.dto;

import com.example.gng.reservation.entity.ReservationStatus;

import java.time.LocalDateTime;

/**
 * Odpowiedź z danymi rezerwacji. Nigdy nie zwracamy encji JPA (CLAUDE.md 6.1).
 *
 * @param status          status efektywny — rezerwacja po terminie raportowana jest jako
 *                        EXPIRED, nawet jeśli scheduler jeszcze jej nie przestawił
 * @param pickupCode      kod do podania przy kasie; sekret potwierdzający odbiór
 * @param qrPayload       treść do zakodowania w QR: "id:pickupCode" (sekcja 8 designu)
 * @param offerName       skrót oferty, żeby lista rezerwacji nie wymagała N dodatkowych
 *                        zapytań po stronie klienta (klient cienki, CLAUDE.md 6.5)
 * @param offerAvailableQuantity
 *                        dostępność oferty po tej operacji — wypełniana TYLKO w odpowiedzi
 *                        tworzenia rezerwacji, gdzie wychodzi z policzonej już dostępności
 *                        pod blokadą wiersza, bez dodatkowego zapytania. Na liście i w
 *                        szczegółach jest null: dostępność oferty nie jest częścią stanu
 *                        rezerwacji, a liczenie jej per pozycja dałoby N+1 na ekranie,
 *                        który tej wartości nie używa.
 */
public record ReservationDTO(
        String id,
        String offerId,
        String offerName,
        String offerImageUrl,
        int quantity,
        ReservationStatus status,
        String pickupCode,
        String qrPayload,
        LocalDateTime createdAt,
        LocalDateTime expiresAt,
        LocalDateTime collectedAt,
        LocalDateTime cancelledAt,
        Integer offerAvailableQuantity
) {
}
