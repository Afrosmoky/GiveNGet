package com.example.gng.common.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * Żądanie jest źle sformułowane — parametry nie trzymają się reguł domeny.
 * 400, w odróżnieniu od konfliktów ze stanem zasobu (409).
 */
public class BadRequestException extends ApiException {

    public BadRequestException(String code, String message, Map<String, Object> details) {
        super(code, HttpStatus.BAD_REQUEST, message, details);
    }

    /** Nieznana wartość filtra statusu rezerwacji (np. ?status=FOO). */
    public static BadRequestException invalidReservationStatus(String value) {
        return new BadRequestException(
                "INVALID_RESERVATION_STATUS",
                "Nieznany status rezerwacji.",
                Map.of("status", value,
                        "allowed", java.util.Arrays.stream(com.example.gng.reservation.entity.ReservationStatus.values())
                                .map(Enum::name).toList()));
    }

    /** Link resetu hasła nieważny: kod nie istnieje, został już użyty albo wygasł (3 dni). */
    public static BadRequestException invalidResetCode() {
        return new BadRequestException(
                "INVALID_RESET_CODE",
                "Link do zmiany hasła jest nieprawidłowy, wygasł albo został już użyty.",
                null);
    }

    public static BadRequestException invalidDateRange(Object from, Object to) {
        return new BadRequestException(
                "INVALID_DATE_RANGE",
                "Data początkowa nie może być późniejsza niż data końcowa.",
                Map.of("from", String.valueOf(from), "to", String.valueOf(to)));
    }
}
