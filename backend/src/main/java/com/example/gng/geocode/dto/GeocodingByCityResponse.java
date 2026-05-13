package com.example.gng.geocode.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

// Klasa główna odpowiadająca całemu JSON-owi
@Data // Generuje Getters, Setters, equals, hashCode, toString
@JsonIgnoreProperties(ignoreUnknown = true) // Ignoruj nieznane pola
public class GeocodingByCityResponse {
    private String type;
    private List<Feature> features;
    private Query query;
}
