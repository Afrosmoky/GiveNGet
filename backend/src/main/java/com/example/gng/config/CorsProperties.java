package com.example.gng.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Jedyne źródło prawdy o dozwolonych originach CORS.
 *
 * <p>Wcześniej CORS był konfigurowany w trzech miejscach niezależnie: {@code SecurityConfig}
 * z {@code allowedOriginPatterns("*")}, {@code WebConfig} z property {@code cors.allowed-origin}
 * i {@code WebSocketConfig} z tą samą property. Dla {@code /api/**} wygrywał filtr z Security,
 * czyli wildcard — property była ignorowana i zmiana konfiguracji nic nie dawała.
 *
 * <p>Teraz wszystkie trzy miejsca czytają tę listę. Wartość pochodzi ze zmiennej środowiskowej
 * {@code CORS_ALLOWED_ORIGINS} (lista po przecinku), z domyślnym {@code http://localhost:3000}
 * na potrzeby lokalnego developmentu.
 *
 * <p><b>Nie wolno tu wstawiać {@code "*"}.</b> Wildcard w połączeniu z
 * {@code allowCredentials(true)} jest przez przeglądarki odrzucany, a przy
 * {@code allowedOriginPatterns} obchodzi to ograniczenie i faktycznie otwiera API na dowolną
 * stronę — przy pilotażu pod marką sieci handlowej jest to nieakceptowalne.
 */
@Component
@ConfigurationProperties(prefix = "cors")
public class CorsProperties {

    /** Dozwolone originy, np. https://biovlo.com. Bez ukośnika na końcu. */
    private List<String> allowedOrigins = new ArrayList<>(List.of("http://localhost:3000"));

    public List<String> getAllowedOrigins() {
        return allowedOrigins;
    }

    public void setAllowedOrigins(List<String> allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    /** Originy po odfiltrowaniu pustych wpisów — chroni przed literówką w ENV (np. trailing comma). */
    public List<String> resolvedOrigins() {
        return allowedOrigins.stream()
                .filter(origin -> origin != null && !origin.isBlank())
                .map(String::trim)
                .toList();
    }
}
