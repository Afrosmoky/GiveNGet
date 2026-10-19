package com.example.gng.offer.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class UpdateOfferDTO {
    @NotNull(message = "ID kategorii jest wymagane")
    private Integer categoryId;

    private Integer subcategoryId; // Opcjonalne - tylko jeśli kategoria ma podkategorie

    @NotBlank(message = "Nazwa jest wymagana")
    private String name;

    @NotBlank(message = "Lokalizacja jest wymagana")
    private String location;

    private Double lat;

    private Double lon;

    private String coordinates;

    @NotBlank(message = "Opis jest wymagany")
    private String description;

    @NotBlank(message = "Typ oferty jest wymagany")
    private String offerType;

    @NotBlank(message = "Godzina odbioru od jest wymagana")
    @Pattern(regexp = "^([01]?[0-9]|2[0-3]):[0-5][0-9]$", message = "Format godziny musi być HH:mm (np. 09:30, 14:45)")
    private String pickupTimeFrom;

    @NotBlank(message = "Godzina odbioru do jest wymagana")
    @Pattern(regexp = "^([01]?[0-9]|2[0-3]):[0-5][0-9]$", message = "Format godziny musi być HH:mm (np. 09:30, 14:45)")
    private String pickupTimeTo;

    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "Format daty musi być yyyy-MM-dd")
    private String expiryDate;

    /**
     * Liczba sztuk (jednostka: sztuka). Pole opcjonalne — brak wartości oznacza
     * „nie zmieniaj", dzięki czemu starsi klienci nie nadpisują ilości.
     * Walidacja jest egzekwowana w OfferService, bo endpoint edycji nie używa @Valid.
     */
    @Min(value = 0, message = "Ilość sztuk nie może być ujemna")
    private Integer quantity;

    /**
     * Cena za sztukę. Semantyka null jak przy quantity: brak pola = bez zmian.
     * Zmiana typu oferty na darmową lub wymianę czyści cenę niezależnie od tego pola.
     */
    @DecimalMin(value = "0.01", message = "Cena musi być większa od zera")
    @Digits(integer = 8, fraction = 2, message = "Cena może mieć najwyżej 2 miejsca po przecinku")
    private BigDecimal price;

    /**
     * Cena przed obniżką. Brak pola = bez zmian (jak price) — klient, który nie zna tego pola,
     * nie skasuje przeceny przy edycji. Usunięcie przeceny: clearOriginalPrice=true.
     * Zmiana typu na darmowy/wymianę czyści ją zawsze.
     */
    @Digits(integer = 8, fraction = 2, message = "Cena przed obniżką może mieć najwyżej 2 miejsca po przecinku")
    private BigDecimal originalPrice;

    /** Jawne usunięcie ceny przed obniżką. Nie łączyć z originalPrice. */
    private Boolean clearOriginalPrice;

    /** Waluta ceny (ISO 4217); brak pola = bez zmian. */
    @Pattern(regexp = "^[A-Za-z]{3}$", message = "Waluta musi być trzyliterowym kodem ISO 4217")
    private String currency;

    private List<String> existingImages;

    private List<String> removedImages;
} 