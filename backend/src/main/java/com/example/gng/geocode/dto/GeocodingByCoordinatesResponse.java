package com.example.gng.geocode.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

// Klasa główna odpowiadająca całemu JSON-owi
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class GeocodingByCoordinatesResponse {
    private String type;
    private List<FeatureV2> features;
    private QueryV2 query;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class FeatureV2 {
        private String type;
        private PropertiesV2 properties;
        private Geometry geometry;
        private List<BigDecimal> bbox; // Bounding box coordinates [minLon, minLat, maxLon, maxLat]
    }

    // --- Klasa PropertiesV2 ---
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PropertiesV2 {
        private Datasource datasource;
        private String country;
        private String country_code;
        private String state;
        private String postcode; // Nowe pole
        private String district; // Nowe pole
        private String suburb;   // Nowe pole
        private String street;   // Nowe pole
        private String city;
        @JsonProperty("iso3166_2")
        private String iso3166_2;
        private BigDecimal lon;
        private BigDecimal lat;
        private BigDecimal distance; // Nowe pole, odległość od punktu zapytania
        private String result_type;
        private String formatted;
        private String address_line1;
        private String address_line2;
        private String category;
        private Timezone timezone;
        private String plus_code;
        private String plus_code_short;
        private Rank rank;
        private String place_id;
        private String old_name; // To pole jest opcjonalne i może tu być, nawet jeśli go w tym JSONie nie ma
        private String county; // Opcjonalne
        private String municipality; // Opcjonalne
    }

    // --- Klasa QueryV2 ---
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class QueryV2 {
        private BigDecimal lat; // Nowe pole, szerokość geograficzna zapytania
        private BigDecimal lon; // Nowe pole, długość geograficzna zapytania
        private String plus_code; // Nowe pole, plus code zapytania
        private String text; // Opcjonalne, w tym JSONie nie ma
        private Parsed parsed; // Opcjonalne, w tym JSONie nie ma
    }
}

// --- Klasa FeatureV2 ---

