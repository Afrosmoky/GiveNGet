package com.example.gng.auth.filter;

import com.example.gng.auth.service.CustomUserDetailsService;
import com.example.gng.auth.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;
    
    // Lista endpointów publicznych, które nie wymagają uwierzytelnienia
    private static final List<String> PUBLIC_ENDPOINTS = Arrays.asList(
            "/api/auth/",
            "/registerUser",
            "/registerCompany", 
            "/verify/",
            "/resentVerification",
            "/reset-password",
            "/static/",
            "/static-content/",
            "/geocode/",
            "/profile/",
            "/ws/"
    );

    @Autowired
    public JwtAuthenticationFilter(JwtService jwtService, CustomUserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String requestURI = request.getRequestURI();
        
        // Sprawdź czy żądanie jest do endpointu publicznego
        for (String publicEndpoint : PUBLIC_ENDPOINTS) {
            if (requestURI.startsWith(publicEndpoint)) {
                log.debug("JWT Filter - Pomijam filtrowanie dla publicznego endpointu: {}", requestURI);
                return true;
            }
        }
        
        return false;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String userEmail;

        log.info("JWT Filter - Request path: {}, Authorization header: {}", 
                request.getRequestURI(), authHeader != null ? "Present" : "Not present");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.debug("JWT Filter - Brak nagłówka Authorization lub nieprawidłowy format");
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        
        try {
            userEmail = jwtService.extractUsername(jwt);
            log.debug("JWT Filter - Extracted email: {}", userEmail);

            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);

                if (jwtService.validateToken(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request)
                    );
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    log.debug("JWT Filter - Użytkownik {} został uwierzytelniony", userEmail);
                } else {
                    log.warn("JWT Filter - Token nieważny dla użytkownika {}", userEmail);
                }
            }
        } catch (Exception e) {
            log.error("JWT Filter - Błąd podczas przetwarzania tokenu: {}", e.getMessage());
        }
        
        filterChain.doFilter(request, response);
    }
} 