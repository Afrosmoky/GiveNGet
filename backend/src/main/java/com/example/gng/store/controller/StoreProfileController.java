package com.example.gng.store.controller;

import com.example.gng.common.dto.PageResponse;
import com.example.gng.offer.dto.OfferPreview;
import com.example.gng.store.dto.StoreProfileDTO;
import com.example.gng.store.service.StoreProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Publiczny profil sklepu (docs/08, pozycja 3). Dostęp jak przy przeglądaniu ofert —
 * dla zalogowanych (reguła w {@code SecurityConfig}).
 */
@RestController
@RequestMapping("/api/v1/stores")
public class StoreProfileController {

    private final StoreProfileService storeProfileService;

    public StoreProfileController(StoreProfileService storeProfileService) {
        this.storeProfileService = storeProfileService;
    }

    @GetMapping("/{companyId}")
    public ResponseEntity<StoreProfileDTO> profile(@PathVariable Long companyId) {
        return ResponseEntity.ok(storeProfileService.getProfile(companyId));
    }

    @GetMapping("/{companyId}/offers")
    public ResponseEntity<PageResponse<OfferPreview>> offers(
            @PathVariable Long companyId,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size) {
        return ResponseEntity.ok(storeProfileService.getActiveOffers(companyId, page, size));
    }
}
