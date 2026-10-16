package com.example.gng.common.ratelimit;

import com.example.gng.common.ratelimit.RateLimitProperties.Limit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

/**
 * Limiter tempa żądań metodą token bucket, trzymany w pamięci procesu.
 *
 * <p><b>OGRANICZENIE: działa dla JEDNEJ instancji aplikacji.</b> Kubełki żyją w pamięci,
 * więc przy dwóch instancjach za load balancerem każda liczy osobno i efektywny limit
 * jest dwukrotnie wyższy. Na pilotaż (jedna instancja w docker compose) to wystarcza;
 * przy skalowaniu poziomym trzeba przenieść licznik do Redisa — pozycja w
 * docs/05_DLUG_I_DECYZJE.md jako dług po pilotażu.
 *
 * <p>Dlaczego token bucket, a nie okno stałe: okno stałe przepuszcza serię na granicy
 * okien (11 żądań w 2 sekundach na przełomie godziny) i jednocześnie odrzuca żądanie
 * numer 11 rozłożone równomiernie. Bucket uzupełnia się ciągle, więc klient w normalnym
 * tempie nigdy nie zobaczy odmowy, a seria jest ograniczona pojemnością.
 *
 * <p>Zegar jest wstrzykiwany, żeby testy mogły sprawdzić odtworzenie limitu po czasie
 * bez realnego oczekiwania.
 */
@Component
public class TokenBucketRateLimiter {

    private static final Logger logger = LoggerFactory.getLogger(TokenBucketRateLimiter.class);

    /**
     * Po jakim czasie bezczynności kubełek jest usuwany. Bez tego mapa rośnie bez
     * ograniczeń — atakujący rotujący adresami IP zamieniłby limiter w wyciek pamięci.
     */
    private static final long IDLE_EVICTION_NANOS = java.time.Duration.ofHours(2).toNanos();

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final LongSupplier clock;

    public TokenBucketRateLimiter() {
        this(System::nanoTime);
    }

    /**
     * Konstruktor z własnym źródłem czasu (monotoniczne nanosekundy).
     *
     * Publiczny, bo używają go testy z innych pakietów — sterowany zegar jest jedynym
     * sposobem sprawdzenia odtwarzania limitu bez realnego oczekiwania minut czy godzin.
     */
    public TokenBucketRateLimiter(LongSupplier nanoTimeSupplier) {
        this.clock = nanoTimeSupplier;
    }

    /**
     * Próbuje pobrać jeden token dla podanego klucza.
     *
     * @param key   klucz limitu, np. {@code "reservation-create:42"}. Musi zawierać nazwę
     *              limitu, żeby ten sam użytkownik miał osobne kubełki dla różnych akcji.
     * @param limit pojemność i okres
     */
    public RateLimitResult tryConsume(String key, Limit limit) {
        if (limit == null || limit.getCapacity() <= 0 || limit.getPeriod() == null
                || limit.getPeriod().isZero() || limit.getPeriod().isNegative()) {
            // Limit wyłączony konfiguracją — przepuszczamy, ale zostawiamy ślad w logu,
            // żeby wyłączenie limitu nie było niewidoczne
            logger.warn("Limit dla klucza {} jest nieskonfigurowany lub wyłączony — przepuszczam", key);
            return RateLimitResult.allow();
        }

        Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket(limit.getCapacity(), clock.getAsLong()));
        return bucket.tryConsume(limit, clock.getAsLong());
    }

    /** Usuwa kubełki, z których nikt nie korzystał — patrz IDLE_EVICTION_NANOS. */
    @Scheduled(fixedDelay = 30 * 60 * 1000L) // co 30 minut
    public void evictIdleBuckets() {
        long now = clock.getAsLong();
        int before = buckets.size();
        buckets.entrySet().removeIf(entry -> now - entry.getValue().lastAccessNanos() > IDLE_EVICTION_NANOS);
        int removed = before - buckets.size();
        if (removed > 0) {
            logger.debug("Usunięto {} bezczynnych kubełków limitera, pozostało {}", removed, buckets.size());
        }
    }

    /** Liczba aktywnych kubełków — do testów i diagnostyki. */
    public int trackedKeys() {
        return buckets.size();
    }

    /**
     * Pojedynczy kubełek. Operacje są krótkie i pod monitorem — dla trzech endpointów
     * to nieistotny narzut, a kod jest oczywiście poprawny współbieżnie.
     */
    private static final class Bucket {

        private double tokens;
        private long lastRefillNanos;

        private Bucket(int capacity, long now) {
            this.tokens = capacity;
            this.lastRefillNanos = now;
        }

        private synchronized RateLimitResult tryConsume(Limit limit, long now) {
            refill(limit, now);

            if (tokens >= 1.0d) {
                tokens -= 1.0d;
                return RateLimitResult.allow();
            }

            // Ile czasu brakuje do jednego pełnego tokenu
            double tokensPerNano = (double) limit.getCapacity() / limit.getPeriod().toNanos();
            double missing = 1.0d - tokens;
            long waitNanos = (long) Math.ceil(missing / tokensPerNano);
            long waitSeconds = (long) Math.ceil(waitNanos / 1_000_000_000.0d);

            return RateLimitResult.deny(waitSeconds);
        }

        private void refill(Limit limit, long now) {
            long elapsed = now - lastRefillNanos;
            if (elapsed <= 0) {
                lastRefillNanos = now;
                return;
            }
            double tokensPerNano = (double) limit.getCapacity() / limit.getPeriod().toNanos();
            tokens = Math.min(limit.getCapacity(), tokens + elapsed * tokensPerNano);
            lastRefillNanos = now;
        }

        private synchronized long lastAccessNanos() {
            return lastRefillNanos;
        }
    }
}
