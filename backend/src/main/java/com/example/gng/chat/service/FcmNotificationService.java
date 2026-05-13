package com.example.gng.chat.service;

import com.example.gng.chat.dto.NotificationRequest;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import org.springframework.stereotype.Service;

@Service
public class FcmNotificationService {

    /**
     * Wyślij powiadomienie FCM
     */
    public void sendNotification(String fcmToken, String title, String body, String clickAction) {
        try {
            if (fcmToken != null && !fcmToken.isEmpty()) {
                Message message = Message.builder()
                        .setToken(fcmToken)
                        .putData("title", title)
                        .putData("body", body)
                        .putData("click_action", clickAction)
                        .build();

                FirebaseMessaging.getInstance().send(message);
                System.out.println("FCM Notification sent: " + title + " - " + body + " redirects to " + clickAction);
            }
        } catch (Exception e) {
            // Log error but don't throw exception to avoid breaking chat functionality
            System.err.println("Failed to send FCM notification: " + e.getMessage());
        }
    }

    /**
     * Wyślij powiadomienie z dodatkowymi danymi
     */
    public void sendNotification(NotificationRequest request) {
        sendNotification(request.getFcmToken(), request.getTitle(), request.getBody(), request.getClickAction());
    }
}