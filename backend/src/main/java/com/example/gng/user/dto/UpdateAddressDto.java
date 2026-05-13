package com.example.gng.user.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateAddressDto {
    @NotNull(message = "Szerokość geograficzna jest wymagana")
    private BigDecimal lat;
    
    @NotNull(message = "Długość geograficzna jest wymagana")
    private BigDecimal lon;
    
    // Adres będzie automatycznie pobierany z Google Maps API na podstawie współrzędnych
    private String address;
}
