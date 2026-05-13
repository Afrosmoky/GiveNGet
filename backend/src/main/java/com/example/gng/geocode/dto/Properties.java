package com.example.gng.geocode.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Properties {
    private Datasource datasource;
    private String old_name; // Opcjonalne pole
    private String country;
    private String country_code;
    private String state;
    private String county; // Opcjonalne pole
    private String city;
    private String municipality; // Opcjonalne pole
    @JsonProperty("iso3166_2") // Jeśli nazwa pola w JSON różni się od konwencji Java (tutaj zgodna, ale dla przykładu)
    private String iso3166_2;
    private BigDecimal lon;
    private BigDecimal lat;
    private String result_type;
    private String formatted;
    private String address_line1;
    private String address_line2;
    private String category;
    private Timezone timezone;
    private String plus_code;
    private String plus_code_short; // Opcjonalne pole
    private Rank rank;
    private String place_id;
} 