package com.example.gng.common.exception;

import com.example.gng.common.dto.ApiErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.HashMap;
import java.util.Map;

/**
 * Tłumaczy wyjątki kontrolerów /api/v1 na kształt {code, message, details} (CLAUDE.md 6.3).
 *
 * <p><b>Zasięg jest celowo zawężony do pakietów modułów /api/v1.</b> Gdyby advice był
 * globalny, przechwyciłby {@link MethodArgumentNotValidException} także dla starych
 * kontrolerów i zmienił kształt ich błędów walidacji z {status, message, errors} na
 * {code, message, details} — czyli złamał istniejące API. Nowy moduł /api/v1 należy
 * dopisać do listy basePackages.
 *
 * <p>{@code HIGHEST_PRECEDENCE} gwarantuje wyprzedzenie {@code GlobalExceptionHandler},
 * który ma {@code @ExceptionHandler(Exception.class)} i nie deklaruje kolejności — bez
 * tego {@link ApiException} mogłaby wyjść jako 500 z wyciekiem komunikatu wewnętrznego.
 */
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(basePackages = {
        "com.example.gng.reservation",
        "com.example.gng.store",
        "com.example.gng.report",
        "com.example.gng.offerimport",
        "com.example.gng.platformstats",
        "com.example.gng.notification"
})
public class ApiExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiErrorResponse> handleApiException(ApiException ex) {
        logger.info("Błąd domenowy {}: {} (details={})", ex.getCode(), ex.getMessage(), ex.getDetails());
        return withRetryAfter(ex)
                .body(ApiErrorResponse.of(ex.getCode(), ex.getMessage(), ex.getDetails()));
    }

    /**
     * Dokłada nagłówek Retry-After, gdy wyjątek zna czas oczekiwania. Bez niego klient
     * ponawiałby natychmiast i utrzymywałby limit w stanie wyczerpania.
     */
    private static ResponseEntity.BodyBuilder withRetryAfter(ApiException ex) {
        ResponseEntity.BodyBuilder builder = ResponseEntity.status(ex.getStatus());
        if (ex.getRetryAfterSeconds() > 0) {
            builder.header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()));
        }
        return builder;
    }


    /**
     * Parametr ścieżki/zapytania o złym typie (np. /api/v1/stores/abc). Bez tej metody
     * wyjątek trafiał do catch-all GlobalExceptionHandler jako 500.
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity
                .badRequest()
                .body(ApiErrorResponse.of(
                        "INVALID_PARAMETER",
                        "Nieprawidłowa wartość parametru.",
                        Map.of("parameter", ex.getName())));
    }

    /**
     * Walidacja @Valid na ciele żądania — ten sam kształt co pozostałe błędy /api/v1,
     * z naruszeniami per pole w details.fields.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, Object> fields = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> fields.put(error.getField(), error.getDefaultMessage()));

        return ResponseEntity
                .badRequest()
                .body(ApiErrorResponse.of(
                        "VALIDATION_FAILED",
                        "Żądanie nie przeszło walidacji.",
                        Map.of("fields", fields)));
    }
}
