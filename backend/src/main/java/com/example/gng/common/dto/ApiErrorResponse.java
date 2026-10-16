package com.example.gng.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

/**
 * Jednolity kształt odpowiedzi błędu dla endpointów /api/v1 (CLAUDE.md, sekcja 6.3).
 *
 * <pre>
 * {
 *   "code": "OFFER_NOT_AVAILABLE",
 *   "message": "Dostępna liczba sztuk jest mniejsza niż żądana.",
 *   "details": { "offerId": "abc123", "requested": 5, "available": 2 }
 * }
 * </pre>
 *
 * {@code code} jest stabilny i maszynowy — klient rozgałęzia się po nim, nie po treści
 * komunikatu. {@code details} jest opcjonalne i pomijane w JSON, gdy puste.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiErrorResponse(String code, String message, Map<String, Object> details) {

    public static ApiErrorResponse of(String code, String message) {
        return new ApiErrorResponse(code, message, null);
    }

    public static ApiErrorResponse of(String code, String message, Map<String, Object> details) {
        return new ApiErrorResponse(code, message, details == null || details.isEmpty() ? null : details);
    }
}
