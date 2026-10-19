package com.example.gng.offer.dto;

import com.example.gng.offer.entity.TransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateOfferDTO {
    @NotNull(message = "ID kategorii jest wymagane")
    private Integer categoryId;

    private Integer subcategoryId; // Opcjonalne - tylko jeśli kategoria ma podkategorie

    @NotBlank(message = "Nazwa jest wymagana")
    private String name;

    @NotBlank(message = "Lokalizacja jest wymagana")
    private String location;

    @NotBlank(message = "Współrzędne są wymagane")
    private String coordinates;

    @NotBlank(message = "Opis jest wymagany")
    private String description;

    @NotBlank(message = "Godziny odbioru są wymagane")
    @Pattern(regexp = "^([01]?[0-9]|2[0-3]):[0-5][0-9]$", message = "Format godziny musi być hh:mm (np. 09:30, 14:45)")
    private String pickupTimeFrom;

    @NotBlank(message = "Godziny odbioru są wymagane")
    @Pattern(regexp = "^([01]?[0-9]|2[0-3]):[0-5][0-9]$", message = "Format godziny musi być hh:mm (np. 09:30, 14:45)")
    private String pickupTimeTo;

    @NotNull(message = "Typ oferty jest wymagany")
    private TransactionType offerType;

    @NotNull(message = "Data wygaśnięcia jest wymagana")
    private LocalDate expiryDate;

    /**
     * Liczba sztuk (jednostka: sztuka). Pole opcjonalne — brak wartości oznacza 1,
     * dzięki czemu starsi klienci, którzy go nie wysyłają, działają bez zmian.
     */
    @Min(value = 0, message = "Ilość sztuk nie może być ujemna")
    private Integer quantity;

    /**
     * Cena za sztukę. Wymagana dla oferty sprzedażowej, zabroniona dla darmowej i wymiany.
     * Reguły egzekwuje OfferService — adnotacje są kontraktem dla klienta.
     * Digits odpowiada kolumnie DECIMAL(10,2).
     */
    @DecimalMin(value = "0.01", message = "Cena musi być większa od zera")
    @Digits(integer = 8, fraction = 2, message = "Cena może mieć najwyżej 2 miejsca po przecinku")
    private BigDecimal price;

    /**
     * Cena przed obniżką — opcjonalna, tylko dla sprzedaży, musi być wyższa od price.
     * Reguły egzekwuje OfferService (ORIGINAL_PRICE_NOT_ALLOWED / INVALID_ORIGINAL_PRICE / ORIGINAL_PRICE_NOT_HIGHER).
     */
    @Digits(integer = 8, fraction = 2, message = "Cena przed obniżką może mieć najwyżej 2 miejsca po przecinku")
    private BigDecimal originalPrice;

    /** Waluta ceny (ISO 4217). Brak wartości przy sprzedaży oznacza PLN. */
    @Pattern(regexp = "^[A-Za-z]{3}$", message = "Waluta musi być trzyliterowym kodem ISO 4217")
    private String currency;

}