package com.example.gng.notification.dto;

import java.time.LocalDateTime;

/**
 * Wynik rejestracji tokenu.
 *
 * @param validUntil      do kiedy wpis jest ważny bez odświeżenia (UTC); klient odświeża go
 *                        przy każdym starcie, więc to tylko informacja
 * @param deliveryEnabled czy serwer w ogóle wysyła pushe (jest klucz Firebase) — pozwala
 *                        klientowi nie obiecywać powiadomień, które nie przyjdą
 */
public record PushTokenDTO(LocalDateTime validUntil, boolean deliveryEnabled) {
}
