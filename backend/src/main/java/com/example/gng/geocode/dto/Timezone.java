package com.example.gng.geocode.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Timezone {
    private String name;
    private String offset_STD;
    private Integer offset_STD_seconds;
    private String offset_DST;
    private Integer offset_DST_seconds;
    private String abbreviation_STD;
    private String abbreviation_DST;
} 