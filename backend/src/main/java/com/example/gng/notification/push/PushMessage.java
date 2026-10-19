package com.example.gng.notification.push;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Treść powiadomienia push niezależna od dostawcy (dziś FCM).
 *
 * @param type  stabilny, maszynowy typ (np. {@code RESERVATION_CONFIRMED}) — klient może po nim
 *              rozgałęziać obsługę, tak jak po {@code code} błędów 6.3
 * @param title tytuł widoczny w powiadomieniu (PL)
 * @param body  treść widoczna w powiadomieniu (PL)
 * @param path  ścieżka w aplikacji otwierana po kliknięciu, względna (np. {@code /reservations})
 * @param tag   klucz zastępowania — kolejne powiadomienie z tym samym tagiem podmienia poprzednie
 * @param data  dodatkowe pola danych (np. {@code reservationId}); tylko stringi, bo tak przenosi je FCM
 */
public record PushMessage(String type, String title, String body, String path, String tag, Map<String, String> data) {

    public PushMessage {
        data = data == null ? Map.of() : Map.copyOf(data);
    }

    public static PushMessage of(String type, String title, String body, String path) {
        return new PushMessage(type, title, body, path, null, Map.of());
    }

    /** Pola danych wysyłane razem z blokiem notification (kopie tytułu i treści dla starszych klientów). */
    public Map<String, String> dataPayload() {
        Map<String, String> payload = new LinkedHashMap<>(data);
        payload.put("type", type);
        payload.put("title", title);
        payload.put("body", body);
        if (path != null) {
            payload.put("url", path);
            // Starszy service worker czyta link z click_action — zostawiamy dla zgodności
            payload.put("click_action", path);
        }
        return payload;
    }
}
