package com.example.gng.rates.dto;

import lombok.Data;

@Data
public class SimplyRatesDto {

    public SimplyRatesDto() {
        this.rate = 0.0;
        this.count = 0L;
    }

    private Double rate;
    private Long count;
}
