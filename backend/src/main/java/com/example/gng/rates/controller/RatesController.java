package com.example.gng.rates.controller;

import com.example.gng.rates.dto.AddRateDto;
import com.example.gng.rates.service.RatesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rates")
public class RatesController {
    private RatesService ratesService;

    @Autowired
    public RatesController(RatesService ratesService) {
        this.ratesService = ratesService;
    }

    @GetMapping
    public ResponseEntity<?> getRates(@RequestParam Long userId, @RequestParam(required = false) Integer stars, @RequestParam(defaultValue = "0") Integer page) {
        return ResponseEntity.ok(ratesService.getFullRates(userId, stars, page));
    }

    @PostMapping
    public ResponseEntity<?> addRates(@Validated @RequestBody AddRateDto rate) {
        try {
            ratesService.addRate(rate);
            return ResponseEntity.status(HttpStatus.CREATED).build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error adding rate: " + e.getMessage());
        }
    }
}
