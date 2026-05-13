package com.example.gng.offer.dto;

import com.example.gng.offer.entity.TransactionType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

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

}