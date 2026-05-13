package com.example.gng.rates.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class RatesDto {
    private Integer cleanliness;
    private Integer quality;
    private Integer transactionRating;
    private Double averageRating;
    private String comment;
    private LocalDateTime createdAt;
}
