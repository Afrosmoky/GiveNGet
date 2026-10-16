package com.example.gng.reservation.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Żądanie potwierdzenia odbioru (docs/04_REZERWACJE_DESIGN.md, sekcje 6 i 8).
 *
 * Kod pochodzi z ręcznego przepisania przez pracownika albo ze skanu QR, dlatego serwis
 * go normalizuje (trim + wielkie litery) zamiast wymagać dokładnego formatu od klienta.
 */
public record CollectReservationRequest(

        @NotBlank(message = "Kod odbioru jest wymagany")
        String pickupCode
) {
}
