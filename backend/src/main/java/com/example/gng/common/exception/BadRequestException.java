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

    public static BadRequestException invalidDateRange(Object from, Object to) {
        return new BadRequestException(
                "INVALID_DATE_RANGE",
                "Data początkowa nie może być późniejsza niż data końcowa.",
                Map.of("from", String.valueOf(from), "to", String.valueOf(to)));
    }
}
