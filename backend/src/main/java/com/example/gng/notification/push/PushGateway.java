package com.example.gng.notification.push;

/**
 * Kanał wysyłki pusha na jedno urządzenie. Oddzielony od logiki ponowień i sprzątania tokenów
 * (PushNotificationService), żeby dało się je testować bez Firebase.
 */
public interface PushGateway {

    /** Czy wysyłka jest skonfigurowana (jest klucz serwisowy). */
    boolean isEnabled();

    PushSendResult send(String token, PushMessage message);
}
