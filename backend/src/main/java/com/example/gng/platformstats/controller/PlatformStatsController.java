package com.example.gng.platformstats.controller;

import com.example.gng.platformstats.dto.PlatformStatsDTO;
import com.example.gng.platformstats.service.PlatformStatsService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * Statystyki platformy pod pilotaż (docs/08, pozycja 4). Dostęp: ROLE_ADMIN (SecurityConfig).
 */
@RestController
@RequestMapping("/api/v1/stats")
public class PlatformStatsController {

    private final PlatformStatsService platformStatsService;

    public PlatformStatsController(PlatformStatsService platformStatsService) {
        this.platformStatsService = platformStatsService;
    }

    /**
     * @param from dzień początkowy włącznie (yyyy-MM-dd, UTC); pominięty = od początku danych
     * @param to   dzień końcowy włącznie (yyyy-MM-dd, UTC); pominięty = do teraz
     */
    @GetMapping("/platform")
    public ResponseEntity<PlatformStatsDTO> getPlatformStats(
            Authentication authentication,
            @RequestParam(value = "from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(platformStatsService.getPlatformStats(authentication.getName(), from, to));
    }
}
