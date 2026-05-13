package com.example.gng.auth.service;

import io.jsonwebtoken.Claims;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

@Slf4j
@Service
public class SessionService {

    private static JwtService jwtService;

    @Autowired
    public SessionService(JwtService jwtService) {
        SessionService.jwtService = jwtService;
    }

    /**
     * Pobiera nagłówek Authorization z aktualnego żądania HTTP
     * @return token JWT bez prefiksu "Bearer " lub null jeśli nie ma nagłówka
     */
    public static String getAuthorizationHeader() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String authHeader = request.getHeader("Authorization");

                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    return authHeader.substring(7); // Usuwa "Bearer "
                }
            }
        } catch (Exception e) {
            log.error("Błąd podczas pobierania nagłówka Authorization: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Pobiera pełny nagłówek Authorization z aktualnego żądania HTTP (z prefiksem "Bearer ")
     * @return pełny nagłówek Authorization lub null jeśli nie ma nagłówka
     */
    public static String getFullAuthorizationHeader() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                return request.getHeader("Authorization");
            }
        } catch (Exception e) {
            log.error("Błąd podczas pobierania nagłówka Authorization: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Pobiera adres email aktualnie zalogowanego użytkownika z tokenu JWT
     * @return adres email użytkownika lub null jeśli nie można go pobrać
     */
    public static String getCurrentUserEmail() {
        try {
            String token = getAuthorizationHeader();
            if (token != null && jwtService != null) {
                return jwtService.extractUsername(token);
            }
        } catch (Exception e) {
            log.error("Błąd podczas pobierania email użytkownika z tokenu: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Pobiera wszystkie claims z tokenu JWT aktualnie zalogowanego użytkownika
     * @return Claims z tokenu lub null jeśli nie można ich pobrać
     */
    public static Claims getCurrentUserClaims() {
        try {
            String token = getAuthorizationHeader();
            if (token != null && jwtService != null) {
                return jwtService.getAllClaims(token);
            }
        } catch (Exception e) {
            log.error("Błąd podczas pobierania claims użytkownika z tokenu: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Sprawdza czy użytkownik jest aktualnie zalogowany
     * @return true jeśli użytkownik ma ważny token, false w przeciwnym razie
     */
    public static boolean isUserLoggedIn() {
        try {
            String email = getCurrentUserEmail();
            return email != null && !email.isEmpty();
        } catch (Exception e) {
            log.error("Błąd podczas sprawdzania statusu logowania: {}", e.getMessage());
            return false;
        }
    }
}