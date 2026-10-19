package com.example.gng.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Inicjalizacja Firebase Admin SDK (FCM).
 *
 * <p>Ścieżka klucza serwisowego przychodzi z ENV {@code FIREBASE_CREDENTIALS_PATH}
 * (property {@code firebase.credentials-path}). Klucz nie leży w obrazie ani w JAR-ze —
 * w Dockerze jest montowany jako plik tylko do odczytu (docker-compose.yml).
 *
 * <ul>
 *   <li>Brak ścieżki albo pliku — aplikacja wstaje, pushe są wyłączone, w logu wyraźny WARN.
 *       Lokalnie i w testach to normalny stan.</li>
 *   <li>Plik jest, ale nie da się go wczytać (uszkodzony JSON, zły klucz) — błąd startu.
 *       Skoro ktoś skonfigurował FCM, cicha degradacja ukryłaby awarię na produkcji.</li>
 * </ul>
 */
@Configuration
public class FirebaseConfig {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseConfig.class);

    private final String credentialsPath;

    public FirebaseConfig(@Value("${firebase.credentials-path:}") String credentialsPath) {
        this.credentialsPath = credentialsPath == null ? "" : credentialsPath.trim();
    }

    @PostConstruct
    public void initialize() {
        if (!FirebaseApp.getApps().isEmpty()) {
            return;
        }
        if (credentialsPath.isEmpty()) {
            logger.warn("FCM wyłączone: brak FIREBASE_CREDENTIALS_PATH. Powiadomienia push nie będą wysyłane.");
            return;
        }

        Path path = Path.of(credentialsPath);
        if (!Files.isRegularFile(path) || !Files.isReadable(path)) {
            logger.warn("FCM wyłączone: nie znaleziono pliku klucza Firebase pod {} (FIREBASE_CREDENTIALS_PATH). "
                    + "Powiadomienia push nie będą wysyłane.", path.toAbsolutePath());
            return;
        }

        try (InputStream serviceAccount = Files.newInputStream(path)) {
            GoogleCredentials credentials = GoogleCredentials.fromStream(serviceAccount);
            FirebaseOptions.Builder options = FirebaseOptions.builder().setCredentials(credentials);
            if (credentials instanceof ServiceAccountCredentials account && account.getProjectId() != null) {
                options.setProjectId(account.getProjectId());
            }
            FirebaseApp app = FirebaseApp.initializeApp(options.build());
            logger.info("FCM włączone: Firebase zainicjalizowany (projekt {})", app.getOptions().getProjectId());
        } catch (IOException | RuntimeException e) {
            throw new IllegalStateException(
                    "Nie udało się zainicjalizować Firebase z pliku " + path.toAbsolutePath()
                            + " — sprawdź klucz serwisowy albo usuń FIREBASE_CREDENTIALS_PATH, żeby wyłączyć FCM.", e);
        }
    }
}
