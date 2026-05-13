package com.example.gng.rates.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AddRateDto {
    @NotNull(message = "Ocena czystości jest wymagana")
    @Min(value = 1, message = "Ocena czystości musi być w zakresie od 1 do 5")
    @Max(value = 5, message = "Ocena czystości musi być w zakresie od 1 do 5")
    private Integer cleanliness;
    
    @NotNull(message = "Ocena jakości jest wymagana")
    @Min(value = 1, message = "Ocena jakości musi być w zakresie od 1 do 5")
    @Max(value = 5, message = "Ocena jakości musi być w zakresie od 1 do 5")
    private Integer quality;
    
    @NotNull(message = "Ocena transakcji jest wymagana")
    @Min(value = 1, message = "Ocena transakcji musi być w zakresie od 1 do 5")
    @Max(value = 5, message = "Ocena transakcji musi być w zakresie od 1 do 5")
    private Integer transactionRating;
    
    @Size(max = 255)
    private String comment;
    
    private Long userId;
}
