package com.example.gng.reservation.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Żądanie utworzenia rezerwacji (docs/04_REZERWACJE_DESIGN.md, sekcja 6).
 * Ile sztuk faktycznie da się zarezerwować, rozstrzyga serwis pod blokadą wiersza oferty —
 * walidacja tutaj pilnuje tylko kształtu żądania.
 */
public record CreateReservationRequest(

        @NotBlank(message = "ID oferty jest wymagane")
        String offerId,

        @NotNull(message = "Liczba sztuk jest wymagana")
        @Min(value = 1, message = "Rezerwacja musi obejmować co najmniej jedną sztukę")
        Integer quantity
) {
}
