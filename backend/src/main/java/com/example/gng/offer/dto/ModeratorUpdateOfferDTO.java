package com.example.gng.offer.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class ModeratorUpdateOfferDTO {
    @NotNull(message = "ID kategorii jest wymagane")
    private Integer categoryId;

    private Integer subcategoryId; // Opcjonalne - tylko jeśli kategoria ma podkategorie

    @NotBlank(message = "Opis jest wymagany")
    private String description;

    @NotBlank(message = "Typ oferty jest wymagany")
    private String offerType;

    // UWAGA: name, location, expiryDate, pickupDateFrom, pickupDateTo NIE są dostępne dla moderatora

    private List<String> removedImages; // Lista ścieżek do zdjęć do usunięcia

    @NotBlank(message = "Powód zmiany jest wymagany")
    private String reason; // Powód modyfikacji oferty przez moderatora
}

