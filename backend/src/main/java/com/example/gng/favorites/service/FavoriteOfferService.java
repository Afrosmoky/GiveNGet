package com.example.gng.favorites.service;

import com.example.gng.auth.service.SessionService;
import com.example.gng.favorites.entity.FavoriteOfferEntity;
import com.example.gng.favorites.repository.FavoriteOfferRepository;
import com.example.gng.offer.dto.OfferPreview;
import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.repository.OfferRepository;
import com.example.gng.image.model.ImageEntity;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.reservation.repository.ReservationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;

@Slf4j
@Service
public class FavoriteOfferService {

    private final FavoriteOfferRepository favoriteOfferRepository;
    private final OfferRepository offerRepository;
    private final UserRepository userRepository;
    private final ReservationRepository reservationRepository;

    @Autowired
    public FavoriteOfferService(FavoriteOfferRepository favoriteOfferRepository,
                               OfferRepository offerRepository,
                               UserRepository userRepository,
                               ReservationRepository reservationRepository) {
        this.favoriteOfferRepository = favoriteOfferRepository;
        this.offerRepository = offerRepository;
        this.userRepository = userRepository;
        this.reservationRepository = reservationRepository;
    }

    /**
     * Dodaje ofertę do ulubionych dla aktualnie zalogowanego użytkownika
     */
    @Transactional
    public String addToFavorites(String offerId) {
        String userEmail = SessionService.getCurrentUserEmail();
        if (userEmail == null) {
            throw new RuntimeException("Użytkownik musi być zalogowany");
        }

        UserModel user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

        OfferEntity offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Oferta nie znaleziona"));

        // Sprawdź czy oferta jest już w ulubionych
        if (favoriteOfferRepository.existsByUserAndOfferId(user, offerId)) {
            throw new RuntimeException("Oferta jest już w ulubionych");
        }

        FavoriteOfferEntity favoriteOffer = new FavoriteOfferEntity();
        favoriteOffer.setUser(user);
        favoriteOffer.setOffer(offer);

        favoriteOfferRepository.save(favoriteOffer);
        log.info("Dodano ofertę {} do ulubionych dla użytkownika {}", offerId, userEmail);

        return "Oferta została dodana do ulubionych";
    }

    /**
     * Usuwa ofertę z ulubionych dla aktualnie zalogowanego użytkownika
     */
    @Transactional
    public String removeFromFavorites(String offerId) {
        String userEmail = SessionService.getCurrentUserEmail();
        if (userEmail == null) {
            throw new RuntimeException("Użytkownik musi być zalogowany");
        }

        UserModel user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

        if (!favoriteOfferRepository.existsByUserAndOfferId(user, offerId)) {
            throw new RuntimeException("Oferta nie jest w ulubionych");
        }

        favoriteOfferRepository.deleteByUserAndOfferId(user, offerId);
        log.info("Usunięto ofertę {} z ulubionych dla użytkownika {}", offerId, userEmail);

        return "Oferta została usunięta z ulubionych";
    }

    /**
     * Pobiera wszystkie ulubione oferty dla aktualnie zalogowanego użytkownika
     */
    public List<OfferPreview> getFavoriteOffers() {
        String userEmail = SessionService.getCurrentUserEmail();
        if (userEmail == null) {
            throw new RuntimeException("Użytkownik musi być zalogowany");
        }

        UserModel user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

        List<FavoriteOfferEntity> favoriteOffers = favoriteOfferRepository.findByUser(user);

        // Policz sztuki zajęte rezerwacjami jednym zapytaniem na całą listę
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        List<String> offerIds = favoriteOffers.stream()
                .map(favoriteOffer -> favoriteOffer.getOffer().getId())
                .toList();
        Map<String, Integer> reservedByOffer = new HashMap<>();
        if (!offerIds.isEmpty()) {
            for (Object[] row : reservationRepository.sumOccupiedQuantityByOfferIds(offerIds, now)) {
                reservedByOffer.put((String) row[0], ((Number) row[1]).intValue());
            }
        }

        return favoriteOffers.stream()
                .map(favoriteOffer -> convertToOfferPreview(favoriteOffer, reservedByOffer))
                .collect(Collectors.toList());
    }

    /**
     * Sprawdza czy oferta jest w ulubionych dla podanego użytkownika
     */
    public boolean isFavorite(UserModel user, String offerId) {
        if (user == null) {
            return false;
        }
        return favoriteOfferRepository.existsByUserAndOfferId(user, offerId);
    }

    /**
     * Sprawdza czy oferta jest w ulubionych dla aktualnie zalogowanego użytkownika
     */
    public boolean isFavorite(String offerId) {
        String userEmail = SessionService.getCurrentUserEmail();
        if (userEmail == null) {
            return false;
        }

        UserModel user = userRepository.findByEmail(userEmail)
                .orElse(null);

        return isFavorite(user, offerId);
    }

    /**
     * Sprawdza które oferty z listy są w ulubionych dla podanego użytkownika
     * Zwraca Set z ID ofert, które są w ulubionych
     */
    public Set<String> getFavoriteOfferIds(UserModel user, List<String> offerIds) {
        if (user == null || offerIds == null || offerIds.isEmpty()) {
            return new HashSet<>();
        }

        return favoriteOfferRepository.findByUserAndOfferIdIn(user, offerIds)
                .stream()
                .map(favorite -> favorite.getOffer().getId())
                .collect(Collectors.toSet());
    }

    /**
     * Konwertuje encję na OfferPreview
     */
    private OfferPreview convertToOfferPreview(FavoriteOfferEntity favoriteOffer,
                                               Map<String, Integer> reservedByOffer) {
        OfferPreview preview = new OfferPreview();
        OfferEntity offer = favoriteOffer.getOffer();

        preview.setId(offer.getId());
        preview.setName(offer.getName());
        preview.setTransactionType(offer.getTransactionType());
        preview.setLat(offer.getLatitude());
        preview.setLon(offer.getLongitude());
        preview.setRecommended(offer.getRecommended());
        preview.setIsFavorite(true);
        preview.setStatus(offer.getStatus());

        // Cena i waluta (null dla ofert darmowych i wymian)
        preview.setPrice(offer.getPrice());
        preview.setCurrency(offer.getCurrency());

        // Liczba sztuk i dostępność (quantity minus sztuki zajęte rezerwacjami)
        int total = offer.getQuantity() != null ? offer.getQuantity() : 0;
        preview.setQuantity(offer.getQuantity());
        preview.setAvailableQuantity(Math.max(0, total - reservedByOffer.getOrDefault(offer.getId(), 0)));

        // Ustaw lokalizację na podstawie współrzędnych
        if (offer.getLatitude() != null && offer.getLongitude() != null) {
            // Używamy prostego podejścia - możemy dodać geocoding później jeśli potrzeba
            preview.setLocation(offer.getLocation());
        }

        // Ustaw URL obrazu jeśli oferta ma obrazy
        if (offer.getImages() != null && !offer.getImages().isEmpty()) {
            ImageEntity firstImage = offer.getImages().get(0).getImage();
            if (firstImage != null) {
                preview.setImageUrl(firstImage.getFilePath());
            }
        }

        return preview;
    }
}
