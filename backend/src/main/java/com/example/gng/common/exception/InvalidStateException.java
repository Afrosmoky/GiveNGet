package com.example.gng.common.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * Operacja jest sprzeczna z aktualnym stanem zasobu — np. próba anulowania
 * rezerwacji, która jest już odebrana, wygasła albo anulowana.
 */
public class InvalidStateException extends ApiException {

    public InvalidStateException(String code, String message, Map<String, Object> details) {
        super(code, HttpStatus.CONFLICT, message, details);
    }

    public static InvalidStateException reservationNotCancellable(String reservationId, String effectiveStatus) {
        return new InvalidStateException(
                "RESERVATION_NOT_CANCELLABLE",
                "Tej rezerwacji nie można już anulować.",
                Map.of("reservationId", reservationId, "status", effectiveStatus));
    }

    /**
     * Rezerwacji nie da się odebrać: została już odebrana, anulowana albo wygasła.
     * Status w details jest statusem efektywnym, więc rezerwacja po terminie
     * raportowana jest jako EXPIRED, nawet jeśli scheduler jej jeszcze nie przestawił.
     */
    public static InvalidStateException reservationNotCollectable(String reservationId, String effectiveStatus) {
        return new InvalidStateException(
                "RESERVATION_NOT_COLLECTABLE",
                "Tej rezerwacji nie można odebrać.",
                Map.of("reservationId", reservationId, "status", effectiveStatus));
    }

    public static InvalidStateException emailAlreadyExists(String email) {
        return new InvalidStateException(
                "EMAIL_ALREADY_EXISTS",
                "Konto o podanym adresie e-mail już istnieje.",
                Map.of("email", email));
    }
}
