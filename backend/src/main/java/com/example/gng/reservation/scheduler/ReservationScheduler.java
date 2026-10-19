package com.example.gng.reservation.scheduler;

import com.example.gng.reservation.notification.ReservationReminderService;
import com.example.gng.reservation.service.ReservationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Wygaszanie przeterminowanych rezerwacji (docs/04_REZERWACJE_DESIGN.md, sekcja 5).
 *
 * Wzorowane na {@code OfferStatusScheduler}, ale częstotliwość jest inna: hold trwa
 * domyślnie 24 h, a dostępność liczy się z {@code expiresAt}, więc towar zwalnia się sam
 * z upływem czasu. Scheduler tylko porządkuje statusy, żeby listy użytkownika i przyszłe
 * statystyki nie pokazywały wygasłych rezerwacji jako aktywnych — dlatego co 5 minut,
 * a nie raz na dobę.
 */
@Component
public class ReservationScheduler {

    private static final Logger logger = LoggerFactory.getLogger(ReservationScheduler.class);

    private final ReservationService reservationService;
    private final ReservationReminderService reminderService;

    public ReservationScheduler(ReservationService reservationService, ReservationReminderService reminderService) {
        this.reservationService = reservationService;
        this.reminderService = reminderService;
    }

    @Scheduled(cron = "0 */5 * * * ?") // Co 5 minut
    public void expireOverdueReservations() {
        try {
            int expired = reservationService.expireOverdueReservations();
            if (expired > 0) {
                logger.info("Wygaszono {} przeterminowanych rezerwacji", expired);
            }
        } catch (Exception e) {
            logger.error("Błąd podczas wygaszania przeterminowanych rezerwacji: {}", e.getMessage(), e);
        }
    }

    /**
     * Pushe przed końcem holdu i przy otwarciu okna odbioru (docs/08 #5). Przesunięte o minutę
     * względem wygaszania, żeby nie konkurować z nim o te same wiersze. Wysyłka co najwyżej raz
     * zapewnia claim w {@link ReservationReminderService}, nie ten harmonogram.
     */
    @Scheduled(cron = "0 1/5 * * * ?")
    public void sendReservationReminders() {
        try {
            reminderService.sendExpiryWarnings();
        } catch (Exception e) {
            logger.error("Błąd podczas wysyłki ostrzeżeń o wygaśnięciu: {}", e.getMessage(), e);
        }
        try {
            reminderService.sendPickupReminders();
        } catch (Exception e) {
            logger.error("Błąd podczas wysyłki przypomnień o odbiorze: {}", e.getMessage(), e);
        }
    }
}
