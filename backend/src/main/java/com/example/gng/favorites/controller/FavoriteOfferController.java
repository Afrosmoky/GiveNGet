package com.example.gng.favorites.controller;

import com.example.gng.offer.dto.OfferPreview;
import com.example.gng.favorites.service.FavoriteOfferService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/favorites")
public class FavoriteOfferController {

    private final FavoriteOfferService favoriteOfferService;

    @Autowired
    public FavoriteOfferController(FavoriteOfferService favoriteOfferService) {
        this.favoriteOfferService = favoriteOfferService;
    }

    /**
     * Dodaje ofertę do ulubionych
     * POST /api/favorites/{offerId}
     */
    @PostMapping("/{offerId}")
    public ResponseEntity<?> addToFavorites(@PathVariable String offerId) {
        try {
            String result = favoriteOfferService.addToFavorites(offerId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Błąd podczas dodawania oferty do ulubionych: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Usuwa ofertę z ulubionych
     * DELETE /api/favorites/{offerId}
     */
    @DeleteMapping("/{offerId}")
    public ResponseEntity<?> removeFromFavorites(@PathVariable String offerId) {
        try {
            String result = favoriteOfferService.removeFromFavorites(offerId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Błąd podczas usuwania oferty z ulubionych: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Pobiera wszystkie ulubione oferty użytkownika
     * GET /api/favorites
     */
    @GetMapping
    public ResponseEntity<?> getFavoriteOffers() {
        try {
            List<OfferPreview> favoriteOffers = favoriteOfferService.getFavoriteOffers();
            return ResponseEntity.ok(favoriteOffers);
        } catch (Exception e) {
            log.error("Błąd podczas pobierania ulubionych ofert: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Sprawdza czy oferta jest w ulubionych
     * GET /api/favorites/{offerId}/check
     */
    @GetMapping("/{offerId}/check")
    public ResponseEntity<?> isFavorite(@PathVariable String offerId) {
        try {
            boolean isFavorite = favoriteOfferService.isFavorite(offerId);
            return ResponseEntity.ok(isFavorite);
        } catch (Exception e) {
            log.error("Błąd podczas sprawdzania czy oferta jest w ulubionych: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
