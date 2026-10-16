package com.example.gng.common.ratelimit;

/**
 * Wynik próby pobrania tokenu z kubełka.
 *
 * @param allowed             czy żądanie może przejść
 * @param retryAfterSeconds   ile sekund do najbliższego wolnego tokenu; 0 gdy przeszło.
 *                            Zawsze co najmniej 1 przy odmowie — nagłówek Retry-After: 0
 *                            zachęcałby klienta do natychmiastowego ponowienia.
 */
public record RateLimitResult(boolean allowed, long retryAfterSeconds) {

    private static final RateLimitResult ALLOWED = new RateLimitResult(true, 0);

    /** Nazwa nie może brzmieć allowed() — kolidowałaby z akcesorem rekordu. */
    public static RateLimitResult allow() {
        return ALLOWED;
    }

    public static RateLimitResult deny(long retryAfterSeconds) {
        return new RateLimitResult(false, Math.max(1, retryAfterSeconds));
    }
}
