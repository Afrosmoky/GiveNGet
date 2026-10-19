package com.example.gng.reservation.notification;

import com.example.gng.notification.push.PushMessage;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Map;
import java.util.Optional;

/**
 * Treści pushy o rezerwacji (PL). Kod odbioru celowo NIE trafia do powiadomienia — jest
 * sekretem potwierdzającym odbiór, a treść pushy widać na zablokowanym ekranie.
 */
public final class ReservationPushMessages {

    /** Strefa użytkowników pilotażu — w niej podajemy godziny w treści. */
    public static final ZoneId PILOT_ZONE = ZoneId.of("Europe/Warsaw");

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d.MM");

    private ReservationPushMessages() {
    }

    public static PushMessage confirmed(String reservationId, String offerName, int quantity,
                                        LocalDateTime expiresAtUtc, LocalDateTime nowUtc) {
        return message("RESERVATION_CONFIRMED", reservationId, "Rezerwacja potwierdzona",
                String.format("%s · %d szt. czeka na Ciebie do %s. Kod odbioru znajdziesz w aplikacji.",
                        offerName, quantity, when(expiresAtUtc, nowUtc)));
    }

    public static PushMessage pickupReminder(String reservationId, String offerName, String pickupFrom, String pickupTo) {
        String window = pickupFrom != null && pickupTo != null ? " dziś " + pickupFrom + "–" + pickupTo : " teraz";
        return message("RESERVATION_PICKUP_REMINDER", reservationId, "Możesz już odebrać",
                String.format("%s: odbiór%s. Pokaż kod odbioru w sklepie.", offerName, window));
    }

    public static PushMessage expiryWarning(String reservationId, String offerName,
                                            LocalDateTime expiresAtUtc, LocalDateTime nowUtc) {
        return message("RESERVATION_EXPIRY_WARNING", reservationId, "Rezerwacja wkrótce wygaśnie",
                String.format("%s: odbierz do %s, inaczej sztuki wrócą do sprzedaży.",
                        offerName, when(expiresAtUtc, nowUtc)));
    }

    public static PushMessage collected(String reservationId, String offerName, int quantity) {
        return message("RESERVATION_COLLECTED", reservationId, "Odbiór potwierdzony",
                String.format("%s · %d szt. Dziękujemy, że ratujesz jedzenie!", offerName, quantity));
    }

    /**
     * Czy okno odbioru oferty („HH:mm”–„HH:mm”, codzienne) jest otwarte w podanej chwili czasu
     * pilotażu. Okno przez północ (np. 22:00–02:00) też jest obsłużone. Niepoprawny zapis → false.
     */
    public static boolean isPickupWindowOpen(String from, String to, LocalDateTime nowUtc) {
        Optional<LocalTime> start = parseTime(from);
        Optional<LocalTime> end = parseTime(to);
        if (start.isEmpty() || end.isEmpty() || start.get().equals(end.get())) {
            return false;
        }
        LocalTime now = toPilotZone(nowUtc).toLocalTime();
        if (start.get().isBefore(end.get())) {
            return !now.isBefore(start.get()) && now.isBefore(end.get());
        }
        return !now.isBefore(start.get()) || now.isBefore(end.get());
    }

    /** Deep link do rezerwacji w aplikacji (web i mobile rozumieją tę samą ścieżkę). */
    public static String reservationPath(String reservationId) {
        return "/reservations?reservationId=" + reservationId;
    }

    private static PushMessage message(String type, String reservationId, String title, String body) {
        return new PushMessage(type, title, body, reservationPath(reservationId),
                "reservation-" + reservationId, Map.of("reservationId", reservationId));
    }

    /** „18:30”, „jutro 18:30” albo „20.10, 18:30” — w strefie pilotażu. */
    static String when(LocalDateTime utc, LocalDateTime nowUtc) {
        ZonedDateTime local = toPilotZone(utc);
        LocalDate today = toPilotZone(nowUtc).toLocalDate();
        String time = local.format(TIME);
        if (local.toLocalDate().equals(today)) {
            return time;
        }
        if (local.toLocalDate().equals(today.plusDays(1))) {
            return "jutro " + time;
        }
        return local.format(DAY) + ", " + time;
    }

    private static ZonedDateTime toPilotZone(LocalDateTime utc) {
        return utc.atOffset(ZoneOffset.UTC).atZoneSameInstant(PILOT_ZONE);
    }

    private static Optional<LocalTime> parseTime(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(LocalTime.parse(value.trim().length() == 4 ? "0" + value.trim() : value.trim(), TIME));
        } catch (DateTimeParseException e) {
            return Optional.empty();
        }
    }
}
