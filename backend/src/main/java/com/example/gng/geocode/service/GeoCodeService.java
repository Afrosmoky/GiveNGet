package com.example.gng.geocode.service;

import com.example.gng.geocode.dto.GeocodingByCityResponse;
import com.example.gng.geocode.dto.GeocodingByCoordinatesResponse;
import com.example.gng.geocode.dto.SimplifiedGeocodingResponse;
import com.example.gng.geocode.dto.Feature;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;
import java.util.ArrayList;

@Service
public class GeoCodeService {

    @Value("${geoapify.api.key}")
    private String apiKey;

    @Value("${geoapify.api.base-url}")
    private String baseUrl;

    private final RestTemplate restTemplate;

    public GeoCodeService() {
        this.restTemplate = new RestTemplate();
    }

    private GeocodingByCityResponse searchByQuery(String query) {
        String url = baseUrl + "/geocode/search?text=" + query + "&apiKey=" + apiKey;
        ResponseEntity<GeocodingByCityResponse> response = restTemplate.getForEntity(url, GeocodingByCityResponse.class);
        return response.getBody();
    }

    private GeocodingByCoordinatesResponse searchByCoordinates(String lat, String lon) {
        String url = baseUrl + "/geocode/reverse?lat=" + lat + "&lon=" + lon + "&apiKey=" + apiKey;
        ResponseEntity<GeocodingByCoordinatesResponse> response = restTemplate.getForEntity(url, GeocodingByCoordinatesResponse.class);
        return response.getBody();
    }

    public List<SimplifiedGeocodingResponse> searchByQuerySimplified(String query) {
        GeocodingByCityResponse fullResponse = searchByQuery(query);
        return mapToSimplifiedResponseList(fullResponse);
    }

    public SimplifiedGeocodingResponse searchByCoordinatesSimplified(String lat, String lon) {
        GeocodingByCoordinatesResponse fullResponse = searchByCoordinates(lat, lon);
        return mapToSimplifiedResponse(fullResponse);
    }

    private List<SimplifiedGeocodingResponse> mapToSimplifiedResponseList(GeocodingByCityResponse fullResponse) {
        if (fullResponse == null || fullResponse.getFeatures() == null || fullResponse.getFeatures().isEmpty()) {
            return new ArrayList<>();
        }

        List<SimplifiedGeocodingResponse> simplifiedList = new ArrayList<>();

        for (Feature feature : fullResponse.getFeatures()) {
            if (feature.getProperties() != null) {
                SimplifiedGeocodingResponse simplified = mapGeoResponse(feature.getProperties().getCountry(), feature.getProperties().getCountry_code(),
                        feature.getProperties().getState(), feature.getProperties().getCounty(), feature.getProperties().getCity(),
                        feature.getProperties().getLon(), feature.getProperties().getLat(), feature.getProperties().getFormatted());

                simplifiedList.add(simplified);
            }
        }

        return simplifiedList;
    }

    private SimplifiedGeocodingResponse mapGeoResponse(String country, String countryCode, String state, String county, String city,
                                                       BigDecimal lon, BigDecimal lat, String formatted) {
        SimplifiedGeocodingResponse simplified = new SimplifiedGeocodingResponse();
        simplified.setCountry(country);
        simplified.setCountry_code(countryCode);
        simplified.setState(state);
        simplified.setCounty(county);
        simplified.setCity(city);
        simplified.setLon(lon);
        simplified.setLat(lat);
        simplified.setFormatted(formatted);
        return simplified;
    }

    private SimplifiedGeocodingResponse mapToSimplifiedResponse(GeocodingByCoordinatesResponse fullResponse) {
        if (fullResponse == null || fullResponse.getFeatures() == null || fullResponse.getFeatures().isEmpty()) {
            return null;
        }

        // Bierzemy pierwszy feature z listy
        GeocodingByCoordinatesResponse.FeatureV2 firstFeature = fullResponse.getFeatures().get(0);
        if (firstFeature.getProperties() == null) {
            return null;
        }

        return mapGeoResponse(firstFeature.getProperties().getCountry(), firstFeature.getProperties().getCountry_code(),
                firstFeature.getProperties().getState(), firstFeature.getProperties().getCounty(), firstFeature.getProperties().getCity(),
                firstFeature.getProperties().getLon(), firstFeature.getProperties().getLat(), firstFeature.getProperties().getFormatted());
    }
}