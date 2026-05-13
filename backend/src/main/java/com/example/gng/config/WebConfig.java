package com.example.gng.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.multipart.MultipartResolver;
import org.springframework.web.multipart.support.StandardServletMultipartResolver;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Slf4j
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final String uploadDirectory = "/app/uploads/";
    @Value("${cors.allowed-origin:http://localhost:3000}")
    private String allowedOrigin;


    @Override
    public void addCorsMappings(CorsRegistry registry) {
        log.info("Konfiguracja CORS - dodawanie mapowań");
        log.info("Używam CORS origin: {}", allowedOrigin);

        registry.addMapping("/**")
                .allowedOrigins(allowedOrigin)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
        log.info("CORS skonfigurowany dla wszystkich endpointów");
    }

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
