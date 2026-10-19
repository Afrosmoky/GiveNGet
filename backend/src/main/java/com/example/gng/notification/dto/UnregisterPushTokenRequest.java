package com.example.gng.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Odpięcie tokenu push od konta — wysyłane przy wylogowaniu. */
public record UnregisterPushTokenRequest(
        @NotBlank(message = "Token jest wymagany.") @Size(max = 512, message = "Token jest za długi.") String token
) {
}
