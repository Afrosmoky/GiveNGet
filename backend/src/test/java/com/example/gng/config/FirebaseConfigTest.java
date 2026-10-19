package com.example.gng.config;

import com.google.firebase.FirebaseApp;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Start aplikacji wobec klucza Firebase: brak klucza nie blokuje startu (pushe wyłączone),
 * uszkodzony klucz blokuje — wcześniej błąd był połykany i FCM po cichu nie działał.
 */
class FirebaseConfigTest {

    @BeforeEach
    void noFirebaseApp() {
        FirebaseApp.getApps().forEach(FirebaseApp::delete);
    }

    @Test
    void missingPathKeepsApplicationRunningWithPushDisabled() {
        assertDoesNotThrow(() -> new FirebaseConfig("").initialize());
        assertTrue(FirebaseApp.getApps().isEmpty());
    }

    @Test
    void missingFileKeepsApplicationRunningWithPushDisabled(@TempDir Path dir) {
        assertDoesNotThrow(() -> new FirebaseConfig(dir.resolve("brak.json").toString()).initialize());
        assertTrue(FirebaseApp.getApps().isEmpty());
    }

    @Test
    void directoryInsteadOfFileIsTreatedAsMissing(@TempDir Path dir) {
        // Docker tworzy katalog w miejscu nieistniejącego pliku montowanego jako wolumen
        assertDoesNotThrow(() -> new FirebaseConfig(dir.toString()).initialize());
        assertTrue(FirebaseApp.getApps().isEmpty());
    }

    @Test
    void corruptKeyFailsStartupLoudly(@TempDir Path dir) throws Exception {
        Path key = Files.writeString(dir.resolve("key.json"), "{\"type\":\"service_account\",\"to nie jest\":\"klucz\"}");

        assertThrows(IllegalStateException.class, () -> new FirebaseConfig(key.toString()).initialize());
        assertTrue(FirebaseApp.getApps().isEmpty());
    }
}
