package com.example.gng.common.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * Przekroczono limit — tempa żądań albo twardy limit stanu.
 *
 * Niesie liczbę sekund do nagłówka {@code Retry-After}, żeby klient wiedział, kiedy
 * ponowić, zamiast odpytywać w pętli.
 */
public class TooManyRequestsException extends ApiException {

    private final long retryAfterSeconds;

    private TooManyRequestsException(String code, String message, long retryAfterSeconds,
                                     Map<String, Object> details) {
        super(code, HttpStatus.TOO_MANY_REQUESTS, message, details);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    /** Przekroczone tempo żądań — limit odtworzy się sam po czasie. */
    public static TooManyRequestsException rateLimit(long retryAfterSeconds) {
        return new TooManyRequestsException(
                "RATE_LIMIT_EXCEEDED",
                "Zbyt wiele żądań. Spróbuj ponownie za chwilę.",
                retryAfterSeconds,
                Map.of("retryAfterSeconds", retryAfterSeconds));
    }

    /**
     * Twardy limit jednocześnie aktywnych rezerwacji.
     *
     * Nie mija sam z czasem w przewidywalnym momencie — użytkownik musi odebrać albo
     * anulować którąś rezerwację, albo poczekać na jej wygaśnięcie. Dlatego bez
     * {@code Retry-After}: podanie tu jakiejkolwiek liczby byłoby zmyśleniem.
     */
    public static TooManyRequestsException tooManyActiveReservations(int active, int max) {
        return new TooManyRequestsException(
                "TOO_MANY_ACTIVE_RESERVATIONS",
                "Masz już maksymalną liczbę aktywnych rezerwacji. Odbierz lub anuluj którąś, "
                        + "żeby zarezerwować kolejną.",
                0,
                Map.of("activeReservations", active, "maxActiveReservations", max));
    }

    @Override
    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
