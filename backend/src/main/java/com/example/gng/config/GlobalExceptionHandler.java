package com.example.gng.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import com.example.gng.exceptions.TooManyTagsException;
import com.example.gng.exceptions.ForbiddenContentFoundException;
import com.example.gng.common.dto.ApiErrorResponse;
import com.example.gng.common.exception.ApiException;
import com.example.gng.exceptions.UserAlreadyExistsException;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    /** Jedyny komunikat, jaki wychodzi na zewnątrz przy nieobsłużonym wyjątku. */
    static final String GENERIC_SERVER_ERROR_MESSAGE = "Wystąpił błąd serwera";


    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, Object> response = new HashMap<>();
        Map<String, String> errors = new HashMap<>();
        
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
            log.error("Validation error - Field: {}, Message: {}", fieldName, errorMessage);
        });
        
        response.put("status", "error");
        response.put("message", "Błędy walidacji");
        response.put("errors", errors);
        
        log.error("Validation failed: {}", errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(ForbiddenContentFoundException.class)
    public ResponseEntity<Map<String, Object>> handleForbiddenContent(ForbiddenContentFoundException ex) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "pending_verification");
        response.put("message", ex.getMessage());
        if (ex.getOfferId() != null) {
            response.put("offerId", ex.getOfferId());
        }
        // 202 Accepted – przyjęto, ale wymaga weryfikacji
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParams(MissingServletRequestParameterException ex) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "error");
        response.put("message", "Brakujący parametr: " + ex.getParameterName());
        
        log.error("Missing parameter: {}", ex.getParameterName());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParts(MissingServletRequestPartException ex) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "error");
        response.put("message", "Brakująca część request: " + ex.getRequestPartName());
        
        log.error("Missing request part: {}", ex.getRequestPartName());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(TooManyTagsException.class)
    public ResponseEntity<Map<String, Object>> handleTooManyTags(TooManyTagsException ex) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "error");
        response.put("message", ex.getMessage());
        
        log.error("Too many tags error: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(UserAlreadyExistsException.class)
    public ResponseEntity<Map<String, Object>> handleUserAlreadyExists(UserAlreadyExistsException ex) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "error");
        response.put("message", ex.getMessage());
        
        log.error("User already exists: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    /**
     * Wyjątki domenowe /api/v1 rzucane z serwisów używanych także przez STARE kontrolery
     * (np. guard w OfferService.createOffer).
     *
     * ApiExceptionHandler ma zawężony zasięg do pakietów /api/v1, więc bez tej metody
     * taki wyjątek wpadłby w catch-all poniżej i wyszedł jako 500 z komunikatem
     * wewnętrznym w treści. Zwracamy ten sam kształt {code, message, details} co /api/v1
     * (CLAUDE.md 6.3).
     *
     * Dodanie tej obsługi nie zmienia zachowania istniejącego API: żaden dotychczasowy
     * kontroler nie rzuca ApiException, a pozostałe handlery zostają nietknięte.
     */
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiErrorResponse> handleApiException(ApiException ex) {
        log.info("Błąd domenowy {}: {} (details={})", ex.getCode(), ex.getMessage(), ex.getDetails());
        return withRetryAfter(ex)
                .body(ApiErrorResponse.of(ex.getCode(), ex.getMessage(), ex.getDetails()));
    }

    /**
     * Plik ponad spring.servlet.multipart.max-file-size. Żądanie odpada przy parsowaniu
     * multipart, zanim zostanie dopasowany kontroler — dlatego nie łapie tego
     * ApiExceptionHandler (zawężony do pakietów), a bez tej metody klient dostawał 500.
     * Kształt 6.3 i ten sam kod co własny limit importu ofert, żeby klient obsłużył
     * oba progi jedną ścieżką.
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        log.info("Odrzucono plik ponad limit multipart: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(ApiErrorResponse.of("FILE_TOO_LARGE", "Plik jest za duży."));
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
     * Ostatnia linia obrony dla wyjątków, których nikt nie obsłużył.
     *
     * <p>Nie zwracamy {@code ex.getMessage()} ani stack trace'u na zewnątrz. Komunikaty
     * wyjątków wewnętrznych potrafią nieść nazwy tabel i kolumn, fragmenty SQL-a, ścieżki
     * na dysku i adresy hostów — przy pilotażu pod marką sieci handlowej to darmowy rekonesans
     * dla atakującego.
     *
     * <p>Zamiast tego generujemy krótki {@code traceId}: klient dostaje go w odpowiedzi,
     * a pełny wyjątek trafia do logu serwera pod tym samym identyfikatorem. Zgłoszenie
     * „mam błąd 500, traceId a1b2c3d4" wystarczy, żeby znaleźć konkretny stack trace,
     * bez pokazywania czegokolwiek użytkownikowi.
     *
     * <p>Kształt odpowiedzi ({@code status}, {@code message}) zostaje bez zmian, żeby nie
     * łamać istniejących klientów; {@code traceId} jest polem dodanym.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        String traceId = newTraceId();

        Map<String, Object> response = new HashMap<>();
        response.put("status", "error");
        response.put("message", GENERIC_SERVER_ERROR_MESSAGE);
        response.put("traceId", traceId);

        // Jedyne miejsce, gdzie szczegóły mają prawo się pojawić — log serwera
        log.error("Nieobsłużony wyjątek [traceId={}]", traceId, ex);

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    /**
     * Identyfikator do korelacji zgłoszenia użytkownika z logiem serwera.
     * 8 znaków hex wystarcza do odnalezienia wpisu, a jest krótkie do przepisania
     * albo przeczytania przez telefon.
     */
    private static String newTraceId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }
}

