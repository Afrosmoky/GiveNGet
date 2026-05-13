package com.example.gng.offer.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

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

    private List<String> existingImages;

    private List<String> removedImages;
} 