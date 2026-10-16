package com.example.gng.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Sprawdza na starcie, że konfiguracja wrażliwa jest faktycznie ustawiona.
 *
 * <p>Brak zmiennej środowiskowej wyłapuje już Spring: placeholder {@code ${JWT_SECRET}} bez
 * wartości domyślnej nie da się rozwiązać i aplikacja nie wstanie, podając nazwę zmiennej.
 * Ta klasa domyka drugi przypadek — zmienną <b>ustawioną, ale pustą</b>. Spring rozwiąże ją
 * do pustego stringa i wystartuje, a problem wyszedłby dopiero przy pierwszym logowaniu
 * (pusty klucz HS256) albo przy pierwszym mailu. Wolimy nie wstać niż wstać po cichu z
 * konfiguracją, która nie działa.
 *
 * <p>Nie logujemy wartości sekretów — wyłącznie to, czy są obecne i czy mają sensowną długość.
 */
@Component
public class StartupConfigurationCheck {

    private static final Logger logger = LoggerFactory.getLogger(StartupConfigurationCheck.class);

    /**
     * HS256 podpisuje kluczem o długości co najmniej 256 bitów. Krótszy sekret i tak zostałby
     * odrzucony przez jjwt przy pierwszym wystawieniu tokenu — lepiej dowiedzieć się na starcie.
     */
    private static final int MIN_JWT_SECRET_LENGTH = 32;

    private final String jwtSecret;
    private final String mailUsername;
    private final String mailPassword;
    private final String geoapifyKey;
    private final CorsProperties corsProperties;

    public StartupConfigurationCheck(@Value("${jwt.secret}") String jwtSecret,
                                     @Value("${spring.mail.username}") String mailUsername,
                                     @Value("${spring.mail.password}") String mailPassword,
                                     @Value("${geoapify.api.key}") String geoapifyKey,
                                     CorsProperties corsProperties) {
        this.jwtSecret = jwtSecret;
        this.mailUsername = mailUsername;
        this.mailPassword = mailPassword;
        this.geoapifyKey = geoapifyKey;
        this.corsProperties = corsProperties;
    }

    @PostConstruct
    void verify() {
        List<String> problems = new ArrayList<>();

        if (isBlank(jwtSecret)) {
            problems.add("JWT_SECRET jest pusty — ustaw losowy sekret o długości min. "
                    + MIN_JWT_SECRET_LENGTH + " znaków");
        } else if (jwtSecret.length() < MIN_JWT_SECRET_LENGTH) {
            problems.add("JWT_SECRET ma " + jwtSecret.length() + " znaków, a HS256 wymaga min. "
                    + MIN_JWT_SECRET_LENGTH);
        }

        if (isBlank(mailUsername)) {
            problems.add("SMTP_USERNAME jest pusty — bez niego nie wyjdą maile aktywacyjne");
        }
        if (isBlank(mailPassword)) {
            problems.add("SMTP_PASSWORD jest pusty — bez niego nie wyjdą maile aktywacyjne");
        }
        if (isBlank(geoapifyKey)) {
            problems.add("GEOAPIFY_KEY jest pusty — geokodowanie i mapa nie zadziałają");
        }

        List<String> origins = corsProperties.resolvedOrigins();
        if (origins.isEmpty()) {
            problems.add("CORS_ALLOWED_ORIGINS jest pusty — żaden frontend nie połączy się z API");
        }
        if (origins.contains("*")) {
            problems.add("CORS_ALLOWED_ORIGINS zawiera '*' — wildcard jest niedozwolony, "
                    + "podaj konkretne originy rozdzielone przecinkiem");
        }

        if (!problems.isEmpty()) {
            throw new IllegalStateException(
                    "Nieprawidłowa konfiguracja startowa. Ustaw brakujące zmienne środowiskowe "
                            + "(patrz .env.example):\n  - " + String.join("\n  - ", problems));
        }

        logger.info("Konfiguracja startowa zweryfikowana. Dozwolone originy CORS: {}", origins);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
