package com.example.gng.notification.push;

import com.example.gng.chat.entity.FcmToken;
import com.example.gng.chat.service.FcmTokenService;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Wysyłka pushy do użytkownika: wszystkie jego aktywne urządzenia, prosty retry na błędach
 * przejściowych i sprzątanie martwych tokenów.
 *
 * <p>Metody {@code *Async} idą na własną, małą pulę wątków — wysyłka trwa setki milisekund
 * i nie może przedłużać żądania HTTP ani wątku WebSocket. Pula jest prywatna, a nie beanem
 * {@code Executor}: taki bean wyłączyłby autokonfigurowany {@code applicationTaskExecutor}
 * Spring Boota. Przy zapchanej kolejce push przepada z logiem — to powiadomienie, nie transakcja.
 */
@Service
public class PushNotificationService {

    private static final Logger logger = LoggerFactory.getLogger(PushNotificationService.class);

    /** Łącznie prób na jeden token (pierwsza + ponowienia). */
    static final int MAX_ATTEMPTS = 3;
    private static final long BASE_BACKOFF_MS = 300;

    private final PushGateway gateway;
    private final FcmTokenService tokenService;
    private final Sleeper sleeper;
    private final Executor executor;

    @Autowired
    public PushNotificationService(PushGateway gateway, FcmTokenService tokenService) {
        this(gateway, tokenService, Thread::sleep, newPushExecutor());
    }

    PushNotificationService(PushGateway gateway, FcmTokenService tokenService, Sleeper sleeper, Executor executor) {
        this.gateway = gateway;
        this.tokenService = tokenService;
        this.sleeper = sleeper;
        this.executor = executor;
    }

    /** Asynchronicznie — patrz {@link #sendToUser}. */
    public void sendToUserAsync(Long userId, PushMessage message) {
        executor.execute(guarded(() -> sendToUser(userId, message), message));
    }

    /** Asynchronicznie — patrz {@link #sendToToken}. */
    public void sendToTokenAsync(String token, PushMessage message) {
        executor.execute(guarded(() -> sendToToken(token, message), message));
    }

    /** Błąd w tle nie może zabić wątku puli po cichu — logujemy go z typem powiadomienia. */
    private static Runnable guarded(Runnable task, PushMessage message) {
        return () -> {
            try {
                task.run();
            } catch (RuntimeException e) {
                logger.error("Błąd wysyłki push {} w tle: {}", message.type(), e.getMessage(), e);
            }
        };
    }

    @PreDestroy
    void shutdown() {
        if (executor instanceof ExecutorService service) {
            service.shutdown();
        }
    }

    private static ExecutorService newPushExecutor() {
        AtomicInteger counter = new AtomicInteger();
        return new ThreadPoolExecutor(2, 4, 60, TimeUnit.SECONDS, new ArrayBlockingQueue<>(500),
                runnable -> {
                    Thread thread = new Thread(runnable, "push-" + counter.incrementAndGet());
                    thread.setDaemon(true);
                    return thread;
                },
                (task, pool) -> logger.warn("Kolejka pushy pełna — powiadomienie pominięte"));
    }

    /**
     * Wysyła na wszystkie ważne tokeny użytkownika.
     *
     * @return liczba urządzeń, na które push wyszedł
     */
    public int sendToUser(Long userId, PushMessage message) {
        if (!gateway.isEnabled()) {
            logger.debug("Push {} do użytkownika {} pominięty — FCM nieskonfigurowany", message.type(), userId);
            return 0;
        }
        List<FcmToken> tokens = tokenService.getValidTokensForUserId(userId);
        if (tokens.isEmpty()) {
            logger.debug("Push {} do użytkownika {} pominięty — brak zarejestrowanych urządzeń", message.type(), userId);
            return 0;
        }
        int sent = 0;
        for (FcmToken token : tokens) {
            if (sendToToken(token.getToken(), message) == PushSendResult.SENT) {
                sent++;
            }
        }
        logger.info("Push {} do użytkownika {}: wysłano na {}/{} urządzeń", message.type(), userId, sent, tokens.size());
        return sent;
    }

    /**
     * Wysyła na jeden token: ponawia błędy przejściowe z rosnącym odstępem, martwy token usuwa.
     */
    public PushSendResult sendToToken(String token, PushMessage message) {
        PushSendResult result = PushSendResult.TRANSIENT_ERROR;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            result = gateway.send(token, message);
            if (result != PushSendResult.TRANSIENT_ERROR) {
                break;
            }
            if (attempt < MAX_ATTEMPTS && !pause(BASE_BACKOFF_MS * attempt * attempt)) {
                break;
            }
        }

        if (result == PushSendResult.INVALID_TOKEN) {
            tokenService.removeInvalidToken(token);
            logger.info("Usunięto martwy token FCM (…{}) po odrzuceniu pusha {}", tail(token), message.type());
        } else if (result == PushSendResult.TRANSIENT_ERROR) {
            logger.warn("Push {} nie wyszedł po {} próbach (błąd przejściowy) — token zostaje", message.type(), MAX_ATTEMPTS);
        }
        return result;
    }

    private boolean pause(long millis) {
        try {
            sleeper.sleep(millis);
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    /** Końcówka tokenu do logów — całego nie logujemy, to identyfikator urządzenia. */
    private static String tail(String token) {
        return token == null || token.length() < 8 ? "?" : token.substring(token.length() - 8);
    }

    @FunctionalInterface
    interface Sleeper {
        void sleep(long millis) throws InterruptedException;
    }
}
