package com.example.gng.offer.dto;

import com.example.gng.offer.entity.TransactionType;
import com.example.gng.offer.entity.OfferStatus;
import com.example.gng.register.model.UserType;
import com.example.gng.user.entity.UserRank;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class OfferDetailsDTO {
    // Informacje o ofercie
    private String id;
    private String name;
    private String description;
    private TransactionType transactionType;
    private LocalDate expiryDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String pickupDateFrom;
    private String pickupDateTo;
    private BigDecimal price;
    private String currency;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String location;
    private Integer categoryId;
    private Integer subcategoryId;

    // Lista zdjęć oferty
    private List<String> imageUrls;

    // Informacje o sprzedawcy
    private Long sellerId;
    private String sellerPhoneNumber;
    private String sellerAddress;
    private String sellerAvatar;
    private String sellerName; // companyName dla COMPANY, firstName + lastName dla innych
    private UserType sellerType; // Typ użytkownika sprzedawcy
    private UserRank sellerRank; // Ranga sprzedawcy
    private Integer sellerTrustPoints; // Punkty zaufania sprzedawcy
    
    // Informacja o ulubionych
    private Boolean isFavorite;
    
    // Status oferty
    private OfferStatus status;
}