package com.example.gng.offer.dto;

import com.example.gng.offer.entity.TransactionType;
import com.example.gng.offer.entity.OfferStatus;
import com.example.gng.register.model.UserType;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class OfferPreview {
    private String id;
    private String name;
    private String location;
    private BigDecimal lat;
    private BigDecimal lon;
    private String distance;
    private String imageUrl;
    private TransactionType transactionType;
    private Boolean recommended;
    private Boolean isFavorite;
    private OfferStatus status;
    private Integer categoryId;
    private Integer subcategoryId;
    private BigDecimal price; // Cena za sztukę; null dla ofert darmowych i wymian
    private String currency; // Waluta ceny (ISO 4217); null gdy brak ceny
    private Integer quantity; // Liczba sztuk wystawionych przez sprzedawcę
    private Integer availableQuantity; // quantity minus sztuki zablokowane aktywnymi rezerwacjami
    private Long sellerId; // Właściciel oferty — do linku na profil sklepu / sprzedawcy
    private UserType sellerType;
    private String storeName; // Nazwa firmy dla sprzedawcy COMPANY; null dla osób prywatnych
}
