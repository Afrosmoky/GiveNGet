package com.example.gng.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Rejestracja tokenu push urządzenia dla zalogowanego konta.
 *
 * @param token         token FCM z klienta (web: getToken, mobile: SDK)
 * @param previousToken poprzedni token tego urządzenia, jeśli klient go zna — pozwala podmienić
 *                      wpis przy rotacji zamiast zostawiać martwy
 * @param deviceName    opis urządzenia do podglądu (np. user agent); opcjonalny
 */
public record RegisterPushTokenRequest(
        @NotBlank(message = "Token jest wymagany.") @Size(max = 512, message = "Token jest za długi.") String token,
        @Size(max = 512, message = "Poprzedni token jest za długi.") String previousToken,
        @Size(max = 1000, message = "Nazwa urządzenia jest za długa.") String deviceName
) {
}
