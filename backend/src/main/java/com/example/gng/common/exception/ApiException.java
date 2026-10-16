package com.example.gng.common.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * Baza wyjątków domenowych endpointów /api/v1.
 *
 * Każdy niesie stabilny {@code code} i własny status HTTP, dzięki czemu
 * {@link ApiExceptionHandler} zamienia go w odpowiedź o kształcie z CLAUDE.md 6.3
 * i nie wpada w catch-all {@code GlobalExceptionHandler}, który wystawiłby
 * treść wyjątku jako 500.
 */
public abstract class ApiException extends RuntimeException {

    private final String code;
    private final HttpStatus status;
    private final Map<String, Object> details;

    protected ApiException(String code, HttpStatus status, String message, Map<String, Object> details) {
        super(message);
        this.code = code;
        this.status = status;
        this.details = details;
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public Map<String, Object> getDetails() {
        return details;
    }

    /**
     * Liczba sekund dla nagłówka {@code Retry-After}, gdy wyjątek ma sens ponowienia.
     * 0 oznacza „nie wysyłaj nagłówka" — domyślnie żaden wyjątek go nie potrzebuje.
     */
    public long getRetryAfterSeconds() {
        return 0;
    }
}
