package com.example.gng.geocode.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.math.BigDecimal;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class SimplifiedGeocodingResponse {
    private String country;
    private String country_code;
    private String state;
    private String county; // Opcjonalne pole
    private String city;
    private BigDecimal lon;
    private BigDecimal lat;
    private String formatted;
} 