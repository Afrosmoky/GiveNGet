package com.example.gng.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.multipart.MultipartResolver;
import org.springframework.web.multipart.support.StandardServletMultipartResolver;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Slf4j
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final String uploadDirectory = "/app/uploads/";

    // CORS jest konfigurowany WYŁĄCZNIE w SecurityConfig (CorsConfigurationSource),
    // na podstawie CorsProperties. Wcześniej stała tu druga, niezależna konfiguracja
    // przez addCorsMappings — dla /api/** i tak wygrywał filtr z Security, więc ta była
    // martwa i tylko sugerowała, że zmiana property coś zmienia. Nie przywracać:
    // dwa źródła CORS-u to gwarancja rozjazdu.

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadDirectory);
    }

    @Bean
    public MultipartResolver multipartResolver() {
        log.info("Tworzenie MultipartResolver");
        return new StandardServletMultipartResolver();
    }
}
