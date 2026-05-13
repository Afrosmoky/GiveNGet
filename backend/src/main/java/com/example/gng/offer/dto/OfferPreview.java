package com.example.gng.offer.dto;

import com.example.gng.offer.entity.TransactionType;
import com.example.gng.offer.entity.OfferStatus;
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
}
