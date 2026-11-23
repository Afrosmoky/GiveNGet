package com.example.gng.geocode.service;

import org.springframework.cache.interceptor.KeyGenerator;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Klucz cache reverse geocodingu. Współrzędne normalizujemy do 4 miejsc po przecinku (ok. 11 m),
 * żeby "52.193500" z encji i "52.1935" z frontendu trafiały w ten sam wpis.
 */
@Component(ReverseGeocodeKeyGenerator.BEAN_NAME)
public class ReverseGeocodeKeyGenerator implements KeyGenerator {

    public static final String BEAN_NAME = "reverseGeocodeKeyGenerator";

    private static final int SCALE = 4;

    @Override
    public Object generate(Object target, Method method, Object... params) {
        return key(String.valueOf(params[0]), String.valueOf(params[1]));
    }

    public static String key(String lat, String lon) {
        return normalize(lat) + "," + normalize(lon);
    }

    private static String normalize(String coordinate) {
        String trimmed = coordinate == null ? "null" : coordinate.trim();
        try {
            return new BigDecimal(trimmed).setScale(SCALE, RoundingMode.HALF_UP).toPlainString();
        } catch (NumberFormatException e) {
            // Nieparsowalna wartość (np. z /api/geocode/reverse) — klucz z surowego tekstu,
            // żeby generator klucza nie zmieniał zachowania endpointu wyjątkiem przed wywołaniem
            return trimmed;
        }
    }
}
