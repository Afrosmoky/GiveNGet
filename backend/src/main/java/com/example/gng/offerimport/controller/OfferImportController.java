package com.example.gng.offerimport.controller;

import com.example.gng.offerimport.dto.OfferImportResult;
import com.example.gng.offerimport.service.OfferImportService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Import ofert z pliku Excel (docs/08, pozycja 1).
 *
 * Dostęp ograniczony do ROLE_COMPANY w {@code SecurityConfig}; oferty zawsze należą
 * do konta wywołującego.
 */
@RestController
@RequestMapping("/api/v1/offers/import")
public class OfferImportController {

    private static final MediaType XLSX =
            MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final OfferImportService offerImportService;

    public OfferImportController(OfferImportService offerImportService) {
        this.offerImportService = offerImportService;
    }

    /**
     * Brak pliku obsługuje serwis ({@code FILE_REQUIRED}), dlatego parametr nie jest wymagany —
     * inaczej Spring odpowiedziałby własnym błędem spoza formatu 6.3.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<OfferImportResult> importOffers(Authentication authentication,
                                                          @RequestParam(value = "file", required = false) MultipartFile file) {
        return ResponseEntity.ok(offerImportService.importOffers(authentication.getName(), file));
    }

    @GetMapping("/template")
    public ResponseEntity<byte[]> template() {
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("szablon-importu-ofert.xlsx").build().toString())
                .body(offerImportService.buildTemplate());
    }
}
