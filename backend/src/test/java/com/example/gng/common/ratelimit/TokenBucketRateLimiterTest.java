package com.example.gng.common.ratelimit;

import com.example.gng.common.ratelimit.RateLimitProperties.Limit;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Limiter tempa.
 *
 * Czas jest sterowany ręcznie — test czekający realną godzinę na odtworzenie limitu
 * godzinowego byłby bezużyteczny w pipeline.
 */
class TokenBucketRateLimiterTest {

    private AtomicLong clock;
    private TokenBucketRateLimiter limiter;

    private static final Limit TEN_PER_MINUTE = new Limit(10, Duration.ofMinutes(1));

    @BeforeEach
    void setUp() {
        clock = new AtomicLong(0);
        limiter = new TokenBucketRateLimiter(clock::get);
    }

    private void advance(Duration duration) {
        clock.addAndGet(duration.toNanos());
    }

    @Test
    void allowsRequestsUpToCapacity() {
        for (int i = 1; i <= 10; i++) {
            assertTrue(limiter.tryConsume("k", TEN_PER_MINUTE).allowed(), "Żądanie nr " + i);
        }
    }

    @Test
    void deniesRequestOverCapacity() {
        for (int i = 0; i < 10; i++) {
            limiter.tryConsume("k", TEN_PER_MINUTE);
        }

        RateLimitResult result = limiter.tryConsume("k", TEN_PER_MINUTE);
        assertFalse(result.allowed());
        assertTrue(result.retryAfterSeconds() >= 1,
                "Retry-After: 0 zachęcałby do natychmiastowego ponowienia");
        assertTrue(result.retryAfterSeconds() <= 60, "Czekanie dłuższe niż okres nie ma sensu");
    }

    @Test
    void refillsOverTime() {
        for (int i = 0; i < 10; i++) {
            limiter.tryConsume("k", TEN_PER_MINUTE);
        }
        assertFalse(limiter.tryConsume("k", TEN_PER_MINUTE).allowed());

        // 10 na minutę = jeden token na 6 sekund
        advance(Duration.ofSeconds(6));
        assertTrue(limiter.tryConsume("k", TEN_PER_MINUTE).allowed(), "Po 6 s powinien być 1 token");
        assertFalse(limiter.tryConsume("k", TEN_PER_MINUTE).allowed(), "Ale tylko jeden");
    }

    @Test
    void fullPeriodRestoresWholeCapacity() {
        for (int i = 0; i < 10; i++) {
            limiter.tryConsume("k", TEN_PER_MINUTE);
        }

        advance(Duration.ofMinutes(1));

        for (int i = 1; i <= 10; i++) {
            assertTrue(limiter.tryConsume("k", TEN_PER_MINUTE).allowed(), "Po pełnym okresie, żądanie " + i);
        }
    }

    @Test
    void doesNotAccumulateBeyondCapacity() {
        // Długa bezczynność nie może dać prawa do serii większej niż pojemność
        advance(Duration.ofHours(5));

        for (int i = 0; i < 10; i++) {
            assertTrue(limiter.tryConsume("k", TEN_PER_MINUTE).allowed());
        }
        assertFalse(limiter.tryConsume("k", TEN_PER_MINUTE).allowed(),
                "Kubełek nie może przelewać się ponad capacity");
    }

    @Test
    void steadyTrafficIsNeverThrottled() {
        // Wymóg: nie karać poprawnych żądań w normalnym tempie.
        // 10/min = 1 na 6 s; klient trzymający ten rytm musi przejść zawsze.
        for (int i = 0; i < 200; i++) {
            assertTrue(limiter.tryConsume("k", TEN_PER_MINUTE).allowed(), "Żądanie nr " + i);
            advance(Duration.ofSeconds(6));
        }
    }

    @Test
    void keysAreIndependent() {
        for (int i = 0; i < 10; i++) {
            limiter.tryConsume("user:1", TEN_PER_MINUTE);
        }
        assertFalse(limiter.tryConsume("user:1", TEN_PER_MINUTE).allowed());

        assertTrue(limiter.tryConsume("user:2", TEN_PER_MINUTE).allowed(),
                "Limit jednego użytkownika nie może blokować innego");
    }

    @Test
    void sameKeyDifferentActionsAreIndependent() {
        // Klucz zawiera nazwę akcji — wyczerpanie limitu rezerwacji nie może zablokować odbioru
        for (int i = 0; i < 10; i++) {
            limiter.tryConsume("reservation-create:7", TEN_PER_MINUTE);
        }
        assertTrue(limiter.tryConsume("reservation-collect:7", TEN_PER_MINUTE).allowed());
    }

    @Test
    void disabledLimitLetsEverythingThrough() {
        Limit disabled = new Limit(0, Duration.ofMinutes(1));
        for (int i = 0; i < 100; i++) {
            assertTrue(limiter.tryConsume("k", disabled).allowed());
        }
    }

    @Test
    void nullLimitDoesNotBlowUp() {
        assertTrue(limiter.tryConsume("k", null).allowed());
    }

    @Test
    void evictsIdleBuckets() {
        limiter.tryConsume("stary", TEN_PER_MINUTE);
        advance(Duration.ofHours(3));
        limiter.tryConsume("nowy", TEN_PER_MINUTE);

        assertEquals(2, limiter.trackedKeys());
        limiter.evictIdleBuckets();

        assertEquals(1, limiter.trackedKeys(), "Bezczynny kubełek musi zniknąć — inaczej to wyciek pamięci");
    }

    @Test
    void evictionKeepsActiveBuckets() {
        limiter.tryConsume("aktywny", TEN_PER_MINUTE);
        advance(Duration.ofMinutes(10));

        limiter.evictIdleBuckets();
        assertEquals(1, limiter.trackedKeys());
    }

    // ---------- ClientIpResolver ----------

    @Test
    void clientIpPrefersForwardedForHeader() {
        // Za nginxem remoteAddr to adres proxy — bez XFF jeden użytkownik zablokowałby wszystkich
        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
        Mockito.when(request.getHeader("X-Forwarded-For")).thenReturn("203.0.113.7, 10.0.0.1");
        Mockito.when(request.getRemoteAddr()).thenReturn("10.0.0.1");

        assertEquals("203.0.113.7", new ClientIpResolver().resolve(request));
    }

    @Test
    void clientIpFallsBackToRemoteAddress() {
        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
        Mockito.when(request.getHeader("X-Forwarded-For")).thenReturn(null);
        Mockito.when(request.getRemoteAddr()).thenReturn("198.51.100.4");

        assertEquals("198.51.100.4", new ClientIpResolver().resolve(request));
    }

    @Test
    void clientIpHandlesBlankHeaderAndMissingRequest() {
        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
        Mockito.when(request.getHeader("X-Forwarded-For")).thenReturn("   ");
        Mockito.when(request.getRemoteAddr()).thenReturn("198.51.100.4");

        assertEquals("198.51.100.4", new ClientIpResolver().resolve(request));
        assertEquals("unknown", new ClientIpResolver().resolve(null));
    }
}
