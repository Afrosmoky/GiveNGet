package com.example.gng.chat.service;

import com.example.gng.chat.dto.NotificationRequest;
import com.example.gng.notification.push.PushMessage;
import com.example.gng.notification.push.PushNotificationService;
import org.springframework.stereotype.Service;

/**
 * Pushe czatu (1:1 i z konsultantem). Cienka warstwa nad {@link PushNotificationService} —
 * ta sama budowa wiadomości (blok notification + deep link), ponowienia i sprzątanie martwych
 * tokenów co przy rezerwacjach. Wysyłka w tle, żeby nie blokować wątku WebSocket.
 */
@Service
public class FcmNotificationService {

    private final PushNotificationService pushNotificationService;

    public FcmNotificationService(PushNotificationService pushNotificationService) {
        this.pushNotificationService = pushNotificationService;
    }

    public void sendNotification(String fcmToken, String title, String body, String clickAction) {
        if (fcmToken == null || fcmToken.isEmpty()) {
            return;
        }
        pushNotificationService.sendToTokenAsync(fcmToken, PushMessage.of("CHAT_MESSAGE", title, body, clickAction));
    }

    public void sendNotification(NotificationRequest request) {
        sendNotification(request.getFcmToken(), request.getTitle(), request.getBody(), request.getClickAction());
    }
}
