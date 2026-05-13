package com.example.gng.geocode.controller;

import com.example.gng.geocode.dto.SimplifiedGeocodingResponse;
import com.example.gng.geocode.service.GeoCodeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/geocode")
public class GeoCodeController {

    private final GeoCodeService geoCodeService;

    @Autowired
    public GeoCodeController(GeoCodeService geoCodeService) {
        this.geoCodeService = geoCodeService;
    }

    @GetMapping("/search")
    public ResponseEntity<List<SimplifiedGeocodingResponse>> searchByQuery(@RequestParam String text) {
        List<SimplifiedGeocodingResponse> result = geoCodeService.searchByQuerySimplified(text);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/reverse")
    public ResponseEntity<SimplifiedGeocodingResponse> searchByCoordinates(
            @RequestParam String lat,
            @RequestParam String lon) {
        SimplifiedGeocodingResponse result = geoCodeService.searchByCoordinatesSimplified(lat, lon);
        return ResponseEntity.ok(result);
    }
}