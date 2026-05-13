package com.example.gng.offer.controller;

import com.example.gng.auth.service.SessionService;
import com.example.gng.offer.dto.CreateOfferDTO;
import com.example.gng.offer.dto.DistanceUnit;
import com.example.gng.offer.dto.UpdateOfferDTO;
import com.example.gng.offer.dto.ChangeOfferStatusDTO;
import com.example.gng.offer.entity.TransactionType;
import com.example.gng.offer.service.OfferService;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.statistics.service.DashboardStatisticsService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/offer")
public class OfferController {

    private final OfferService offerService;
    private final UserRepository userRepository;
    private final DashboardStatisticsService dashboardStatisticsService;

    public OfferController(OfferService offerService, UserRepository userRepository, DashboardStatisticsService dashboardStatisticsService) {
        this.offerService = offerService;
        this.userRepository = userRepository;
        this.dashboardStatisticsService = dashboardStatisticsService;
    }

    @PostMapping(consumes = {"multipart/form-data", "application/json"})
    public ResponseEntity<?> createOffer(@Valid @ModelAttribute CreateOfferDTO createOfferDTO,
                                         @RequestParam(value = "images", required = false) List<MultipartFile> images) {
        String result = offerService.createOffer(createOfferDTO, images);
        return ResponseEntity.ok(result);
    }

    @GetMapping
    public ResponseEntity<?> getOffers(@RequestParam(value = "categoryId", required = false) List<Integer> categoryIds,
                                       @RequestParam(value = "subcategoryId", required = false) List<Integer> subcategoryIds,
                                       @RequestParam(value = "lat") BigDecimal lat,
                                       @RequestParam(value = "lon") BigDecimal lon,
                                       @RequestParam(value = "range") Integer range,
                                       @RequestParam(value = "distanceUnit") DistanceUnit distanceUnit,
                                       @RequestParam(value = "transactionType", required = false) List<TransactionType> transactionTypes) {
        try{
            validateRange(range);
            return ResponseEntity.ok(offerService.getOffers(categoryIds, subcategoryIds, lat, lon, range, distanceUnit, transactionTypes, null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/newest")
    public ResponseEntity<?> getNewestOffers(@RequestParam(value = "lat", required = false) BigDecimal lat,
                                            @RequestParam(value = "lon", required = false) BigDecimal lon,
                                            @RequestParam(value = "distanceUnit", defaultValue = "KILOMETERS") DistanceUnit distanceUnit) {
        try {
            BigDecimal userLat = lat;
            BigDecimal userLon = lon;

            // Jeśli nie podano koordynatów, pobierz je z zalogowanego użytkownika
            if (userLat == null || userLon == null) {
                String currentUserEmail = SessionService.getCurrentUserEmail();
                if (currentUserEmail == null) {
                    return ResponseEntity.badRequest().body("Użytkownik musi być zalogowany lub podać koordynaty");
                }

                UserModel currentUser = userRepository.findByEmail(currentUserEmail)
                        .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

                if (currentUser.getLat() == null || currentUser.getLon() == null) {
                    return ResponseEntity.badRequest().body("Użytkownik nie ma ustawionej lokalizacji");
                }

                userLat = currentUser.getLat();
                userLon = currentUser.getLon();
            }

            Integer range = distanceUnit.equals(DistanceUnit.KILOMETERS) ? 25 : 15;

            return ResponseEntity.ok(offerService.getOffers(null, null, userLat, userLon, range, distanceUnit, null, null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/recommended")
    public ResponseEntity<?> getRecommendedOffers(@RequestParam(value = "lat", required = false) BigDecimal lat,
                                                 @RequestParam(value = "lon", required = false) BigDecimal lon,
                                                 @RequestParam(value = "distanceUnit", defaultValue = "KILOMETERS") DistanceUnit distanceUnit) {
        try {
            BigDecimal userLat = lat;
            BigDecimal userLon = lon;

            // Jeśli nie podano koordynatów, pobierz je z zalogowanego użytkownika
            if (userLat == null || userLon == null) {
                String currentUserEmail = SessionService.getCurrentUserEmail();
                if (currentUserEmail == null) {
                    return ResponseEntity.badRequest().body("Użytkownik musi być zalogowany lub podać koordynaty");
                }

                UserModel currentUser = userRepository.findByEmail(currentUserEmail)
                        .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

                if (currentUser.getLat() == null || currentUser.getLon() == null) {
                    return ResponseEntity.badRequest().body("Użytkownik nie ma ustawionej lokalizacji");
                }

                userLat = currentUser.getLat();
                userLon = currentUser.getLon();
            }

            // Ustaw range na 50 dla KILOMETERS i 30 dla MILES
            Integer range = distanceUnit.equals(DistanceUnit.KILOMETERS) ? 50 : 30;

            return ResponseEntity.ok(offerService.getOffers(null, null, userLat, userLon, range, distanceUnit, null, true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyOffers() {
        String currentUserEmail = SessionService.getCurrentUserEmail();
        if (currentUserEmail == null) {
            return ResponseEntity.badRequest().body("Użytkownik musi być zalogowany");
        }

        UserModel currentUser = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

        try {
            return ResponseEntity.ok(offerService.getUserOffers(currentUser.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping(value = "/{offerId}", consumes = {"multipart/form-data", "application/json"})
    public ResponseEntity<?> updateOffer(@PathVariable String offerId,
                                        @ModelAttribute UpdateOfferDTO updateOfferDTO,
                                        @RequestParam(value = "images", required = false) List<MultipartFile> images) {
        String result = offerService.updateOffer(offerId, updateOfferDTO, images);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/details/{offerId}")
    public ResponseEntity<?> getOffer(@PathVariable("offerId") String offerId) {
        try {
            return ResponseEntity.ok(offerService.getOffer(offerId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{offerId}/status")
    public ResponseEntity<?> changeOfferStatus(@PathVariable String offerId,
                                             @Valid @RequestBody ChangeOfferStatusDTO statusDTO) {
        try {
            String result = offerService.changeOfferStatus(offerId, statusDTO.getStatus());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/my/all")
    public ResponseEntity<?> getMyOffersWithAllStatuses() {
        String currentUserEmail = SessionService.getCurrentUserEmail();
        if (currentUserEmail == null) {
            return ResponseEntity.badRequest().body("Użytkownik musi być zalogowany");
        }

        UserModel currentUser = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

        try {
            return ResponseEntity.ok(offerService.getUserOffers(currentUser.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{offerId}/click")
    public ResponseEntity<?> recordOfferClick(@PathVariable("offerId") String offerId) {
        try {
            String currentUserEmail = SessionService.getCurrentUserEmail();
            if (currentUserEmail == null) {
                // Anonimowy użytkownik - nie zapisujemy statystyk
                return ResponseEntity.ok("OK");
            }

            UserModel currentUser = userRepository.findByEmail(currentUserEmail).orElse(null);
            if (currentUser != null) {
                dashboardStatisticsService.recordOfferClick(offerId, currentUser);
            }

            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            log.error("Błąd podczas zapisywania kliknięcia w ofertę: {}", e.getMessage(), e);
            return ResponseEntity.ok("OK"); // Nie zwracamy błędu, żeby nie psuć działania frontendu
        }
    }

    private void validateRange(Integer range) {
        if (range < 0 || range > 25) {
            throw new IllegalArgumentException("Range must be between 0 and 25");
        }
    }
}