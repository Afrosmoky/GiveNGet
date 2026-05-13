package com.example.gng.geocode.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Feature {
    private String type;
    private Properties properties;
    private Geometry geometry;
    private List<BigDecimal> bbox; // Bounding box coordinates
} 