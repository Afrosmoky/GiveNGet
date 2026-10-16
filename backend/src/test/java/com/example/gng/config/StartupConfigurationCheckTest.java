package com.example.gng.config;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Walidacja konfiguracji startowej.
 *
 * Brak zmiennej środowiskowej wyłapuje sam Spring (nierozwiązany placeholder), co
 * zweryfikowano uruchomieniem aplikacji. Ten test pokrywa drugi przypadek — zmienną
 * obecną, ale bezużyteczną: pustą, za krótką albo z wildcardem w CORS. Taka konfiguracja
 * przeszłaby rozwiązywanie placeholderów i aplikacja wstałaby po cichu, a problem wyszedłby
 * dopiero przy pierwszym logowaniu albo pierwszym żądaniu z przeglądarki.
 */
class StartupConfigurationCheckTest {

    private static final String VALID_SECRET = "0123456789abcdef0123456789abcdef";

    private static CorsProperties cors(String... origins) {
        CorsProperties properties = new CorsProperties();
        properties.setAllowedOrigins(List.of(origins));
        return properties;
    }

    private static StartupConfigurationCheck check(String jwtSecret, String mailUsername,
                                                   String mailPassword, String geoapifyKey,
                                                   CorsProperties corsProperties) {
        return new StartupConfigurationCheck(jwtSecret, mailUsername, mailPassword, geoapifyKey, corsProperties);
    }

    private static StartupConfigurationCheck valid() {
        return check(VALID_SECRET, "konto@example.com", "haslo", "klucz",
                cors("http://localhost:3000"));
    }

    @Test
    void acceptsCompleteConfiguration() {
        assertDoesNotThrow(() -> valid().verify());
    }

    @Test
    void rejectsEmptyJwtSecret() {
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> check("", "konto@example.com", "haslo", "klucz", cors("http://localhost:3000")).verify());
        assertTrue(ex.getMessage().contains("JWT_SECRET"), ex.getMessage());
    }

    @Test
    void rejectsBlankJwtSecret() {
        assertThrows(IllegalStateException.class,
                () -> check("   ", "konto@example.com", "haslo", "klucz", cors("http://localhost:3000")).verify());
    }

    @Test
    void rejectsJwtSecretShorterThanHs256Requires() {
        // HS256 wymaga 256 bitów; jjwt odrzuciłby krótszy klucz przy pierwszym tokenie
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> check("zakrotki", "konto@example.com", "haslo", "klucz",
                        cors("http://localhost:3000")).verify());
        assertTrue(ex.getMessage().contains("HS256"), ex.getMessage());
    }

    @Test
    void rejectsMissingSmtpCredentials() {
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> check(VALID_SECRET, "", "", "klucz", cors("http://localhost:3000")).verify());
        assertTrue(ex.getMessage().contains("SMTP_USERNAME"), ex.getMessage());
        assertTrue(ex.getMessage().contains("SMTP_PASSWORD"), ex.getMessage());
    }

    @Test
    void rejectsMissingGeoapifyKey() {
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> check(VALID_SECRET, "konto@example.com", "haslo", " ",
                        cors("http://localhost:3000")).verify());
        assertTrue(ex.getMessage().contains("GEOAPIFY_KEY"), ex.getMessage());
    }

    @Test
    void rejectsEmptyCorsOrigins() {
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> check(VALID_SECRET, "konto@example.com", "haslo", "klucz", cors()).verify());
        assertTrue(ex.getMessage().contains("CORS_ALLOWED_ORIGINS"), ex.getMessage());
    }

    @Test
    void rejectsCorsWildcard() {
        // Wildcard z allowCredentials(true) otwiera API na dowolną stronę
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> check(VALID_SECRET, "konto@example.com", "haslo", "klucz", cors("*")).verify());
        assertTrue(ex.getMessage().contains("wildcard"), ex.getMessage());
    }

    @Test
    void reportsAllProblemsAtOnce() {
        // Jeden restart powinien wystarczyć do poznania wszystkich braków
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> check("", "", "", "", cors()).verify());
        for (String expected : new String[]{"JWT_SECRET", "SMTP_USERNAME", "SMTP_PASSWORD",
                "GEOAPIFY_KEY", "CORS_ALLOWED_ORIGINS"}) {
            assertTrue(ex.getMessage().contains(expected), "Brak " + expected + " w: " + ex.getMessage());
        }
    }

    @Test
    void corsPropertiesDropBlankEntries() {
        // Trailing comma w CORS_ALLOWED_ORIGINS nie może dawać pustego originu
        CorsProperties properties = cors("http://localhost:3000", "", "  ", "https://biovlo.com");
        assertTrue(properties.resolvedOrigins().containsAll(
                List.of("http://localhost:3000", "https://biovlo.com")));
        assertTrue(properties.resolvedOrigins().size() == 2);
    }

    @Test
    void corsPropertiesTrimWhitespace() {
        assertTrue(cors(" http://localhost:3000 ").resolvedOrigins().contains("http://localhost:3000"));
    }
}
