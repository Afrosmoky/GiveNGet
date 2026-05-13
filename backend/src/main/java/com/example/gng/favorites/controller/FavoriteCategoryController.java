package com.example.gng.favorites.controller;

import com.example.gng.favorites.dto.AddFavoriteCategoryDTO;
import com.example.gng.favorites.dto.FavoriteCategoriesResponseDTO;
import com.example.gng.favorites.service.FavoriteCategoryService;
import com.example.gng.offer.dto.DistanceUnit;
import com.example.gng.offer.dto.OfferPreview;
import com.example.gng.offer.service.OfferService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/favorite-categories")
public class FavoriteCategoryController {

    private final FavoriteCategoryService favoriteCategoryService;
    private final OfferService offerService;

    public FavoriteCategoryController(FavoriteCategoryService favoriteCategoryService,
                                    OfferService offerService) {
        this.favoriteCategoryService = favoriteCategoryService;
        this.offerService = offerService;
    }

    /**
     * Dodaje kategorie i podkategorie do ulubionych
     * POST /api/favorite-categories
     */
    @PostMapping
    public ResponseEntity<String> addToFavorites(@Valid @RequestBody AddFavoriteCategoryDTO request) {
        try {
            // Walidacja, że podano przynajmniej jedną kategorię lub podkategorię
            if (!request.isValid()) {
                return ResponseEntity.badRequest().body("Musisz podać przynajmniej jedną kategorię lub podkategorię");
            }

            String message = favoriteCategoryService.addToFavorites(request);
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            log.error("Błąd podczas dodawania do ulubionych: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Pobiera wszystkie ulubione kategorie użytkownika w formacie przyjaznym dla frontendu
     * GET /api/favorite-categories
     */
    @GetMapping
    public ResponseEntity<FavoriteCategoriesResponseDTO> getFavoriteCategories() {
        try {
            FavoriteCategoriesResponseDTO favoriteCategories = favoriteCategoryService.getFavoriteCategoriesForModal();
            return ResponseEntity.ok(favoriteCategories);
        } catch (Exception e) {
            log.error("Błąd podczas pobierania ulubionych kategorii: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }


    /**
     * Pobiera najnowsze oferty z ulubionych kategorii
     * GET /api/favorite-categories/offers/latest
     *
     * Parametry opcjonalne:
     * - lat: szerokość geograficzna
     * - lon: długość geograficzna
     * - distanceUnit: jednostka odległości (KILOMETERS, MILES)
     */
    @GetMapping("/offers/latest")
    public ResponseEntity<List<OfferPreview>> getLatestOffersFromFavoriteCategories(
            @RequestParam(required = false) BigDecimal lat,
            @RequestParam(required = false) BigDecimal lon,
            @RequestParam(required = false, defaultValue = "KILOMETERS") String distanceUnit) {
        try {
            // Pobierz ID ulubionych kategorii i podkategorii
            Map<String, List<Integer>> favoriteIds = favoriteCategoryService.getFavoriteCategoryAndSubcategoryIds();
            List<Integer> favoriteCategoryIds = favoriteIds.get("categoryIds");
            List<Integer> favoriteSubcategoryIds = favoriteIds.get("subcategoryIds");

            if (favoriteCategoryIds.isEmpty() && favoriteSubcategoryIds.isEmpty()) {
                return ResponseEntity.ok(List.of());
            }

            // Pobierz oferty z filtrowaniem geograficznym (25km zasięg)
            List<OfferPreview> offers = offerService.getLatestOffersFromFavoriteCategories(
                    favoriteCategoryIds, 
                    favoriteSubcategoryIds, 
                    lat, 
                    lon, 
                    DistanceUnit.valueOf(distanceUnit.toUpperCase())
            );

            return ResponseEntity.ok(offers);
        } catch (Exception e) {
            log.error("Błąd podczas pobierania najnowszych ofert z ulubionych kategorii: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}
