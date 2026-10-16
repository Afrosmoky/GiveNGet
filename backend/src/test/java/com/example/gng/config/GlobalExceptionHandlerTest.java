package com.example.gng.config;

import com.example.gng.common.dto.ApiErrorResponse;
import com.example.gng.common.exception.ForbiddenOperationException;
import com.example.gng.exceptions.TooManyTagsException;
import com.example.gng.exceptions.UserAlreadyExistsException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Catch-all nie może wynosić szczegółów wyjątku na zewnątrz, a pozostałe handlery
 * muszą zachować dotychczasowy kształt odpowiedzi.
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    /** Realistyczny komunikat wyjątku wewnętrznego — nazwa tabeli, kolumna, fragment SQL-a. */
    private static final String LEAKY_MESSAGE =
            "could not execute statement [Duplicate entry 'x' for key 'users.email_UNIQUE'] "
                    + "[insert into users (password,email) values (?,?)]";

    @Test
    void genericHandlerHidesExceptionMessage() {
        ResponseEntity<Map<String, Object>> response =
                handler.handleGenericException(new IllegalStateException(LEAKY_MESSAGE));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        Map<String, Object> body = response.getBody();
        assertNotNull(body);

        assertEquals(GlobalExceptionHandler.GENERIC_SERVER_ERROR_MESSAGE, body.get("message"));
        assertEquals("error", body.get("status"), "Kształt odpowiedzi musi zostać bez zmian");

        String serialized = body.toString();
        assertFalse(serialized.contains("users.email_UNIQUE"),
                "Nazwa indeksu nie może wyjść na zewnątrz: " + serialized);
        assertFalse(serialized.contains("insert into"),
                "Fragment SQL-a nie może wyjść na zewnątrz: " + serialized);
        assertFalse(serialized.contains("IllegalStateException"),
                "Typ wyjątku nie może wyjść na zewnątrz: " + serialized);
    }

    @Test
    void genericHandlerReturnsTraceIdForCorrelation() {
        Map<String, Object> body = handler.handleGenericException(new RuntimeException("x")).getBody();
        assertNotNull(body);

        Object traceId = body.get("traceId");
        assertNotNull(traceId, "Bez traceId nie da się skorelować zgłoszenia z logiem");
        assertEquals(8, traceId.toString().length());
        assertTrue(traceId.toString().matches("[0-9a-f]{8}"), "traceId: " + traceId);
    }

    @Test
    void genericHandlerGeneratesDistinctTraceIds() {
        Object first = handler.handleGenericException(new RuntimeException("a")).getBody().get("traceId");
        Object second = handler.handleGenericException(new RuntimeException("b")).getBody().get("traceId");
        assertNotEquals(first, second, "Każde zgłoszenie musi dać się odróżnić w logu");
    }

    @Test
    void genericHandlerAlsoHidesNullMessage() {
        // Wyjątek bez komunikatu nie może dać "Błąd serwera: null"
        Map<String, Object> body = handler.handleGenericException(new NullPointerException()).getBody();
        assertNotNull(body);
        assertEquals(GlobalExceptionHandler.GENERIC_SERVER_ERROR_MESSAGE, body.get("message"));
        assertFalse(body.toString().contains("null,"), body.toString());
    }

    // ---------- Handlery, których kształt NIE wolno zmienić ----------

    @Test
    void apiExceptionKeepsSection63Shape() {
        ResponseEntity<ApiErrorResponse> response = handler.handleApiException(
                ForbiddenOperationException.foreignStore());

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        ApiErrorResponse body = response.getBody();
        assertNotNull(body);
        assertEquals("FORBIDDEN", body.code());
        assertEquals("Ta rezerwacja dotyczy oferty innego sklepu.", body.message());
    }

    @Test
    void domainExceptionsKeepTheirUserFacingMessages() {
        // Te komunikaty są pisane dla użytkownika, nie są wyciekiem — muszą przechodzić
        Map<String, Object> tags = handler.handleTooManyTags(
                new TooManyTagsException("Za dużo tagów")).getBody();
        assertNotNull(tags);
        assertEquals("Za dużo tagów", tags.get("message"));

        ResponseEntity<Map<String, Object>> exists = handler.handleUserAlreadyExists(
                new UserAlreadyExistsException("Konto już istnieje"));
        assertEquals(HttpStatus.CONFLICT, exists.getStatusCode());
        assertNotNull(exists.getBody());
        assertEquals("Konto już istnieje", exists.getBody().get("message"));
    }

    @Test
    void uploadOverMultipartLimitIs413InApiFormatNot500() {
        ResponseEntity<ApiErrorResponse> response =
                handler.handleMaxUploadSize(new MaxUploadSizeExceededException(10L * 1024 * 1024));

        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("FILE_TOO_LARGE", response.getBody().code());
    }
}
