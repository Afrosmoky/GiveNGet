package com.example.gng.geocode.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.math.BigDecimal;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Rank {
    private BigDecimal importance;
    private BigDecimal popularity;
    private Integer confidence;
    private Integer confidence_city_level;
    private String match_type;
} 