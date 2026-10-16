package com.example.gng.reservation.scheduler;

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

    public ReservationScheduler(ReservationService reservationService) {
        this.reservationService = reservationService;
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
}
