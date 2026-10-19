package com.example.gng.reservation.notification;

import com.example.gng.notification.push.PushMessage;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Treści pushy i okno odbioru. Czas w testach: UTC; Warszawa w październiku to UTC+2. */
class ReservationPushMessagesTest {

    // 19.10.2026 12:00 UTC = 14:00 w Warszawie
    private static final LocalDateTime NOW_UTC = LocalDateTime.of(2026, 10, 19, 12, 0);

    @Test
    void confirmedShowsLocalDeadlineAndDeepLinkWithoutPickupCode() {
        PushMessage message = ReservationPushMessages.confirmed("R1", "Chleb żytni", 2,
                LocalDateTime.of(2026, 10, 20, 12, 0), NOW_UTC);

        assertEquals("RESERVATION_CONFIRMED", message.type());
        assertEquals("Rezerwacja potwierdzona", message.title());
        assertEquals("Chleb żytni · 2 szt. czeka na Ciebie do jutro 14:00. Kod odbioru znajdziesz w aplikacji.", message.body());
        assertEquals("/reservations?reservationId=R1", message.path());
        assertEquals("reservation-R1", message.tag());
        assertEquals("R1", message.dataPayload().get("reservationId"));
        assertEquals("/reservations?reservationId=R1", message.dataPayload().get("url"));
    }

    @Test
    void expiryWarningUsesTimeOnlyForToday() {
        PushMessage message = ReservationPushMessages.expiryWarning("R1", "Bagietki", LocalDateTime.of(2026, 10, 19, 13, 30), NOW_UTC);

        assertEquals("Bagietki: odbierz do 15:30, inaczej sztuki wrócą do sprzedaży.", message.body());
    }

    @Test
    void laterDateIsShownWithDay() {
        assertEquals("22.10, 09:00", ReservationPushMessages.when(LocalDateTime.of(2026, 10, 22, 7, 0), NOW_UTC));
    }

    @Test
    void pickupReminderIncludesWindow() {
        PushMessage message = ReservationPushMessages.pickupReminder("R1", "Jogurty", "15:00", "21:00");

        assertEquals("Możesz już odebrać", message.title());
        assertEquals("Jogurty: odbiór dziś 15:00–21:00. Pokaż kod odbioru w sklepie.", message.body());
    }

    @Test
    void pickupWindowIsEvaluatedInPilotTimeZone() {
        // 14:00 w Warszawie
        assertTrue(ReservationPushMessages.isPickupWindowOpen("14:00", "20:00", NOW_UTC), "start okna włącznie");
        assertFalse(ReservationPushMessages.isPickupWindowOpen("15:00", "20:00", NOW_UTC), "przed otwarciem");
        assertFalse(ReservationPushMessages.isPickupWindowOpen("08:00", "14:00", NOW_UTC), "koniec okna wyłącznie");
        // Gdyby liczyć w UTC (12:00), okno 12:00–13:00 byłoby otwarte — w Warszawie jest już 14:00
        assertFalse(ReservationPushMessages.isPickupWindowOpen("12:00", "13:00", NOW_UTC));
    }

    @Test
    void overnightWindowAndSingleDigitHoursAreSupported() {
        LocalDateTime lateEvening = LocalDateTime.of(2026, 10, 19, 21, 30); // 23:30 w Warszawie
        assertTrue(ReservationPushMessages.isPickupWindowOpen("22:00", "02:00", lateEvening));
        assertTrue(ReservationPushMessages.isPickupWindowOpen("8:00", "16:00", NOW_UTC));
    }

    @Test
    void malformedWindowNeverOpens() {
        assertFalse(ReservationPushMessages.isPickupWindowOpen(null, "20:00", NOW_UTC));
        assertFalse(ReservationPushMessages.isPickupWindowOpen("rano", "wieczór", NOW_UTC));
        assertFalse(ReservationPushMessages.isPickupWindowOpen("10:00", "10:00", NOW_UTC));
    }
}
