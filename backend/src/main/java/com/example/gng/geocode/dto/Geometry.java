package com.example.gng.geocode.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Geometry {
    private String type;
    private List<BigDecimal> coordinates; // [lon, lat]
} 