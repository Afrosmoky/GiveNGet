package com.example.gng.favorites.service;

import com.example.gng.auth.service.SessionService;
import com.example.gng.favorites.dto.AddFavoriteCategoryDTO;
import com.example.gng.favorites.dto.FavoriteCategoriesResponseDTO;
import com.example.gng.favorites.entity.FavoriteCategoryEntity;
import com.example.gng.favorites.repository.FavoriteCategoryRepository;
import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.entity.OfferStatus;
import com.example.gng.offer.repository.CategoryRepository;
import com.example.gng.offer.repository.OfferRepository;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class FavoriteCategoryService {

    private final FavoriteCategoryRepository favoriteCategoryRepository;
    private final UserRepository userRepository;
    private final OfferRepository offerRepository;
    private final CategoryRepository categoryRepository;

    public FavoriteCategoryService(FavoriteCategoryRepository favoriteCategoryRepository,
                                   UserRepository userRepository,
                                   OfferRepository offerRepository, CategoryRepository categoryRepository) {
        this.favoriteCategoryRepository = favoriteCategoryRepository;
        this.userRepository = userRepository;
        this.offerRepository = offerRepository;
        this.categoryRepository = categoryRepository;
    }

    /**
     * Dodaje kategorie i podkategorie do ulubionych dla aktualnie zalogowanego użytkownika
     * Najpierw usuwa wszystkie istniejące ulubione, a potem dodaje nowe
     */
    @Transactional
    public String addToFavorites(AddFavoriteCategoryDTO request) {
        String userEmail = SessionService.getCurrentUserEmail();
        if (userEmail == null) {
            throw new RuntimeException("Użytkownik musi być zalogowany");
        }

        UserModel user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

        // Pobierz istniejące ulubione kategorie i podkategorie
        List<FavoriteCategoryEntity> existingFavorites = favoriteCategoryRepository.findByUserOrderByCreatedAtDesc(user);

        // Przygotuj listy do operacji
        List<FavoriteCategoryEntity> toDelete = new ArrayList<>();
        List<FavoriteCategoryEntity> toCreate = new ArrayList<>();

        // Przeanalizuj kategorie
        if (request.hasCategories()) {
            for (Integer categoryId : request.getCategoryIds()) {
                // Sprawdź czy kategoria już istnieje
                boolean exists = existingFavorites.stream()
                        .anyMatch(fc -> fc.isCategoryFavorite() && fc.getCategoryId().equals(categoryId));

                if (!exists) {
                    // Sprawdź czy kategoria istnieje w bazie
                    if (!categoryRepository.existsById(categoryId)) {
                        throw new RuntimeException("Kategoria o ID " + categoryId + " nie istnieje");
                    }

                    // Dodaj do listy do utworzenia
                    FavoriteCategoryEntity favoriteCategory = new FavoriteCategoryEntity();
                    favoriteCategory.setUser(user);
                    favoriteCategory.setCategoryId(categoryId);
                    favoriteCategory.setSubcategoryId(null);

                    toCreate.add(favoriteCategory);
                }
            }
        }

        // Przeanalizuj podkategorie
        if (request.hasSubcategories()) {
            for (AddFavoriteCategoryDTO.SubcategoryRequest sub : request.getSubcategories()) {
                // Sprawdź czy podkategoria już istnieje
                boolean exists = existingFavorites.stream()
                        .anyMatch(fc -> fc.isSubcategoryFavorite() && fc.getSubcategoryId().equals(sub.getSubcategoryId()));

                if (!exists) {
                    // Sprawdź czy kategoria istnieje w bazie
                    if (!categoryRepository.existsById(sub.getCategoryId())) {
                        throw new RuntimeException("Kategoria o ID " + sub.getCategoryId() + " nie istnieje");
                    }

                    // Dodaj do listy do utworzenia
                    FavoriteCategoryEntity favoriteCategory = new FavoriteCategoryEntity();
                    favoriteCategory.setUser(user);
                    favoriteCategory.setCategoryId(sub.getCategoryId());
                    favoriteCategory.setSubcategoryId(sub.getSubcategoryId());

                    toCreate.add(favoriteCategory);
                }
            }
        }

        // Znajdź elementy do usunięcia (istniejące, ale nie w requeście)
        for (FavoriteCategoryEntity existing : existingFavorites) {
            boolean shouldKeep = false;

            if (existing.isCategoryFavorite()) {
                // Sprawdź czy kategoria jest w requeście
                if (request.hasCategories() && request.getCategoryIds().contains(existing.getCategoryId())) {
                    shouldKeep = true;
                }
            } else if (existing.isSubcategoryFavorite()) {
                // Sprawdź czy podkategoria jest w requeście
                if (request.hasSubcategories()) {
                    shouldKeep = request.getSubcategories().stream()
                            .anyMatch(sub -> sub.getSubcategoryId().equals(existing.getSubcategoryId()));
                }
            }

            if (!shouldKeep) {
                toDelete.add(existing);
            }
        }

        // Wykonaj operacje
        StringBuilder result = new StringBuilder();

        if (!toDelete.isEmpty()) {
            favoriteCategoryRepository.deleteAll(toDelete);
            result.append("Usunięto ").append(toDelete.size()).append(" elementów. ");
        }

        if (!toCreate.isEmpty()) {
            favoriteCategoryRepository.saveAll(toCreate);
            result.append("Dodano ").append(toCreate.size()).append(" elementów. ");
        }

        if (toDelete.isEmpty() && toCreate.isEmpty()) {
            result.append("Brak zmian - wszystkie ulubione są już aktualne.");
        }

        log.info("Zaktualizowano ulubione dla użytkownika {}: usunięto {}, dodano {}", userEmail, toDelete.size(), toCreate.size());
        return result.toString().trim();
    }


    /**
     * Pobiera wszystkie ulubione kategorie dla aktualnie zalogowanego użytkownika
     */
    public List<FavoriteCategoryEntity> getFavoriteCategories() {
        String userEmail = SessionService.getCurrentUserEmail();
        if (userEmail == null) {
            throw new RuntimeException("Użytkownik musi być zalogowany");
        }

        UserModel user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

        return favoriteCategoryRepository.findByUserOrderByCreatedAtDesc(user);
    }

    /**
     * Pobiera ulubione kategorie i podkategorie w formacie przyjaznym dla frontendu
     */
    public FavoriteCategoriesResponseDTO getFavoriteCategoriesForModal() {
        String userEmail = SessionService.getCurrentUserEmail();
        if (userEmail == null) {
            throw new RuntimeException("Użytkownik musi być zalogowany");
        }

        UserModel user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

        // Pobierz ID ulubionych kategorii
        List<Integer> favoriteCategoryIds = favoriteCategoryRepository.findCategoryIdsByUser(user);

        // Pobierz ulubione podkategorie
        List<FavoriteCategoryEntity> favoriteSubcategories = favoriteCategoryRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .filter(FavoriteCategoryEntity::isSubcategoryFavorite)
                .toList();

        List<FavoriteCategoriesResponseDTO.FavoriteSubcategoryDTO> subcategoryDTOs = favoriteSubcategories.stream()
                .map(fc -> {
                    FavoriteCategoriesResponseDTO.FavoriteSubcategoryDTO dto = new FavoriteCategoriesResponseDTO.FavoriteSubcategoryDTO();
                    dto.setCategoryId(fc.getCategoryId());
                    dto.setSubcategoryId(fc.getSubcategoryId());
                    return dto;
                })
                .toList();

        FavoriteCategoriesResponseDTO response = new FavoriteCategoriesResponseDTO();
        response.setFavoriteCategoryIds(favoriteCategoryIds);
        response.setFavoriteSubcategories(subcategoryDTOs);

        return response;
    }


    /**
     * Pobiera najnowsze oferty z ulubionych kategorii i podkategorii użytkownika
     * Filtruje oferty według współrzędnych GPS (jeśli podane) lub współrzędnych użytkownika
     */
    public List<OfferEntity> getLatestOffersFromFavoriteCategories(BigDecimal lat, BigDecimal lon) {
        String userEmail = SessionService.getCurrentUserEmail();
        if (userEmail == null) {
            throw new RuntimeException("Użytkownik musi być zalogowany");
        }

        UserModel user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

        List<Integer> favoriteCategoryIds = favoriteCategoryRepository.findCategoryIdsByUser(user);
        List<Integer> favoriteSubcategoryIds = favoriteCategoryRepository.findSubcategoryIdsByUser(user);

        if (favoriteCategoryIds.isEmpty() && favoriteSubcategoryIds.isEmpty()) {
            log.info("Użytkownik {} nie ma ulubionych kategorii ani podkategorii", userEmail);
            return List.of();
        }

        // Jeśli współrzędne nie zostały podane, użyj współrzędnych użytkownika
        // (obecnie nie używamy tych zmiennych, ale mogą być potrzebne w przyszłości)
        // BigDecimal userLat = lat != null ? lat : user.getLat();
        // BigDecimal userLon = lon != null ? lon : user.getLon();

        // Pobierz oferty z ostatniego tygodnia z ulubionych kategorii i podkategorii
        LocalDateTime oneWeekAgo = LocalDateTime.now().minusWeeks(1);

        List<OfferEntity> categoryOffers = List.of();
        List<OfferEntity> subcategoryOffers = List.of();

        if (!favoriteCategoryIds.isEmpty()) {
            categoryOffers = offerRepository.findByCategoryIdInAndCreatedAtAfterAndStatusOrderByCreatedAtDesc(
                    favoriteCategoryIds, oneWeekAgo, OfferStatus.ACTIVE);
        }

        if (!favoriteSubcategoryIds.isEmpty()) {
            subcategoryOffers = offerRepository.findBySubcategoryIdInAndCreatedAtAfterAndStatusOrderByCreatedAtDesc(
                    favoriteSubcategoryIds, oneWeekAgo, OfferStatus.ACTIVE);
        }

        // Połącz i posortuj oferty
        List<OfferEntity> allOffers = new ArrayList<>();
        allOffers.addAll(categoryOffers);
        allOffers.addAll(subcategoryOffers);

        // Sortuj według daty utworzenia (najnowsze pierwsze)
        allOffers.sort((o1, o2) -> o2.getCreatedAt().compareTo(o1.getCreatedAt()));

        return allOffers;
    }

    /**
     * Pobiera najnowsze oferty z ulubionych kategorii użytkownika bez filtrowania według lokalizacji
     */
    public List<OfferEntity> getLatestOffersFromFavoriteCategories() {
        return getLatestOffersFromFavoriteCategories(null, null);
    }

    /**
     * Pobiera ID ulubionych kategorii i podkategorii dla aktualnie zalogowanego użytkownika
     * @return Map z kluczami "categoryIds" i "subcategoryIds"
     */
    public Map<String, List<Integer>> getFavoriteCategoryAndSubcategoryIds() {
        String userEmail = SessionService.getCurrentUserEmail();
        if (userEmail == null) {
            throw new RuntimeException("Użytkownik musi być zalogowany");
        }

        UserModel user = getCurrentUser(userEmail);

        List<Integer> favoriteCategoryIds = favoriteCategoryRepository.findCategoryIdsByUser(user);
        List<Integer> favoriteSubcategoryIds = favoriteCategoryRepository.findSubcategoryIdsByUser(user);

        Map<String, List<Integer>> result = new HashMap<>();
        result.put("categoryIds", favoriteCategoryIds);
        result.put("subcategoryIds", favoriteSubcategoryIds);

        return result;
    }

    /**
     * Pobiera aktualnie zalogowanego użytkownika z cache'owaniem
     */
    private UserModel getCurrentUser(String userEmail) {
        return userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));
    }

}
