package com.example.gng.reservation.notification;

import com.example.gng.notification.push.PushNotificationService;
import com.example.gng.reservation.entity.ReservationEntity;
import com.example.gng.reservation.repository.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Pushe wysyłane przez scheduler: ostrzeżenie o wygaśnięciu i przypomnienie o odbiorze.
 *
 * <p><b>Co najwyżej raz.</b> Każdą wysyłkę poprzedza „claim” — warunkowy UPDATE znacznika
 * {@code *_sent_at} w osobnej, od razu zatwierdzonej transakcji. Tylko przebieg, któremu
 * UPDATE zmienił wiersz, wysyła push; nakładające się przebiegi i kolejne instancje aplikacji
 * dostają 0 i pomijają rezerwację. Ceną jest brak ponowienia, gdy po claimie padnie wysyłka —
 * dla przypomnienia to lepsze niż dwa takie same powiadomienia.
 *
 * <p>Sama wysyłka idzie na pulę pushy: scheduler Springa dzieli wątki z brokerem WebSocket
 * (STOMP), a wysyłka trwa setki milisekund na urządzenie.
 */
@Service
public class ReservationReminderService {

    private static final Logger logger = LoggerFactory.getLogger(ReservationReminderService.class);

    private final ReservationRepository reservationRepository;
    private final PushNotificationService pushService;
    private final long expiryWarningBeforeMinutes;
    private final long pickupReminderMinAgeMinutes;
    private final Clock clock;

    @Autowired
    public ReservationReminderService(ReservationRepository reservationRepository,
                                      PushNotificationService pushService,
                                      @Value("${reservation.expiry-warning-before-minutes:120}") long expiryWarningBeforeMinutes,
                                      @Value("${reservation.pickup-reminder-min-age-minutes:30}") long pickupReminderMinAgeMinutes) {
        this(reservationRepository, pushService, expiryWarningBeforeMinutes, pickupReminderMinAgeMinutes, Clock.systemUTC());
    }

    ReservationReminderService(ReservationRepository reservationRepository, PushNotificationService pushService,
                               long expiryWarningBeforeMinutes, long pickupReminderMinAgeMinutes, Clock clock) {
        this.reservationRepository = reservationRepository;
        this.pushService = pushService;
        this.expiryWarningBeforeMinutes = expiryWarningBeforeMinutes;
        this.pickupReminderMinAgeMinutes = pickupReminderMinAgeMinutes;
        this.clock = clock;
    }

    /** @return liczba wysłanych ostrzeżeń (przejętych claimów) */
    public int sendExpiryWarnings() {
        LocalDateTime now = LocalDateTime.now(clock);
        List<ReservationEntity> candidates = reservationRepository.findExpiryWarningCandidates(
                now, now.plusMinutes(expiryWarningBeforeMinutes));

        int sent = 0;
        for (ReservationEntity reservation : candidates) {
            if (reservationRepository.claimExpiryWarning(reservation.getId(), now) != 1) {
                continue;
            }
            pushService.sendToUserAsync(reservation.getUser().getId(), ReservationPushMessages.expiryWarning(
                    reservation.getId(), reservation.getOffer().getName(), reservation.getExpiresAt(), now));
            sent++;
        }
        if (sent > 0) {
            logger.info("Wysłano {} ostrzeżeń o wygaśnięciu rezerwacji", sent);
        }
        return sent;
    }

    /** @return liczba wysłanych przypomnień (przejętych claimów) */
    public int sendPickupReminders() {
        LocalDateTime now = LocalDateTime.now(clock);
        List<ReservationEntity> candidates = reservationRepository.findPickupReminderCandidates(
                now, now.minusMinutes(pickupReminderMinAgeMinutes));

        int sent = 0;
        for (ReservationEntity reservation : candidates) {
            String from = reservation.getOffer().getPickupDateFrom();
            String to = reservation.getOffer().getPickupDateTo();
            if (!ReservationPushMessages.isPickupWindowOpen(from, to, now)) {
                continue;
            }
            if (reservationRepository.claimPickupReminder(reservation.getId(), now) != 1) {
                continue;
            }
            pushService.sendToUserAsync(reservation.getUser().getId(), ReservationPushMessages.pickupReminder(
                    reservation.getId(), reservation.getOffer().getName(), from, to));
            sent++;
        }
        if (sent > 0) {
            logger.info("Wysłano {} przypomnień o odbiorze", sent);
        }
        return sent;
    }
}
