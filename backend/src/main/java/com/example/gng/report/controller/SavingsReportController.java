package com.example.gng.report.controller;

import com.example.gng.report.dto.SavingsReportDTO;
import com.example.gng.report.service.SavingsReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * Raport oszczędności (docs/01_MVP_ZAKRES.md — trzeci element przepływu pilotażu).
 *
 * Dostęp: ROLE_COMPANY i ROLE_ADMIN (SecurityConfig). Zakres danych rozstrzyga serwis,
 * nie parametr żądania — konto firmowe widzi wyłącznie własny sklep.
 */
@RestController
@RequestMapping("/api/v1/reports")
public class SavingsReportController {

    private final SavingsReportService savingsReportService;

    public SavingsReportController(SavingsReportService savingsReportService) {
        this.savingsReportService = savingsReportService;
    }

    /**
     * @param from    dzień początkowy włącznie (yyyy-MM-dd, UTC); pominięty = od początku danych
     * @param to      dzień końcowy włącznie (yyyy-MM-dd, UTC); pominięty = do teraz
     * @param storeId zawężenie do jednej firmy; dozwolone dla ADMIN, dla COMPANY tylko własne id
     */
    @GetMapping("/savings")
    public ResponseEntity<SavingsReportDTO> getSavingsReport(
            Authentication authentication,
            @RequestParam(value = "from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "storeId", required = false) Long storeId) {

        return ResponseEntity.ok(
                savingsReportService.getSavingsReport(authentication.getName(), from, to, storeId));
    }
}
