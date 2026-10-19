package com.example.gng.reservation.notification;

import com.example.gng.notification.push.PushMessage;
import com.example.gng.notification.push.PushNotificationService;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

/**
 * Push do klienta po zdarzeniach rezerwacji.
 *
 * <p>Słucha <b>po zatwierdzeniu</b> transakcji: push o rezerwacji, która się wycofała,
 * byłby kłamstwem. Sama wysyłka idzie w tle — odpowiedź HTTP na niego nie czeka.
 */
@Component
public class ReservationPushNotifier {

    private final PushNotificationService pushService;

    public ReservationPushNotifier(PushNotificationService pushService) {
        this.pushService = pushService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onReservationEvent(ReservationNotificationEvent event) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        PushMessage message = switch (event.type()) {
            case CONFIRMED -> ReservationPushMessages.confirmed(
                    event.reservationId(), event.offerName(), event.quantity(), event.expiresAt(), now);
            case COLLECTED -> ReservationPushMessages.collected(
                    event.reservationId(), event.offerName(), event.quantity());
        };
        pushService.sendToUserAsync(event.userId(), message);
    }
}
