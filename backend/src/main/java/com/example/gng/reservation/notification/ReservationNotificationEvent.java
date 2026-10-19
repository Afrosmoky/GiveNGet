package com.example.gng.reservation.notification;

import java.time.LocalDateTime;

/**
 * Zdarzenie rezerwacji, o którym klient dostaje push. Niesie gotowe wartości, nie encje —
 * listener działa po zatwierdzeniu transakcji, poza sesją Hibernate.
 *
 * @param expiresAt   koniec holdu (UTC)
 * @param pickupFrom  początek okna odbioru oferty („HH:mm”, może być null)
 * @param pickupTo    koniec okna odbioru oferty („HH:mm”, może być null)
 */
public record ReservationNotificationEvent(
        Type type,
        String reservationId,
        Long userId,
        String offerName,
        int quantity,
        LocalDateTime expiresAt,
        String pickupFrom,
        String pickupTo
) {

    public enum Type {
        CONFIRMED,
        COLLECTED
    }
}
