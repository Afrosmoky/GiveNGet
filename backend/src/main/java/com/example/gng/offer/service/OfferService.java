package com.example.gng.offer.service;

import com.example.gng.auth.service.SessionService;
import com.example.gng.exceptions.InvalidRequestException;
import com.example.gng.geocode.dto.SimplifiedGeocodingResponse;
import com.example.gng.geocode.service.GeoCodeService;
import com.example.gng.offer.dto.CreateOfferDTO;
import com.example.gng.offer.dto.DistanceUnit;
import com.example.gng.offer.dto.ModeratorUpdateOfferDTO;
import com.example.gng.offer.dto.OfferDetailsDTO;
import com.example.gng.offer.dto.OfferPreview;
import com.example.gng.offer.dto.UpdateOfferDTO;
import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.entity.CategoryEntity;
import com.example.gng.offer.entity.SubcategoryEntity;
import com.example.gng.offer.entity.OfferImagesEntity;
import com.example.gng.offer.entity.TransactionType;
import com.example.gng.offer.entity.OfferStatus;
import com.example.gng.offer.repository.OfferRepository;
import com.example.gng.offer.repository.CategoryEntityRepository;
import com.example.gng.offer.repository.SubcategoryRepository;
import com.example.gng.offer.repository.OfferImagesRepository;
import com.example.gng.image.model.ImageEntity;
import com.example.gng.image.repository.ImageModelRepository;
import com.example.gng.file.service.FileStorageService;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.register.company.model.BusinessUserModel;
import com.example.gng.register.company.repository.BusinessUserModelRepository;
import com.example.gng.user.register.repository.RegularUserModelRepository;
import com.example.gng.favorites.service.FavoriteOfferService;
import com.example.gng.favorites.repository.FavoriteOfferRepository;
import com.example.gng.favorites.entity.FavoriteOfferEntity;
import com.example.gng.email.service.EmailSenderService;
import com.example.gng.mail_template.model.MailTemplateEntity;
import com.example.gng.mail_template.repository.MailTemplateRepository;
import com.example.gng.util.DistanceStringNumericComparator;
import com.example.gng.util.GeoSquareCalculator;
import com.example.gng.util.GeoProximityChecker;
import com.example.gng.util.TemplateProcessor;
import com.example.gng.exceptions.ForbiddenContentFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.ArrayList;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.HashMap;

import com.example.gng.moderation.service.ForbiddenPatternService;
import com.example.gng.user.service.UserRankService;
import com.example.gng.statistics.service.DashboardStatisticsService;

@Service
public class OfferService {

    private static final Logger logger = LoggerFactory.getLogger(OfferService.class);

    private final OfferRepository offerRepository;
    private final CategoryEntityRepository categoryRepository;
    private final SubcategoryRepository subcategoryRepository;
    private final OfferImagesRepository offerImagesRepository;
    private final ImageModelRepository imageModelRepository;
    private final FileStorageService fileStorageService;
    private final GeoCodeService geoCodeService;
    private final UserRepository userRepository;
    private final SessionService sessionService;
    private final BusinessUserModelRepository businessUserModelRepository;
    private final RegularUserModelRepository regularUserModelRepository;
    private final FavoriteOfferService favoriteOfferService;
    private final FavoriteOfferRepository favoriteOfferRepository;
    private final EmailSenderService emailSenderService;
    private final MailTemplateRepository mailTemplateRepository;
    private final String frontAppUrl;
    private final ForbiddenPatternService forbiddenPatternService;
    private final UserRankService userRankService;
    private final DashboardStatisticsService dashboardStatisticsService;

    public OfferService(OfferRepository offerRepository,
                        CategoryEntityRepository categoryRepository,
                        SubcategoryRepository subcategoryRepository,
                        OfferImagesRepository offerImagesRepository,
                        ImageModelRepository imageModelRepository,
                        FileStorageService fileStorageService, GeoCodeService geoCodeService,
                        UserRepository userRepository, SessionService sessionService,
                        BusinessUserModelRepository businessUserModelRepository,
                        RegularUserModelRepository regularUserModelRepository,
                        FavoriteOfferService favoriteOfferService,
                        FavoriteOfferRepository favoriteOfferRepository,
                        EmailSenderService emailSenderService,
                        MailTemplateRepository mailTemplateRepository,
                        ForbiddenPatternService forbiddenPatternService,
                        UserRankService userRankService,
                        DashboardStatisticsService dashboardStatisticsService,
                        @Value("${front.app.url}") String frontAppUrl) {
        this.offerRepository = offerRepository;
        this.categoryRepository = categoryRepository;
        this.subcategoryRepository = subcategoryRepository;
        this.offerImagesRepository = offerImagesRepository;
        this.imageModelRepository = imageModelRepository;
        this.fileStorageService = fileStorageService;
        this.geoCodeService = geoCodeService;
        this.userRepository = userRepository;
        this.sessionService = sessionService;
        this.businessUserModelRepository = businessUserModelRepository;
        this.regularUserModelRepository = regularUserModelRepository;
        this.favoriteOfferService = favoriteOfferService;
        this.favoriteOfferRepository = favoriteOfferRepository;
        this.emailSenderService = emailSenderService;
        this.mailTemplateRepository = mailTemplateRepository;
        this.frontAppUrl = frontAppUrl;
        this.forbiddenPatternService = forbiddenPatternService;
        this.userRankService = userRankService;
        this.dashboardStatisticsService = dashboardStatisticsService;
    }

    public String createOffer(CreateOfferDTO createOfferDTO, List<MultipartFile> images) {
        // Pobierz aktualnie zalogowanego użytkownika
        String currentUserEmail = SessionService.getCurrentUserEmail();
        if (currentUserEmail == null) {
            throw new InvalidRequestException("Użytkownik musi być zalogowany, aby utworzyć ofertę");
        }

        UserModel currentUser = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new InvalidRequestException("Nie znaleziono użytkownika"));

        // Sprawdź czy użytkownik może utworzyć nową ofertę
        if (!userRankService.canCreateOffer(currentUser)) {
            throw new InvalidRequestException("Nie możesz utworzyć nowej oferty. Wykorzystałeś wszystkie darmowe oferty w tym miesiącu.");
        }

        // Pobierz kategorię
        CategoryEntity category = categoryRepository.findById(createOfferDTO.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Kategoria nie została znalezona"));

        // Walidacja podkategorii - sprawdź czy kategoria ma podkategorie
        SubcategoryEntity subcategory = null;
        if (createOfferDTO.getSubcategoryId() != null) {
            subcategory = subcategoryRepository.findById(createOfferDTO.getSubcategoryId())
                    .orElseThrow(() -> new RuntimeException("Podkategoria nie została znalezona"));
            
            // Sprawdź czy podkategoria należy do wybranej kategorii
            if (!subcategory.getCategory().getId().equals(category.getId())) {
                throw new InvalidRequestException("Podkategoria nie należy do wybranej kategorii");
            }
        } else {
            // Jeśli nie podano podkategorii, sprawdź czy kategoria ma podkategorie
            if (!category.getSubcategories().isEmpty()) {
                throw new InvalidRequestException("Kategoria '" + category.getName() + "' wymaga wyboru podkategorii");
            }
        }

        // Parsuj współrzędne
        String[] coords = createOfferDTO.getCoordinates().split(",");
        BigDecimal latitude = new BigDecimal(coords[1].trim());
        BigDecimal longitude = new BigDecimal(coords[0].trim());

        // Utwórz nową ofertę
        OfferEntity offer = new OfferEntity();
        offer.setName(createOfferDTO.getName());
        offer.setDescription(createOfferDTO.getDescription());
        offer.setTransactionType(createOfferDTO.getOfferType());
        offer.setExpiryDate(createOfferDTO.getExpiryDate());
        offer.setLatitude(latitude);
        offer.setLongitude(longitude);
        offer.setLocation(createOfferDTO.getLocation());
        offer.setCategory(category);
        offer.setSubcategory(subcategory);
        offer.setUser(currentUser); // Przypisz użytkownika do oferty
        offer.setPickupDateFrom(createOfferDTO.getPickupTimeFrom());
        offer.setPickupDateTo(createOfferDTO.getPickupTimeTo());

        // Moderacja: jeśli treść zawiera słowa/regexy zakazane, ustaw status na PENDING
        boolean containsForbidden = forbiddenPatternService.containsForbiddenContent(
                offer.getName(),
                offer.getDescription(),
                offer.getLocation()
        );
        if (containsForbidden) {
            offer.setStatus(OfferStatus.PENDING);
        }

        // Sprawdź unikalność ID i zapisz ofertę
        offer = saveOfferWithUniqueId(offer);

        // Zapisz obrazy
        if (images != null && !images.isEmpty()) {
            saveOfferImages(offer, images);
        }

        if (containsForbidden) {
            logger.info("Oferta {} oznaczona jako PENDING z powodu zakazanych treści", offer.getId());
            throw new ForbiddenContentFoundException(
                    "Treść oferty zawiera zakazane słowa/wzorce. Oferta została oznaczona do weryfikacji.",
                    offer.getId());
        }

        // Zmniejsz licznik darmowych ofert użytkownika
        userRankService.decrementFreeOffersCount(currentUser);

        return "Oferta została utworzona pomyślnie. ID: " + offer.getId();
    }

    private OfferEntity saveOfferWithUniqueId(OfferEntity offer) {
        int maxAttempts = 10;
        int attempts = 0;

        while (attempts < maxAttempts) {
            try {
                // ID zostanie wygenerowane automatycznie przez @PrePersist
                return offerRepository.save(offer);
            } catch (Exception e) {
                // Jeśli wystąpił błąd duplikacji ID, spróbuj ponownie
                attempts++;
                if (attempts >= maxAttempts) {
                    throw new RuntimeException("Nie udało się wygenerować unikalnego ID oferty po " + maxAttempts + " próbach", e);
                }
                // Resetuj ID, aby @PrePersist wygenerował nowe
                offer.setId(null);
            }
        }

        throw new RuntimeException("Nie udało się zapisać oferty");
    }

    private void saveOfferImages(OfferEntity offer, List<MultipartFile> images) {
        List<OfferImagesEntity> offerImages = new ArrayList<>();

        for (MultipartFile imageFile : images) {
            if (!imageFile.isEmpty()) {
                try {
                    // Zapisz plik fizycznie używając nowej metody
                    String filePath = fileStorageService.saveOfferImage(offer.getId(), imageFile);

                    // Utwórz encję ImageModel
                    ImageEntity imageEntity = new ImageEntity();
                    imageEntity.setFileName(imageFile.getOriginalFilename());
                    imageEntity.setTypMime(imageFile.getContentType());
                    imageEntity.setAdded(LocalDateTime.now());
                    imageEntity.setFilePath(filePath);

                    // Zapisz ImageModel
                    imageEntity = imageModelRepository.save(imageEntity);

                    // Utwórz powiązanie w offer_images
                    OfferImagesEntity offerImage = new OfferImagesEntity();
                    offerImage.setOffer(offer);
                    offerImage.setImage(imageEntity);

                    offerImages.add(offerImage);

                } catch (Exception e) {
                    throw new RuntimeException("Błąd podczas zapisywania obrazu: " + e.getMessage(), e);
                }
            }
        }

        // Zapisz wszystkie powiązania
        if (!offerImages.isEmpty()) {
            offerImagesRepository.saveAll(offerImages);
        }
    }

    public List<OfferPreview> getOffers(List<Integer> categoryIds, List<Integer> subcategoryIds, BigDecimal lat, BigDecimal lon,
                                        Integer range, DistanceUnit distanceUnit, List<TransactionType> transactionTypes, Boolean recommendedOnly) {
        validateParams(categoryIds, subcategoryIds, lat, lon, range, distanceUnit);

        // Oblicz granice geograficzne jeśli podano współrzędne i zakres
        BigDecimal maxLon = null;
        BigDecimal minLon = null;
        BigDecimal maxLat = null;
        BigDecimal minLat = null;

        if (lat != null && lon != null && range != null && distanceUnit != null) {
            BigDecimal[] corners = GeoSquareCalculator.calculateRange(lat, lon, range, distanceUnit);
            if (corners != null) {
                maxLon = corners[0]; // góra (maxLon)
                maxLat = corners[1]; // prawa (maxLat)
                minLon = corners[2]; // dół (minLon)
                minLat = corners[3]; // lewa (minLat)
            }
        }

        // Pobierz oferty z bazy danych
        List<OfferEntity> offers = offerRepository.findOffersByFilters(
                categoryIds, subcategoryIds, transactionTypes, maxLon, minLon, maxLat, minLat);

        // Filtruj oferty
        List<OfferEntity> filteredOffers = offers.stream()
                .filter(offer -> offer.getLatitude() != null && offer.getLongitude() != null)
                .filter(offer -> GeoProximityChecker.isPointInCircle(
                        lat, lon, range, distanceUnit,
                        offer.getLatitude(), offer.getLongitude()))
                .filter(offer -> recommendedOnly == null || !recommendedOnly || offer.getRecommended())
                .toList();

        // Pobierz aktualnie zalogowanego użytkownika (tylko raz)
        UserModel currentUser = getCurrentUser();

        // Pobierz ID wszystkich ofert do sprawdzenia ulubionych
        List<String> offerIds = filteredOffers.stream()
                .map(OfferEntity::getId)
                .toList();

        // Sprawdź które oferty są w ulubionych (jedno zapytanie do bazy)
        Set<String> favoriteOfferIds = favoriteOfferService.getFavoriteOfferIds(currentUser, offerIds);

        // Mapuj oferty na preview z informacją o ulubionych
        return filteredOffers.stream()
                .map(e -> getOfferPreview(e, lat, lon, distanceUnit, favoriteOfferIds))
                //sortujemy oferty: najpierw recommended=true, potem po odległości
                .sorted(Comparator.comparing(OfferPreview::getRecommended).reversed()
                        .thenComparing(OfferPreview::getDistance, new DistanceStringNumericComparator()))
                .toList();
    }

    private OfferPreview getOfferPreview(OfferEntity offer, BigDecimal lat, BigDecimal lon, DistanceUnit distanceUnit) {
        return getOfferPreview(offer, lat, lon, distanceUnit, null);
    }

    /**
     * Publiczna metoda do konwersji OfferEntity na OfferPreview
     * Używana przez inne serwisy
     */
    public OfferPreview convertToOfferPreview(OfferEntity offer, BigDecimal lat, BigDecimal lon, DistanceUnit distanceUnit) {
        return getOfferPreview(offer, lat, lon, distanceUnit, null);
    }

    private OfferPreview getOfferPreview(OfferEntity offer, BigDecimal lat, BigDecimal lon, DistanceUnit distanceUnit, Set<String> favoriteOfferIds) {
        OfferPreview preview = new OfferPreview();
        preview.setId(offer.getId());
        preview.setName(offer.getName());
        preview.setTransactionType(offer.getTransactionType());
        preview.setLat(offer.getLatitude());
        preview.setLon(offer.getLongitude());

        // Oblicz odległość i sformatuj ją jako String
        if (lat != null && lon != null) {
            BigDecimal distance = GeoProximityChecker.calculateHaversineDistance(lat, lon, offer.getLatitude(), offer.getLongitude(), distanceUnit);
            preview.setDistance(formatDistance(distance, distanceUnit));
        }

        // Ustaw lokalizację na podstawie współrzędnych
        if (offer.getLatitude() != null && offer.getLongitude() != null) {
            //TODO do poprawy by nie musieć dla każdej oferty odpytywać zewnętrznego serwisu
            SimplifiedGeocodingResponse geocoding = geoCodeService.searchByCoordinatesSimplified(offer.getLatitude().toString(), offer.getLongitude().toString());
            preview.setLocation(geocoding.getCity());
        }

        // Ustaw URL obrazu jeśli oferta ma obrazy
        if (offer.getImages() != null && !offer.getImages().isEmpty()) {
            ImageEntity firstImage = offer.getImages().get(0).getImage();
            if (firstImage != null) {
                preview.setImageUrl(firstImage.getFilePath());
            }
        }

        // Ustaw pole recommended
        preview.setRecommended(offer.getRecommended());

        // Ustaw status oferty
        preview.setStatus(offer.getStatus());

        // Ustaw ID kategorii i podkategorii
        if (offer.getCategory() != null) {
            preview.setCategoryId(offer.getCategory().getId());
        }
        if (offer.getSubcategory() != null) {
            preview.setSubcategoryId(offer.getSubcategory().getId());
        }

        // Sprawdź czy oferta jest w ulubionych
        if (favoriteOfferIds != null) {
            preview.setIsFavorite(favoriteOfferIds.contains(offer.getId()));
        } else {
            preview.setIsFavorite(favoriteOfferService.isFavorite(offer.getId()));
        }

        return preview;
    }

    private String formatDistance(BigDecimal distance, DistanceUnit distanceUnit) {
        if (distance.compareTo(BigDecimal.ONE) >= 0) {
            // Wartość >= 1 - wyświetl z dokładnością do 3 miejsc po przecinku
            String formattedDistance = distance.setScale(3, RoundingMode.HALF_UP).toString();
            String unit = (distanceUnit == DistanceUnit.KILOMETERS) ? "km" : "mi";
            return formattedDistance + " " + unit;
        } else {
            // Wartość < 1 - konwertuj na metry lub jardy
            if (distanceUnit == DistanceUnit.KILOMETERS) {
                // Konwertuj kilometry na metry (1 km = 1000 m)
                BigDecimal meters = distance.multiply(new BigDecimal("1000"));
                return meters.setScale(0, RoundingMode.HALF_UP).intValue() + " m";
            } else {
                // Konwertuj mile na jardy (1 mi = 1760 yd)
                BigDecimal yards = distance.multiply(new BigDecimal("1760"));
                return yards.setScale(0, RoundingMode.HALF_UP).intValue() + " yd";
            }
        }
    }

    private void validateParams(List<Integer> categoryIds, List<Integer> subcategoryIds, BigDecimal lat, BigDecimal lon, Integer range, DistanceUnit distanceUnit) {
        validateCategoryAndSubcategory(categoryIds, subcategoryIds);
        validateGeoCoordinates(lat, lon, range, distanceUnit);
    }

    /**
     * Pobiera aktualnie zalogowanego użytkownika
     */
    private UserModel getCurrentUser() {
        String userEmail = SessionService.getCurrentUserEmail();
        if (userEmail == null) {
            return null;
        }
        return userRepository.findByEmail(userEmail).orElse(null);
    }

    /**
     * Pobiera najnowsze oferty z ulubionych kategorii użytkownika z filtrowaniem geograficznym
     * Filtruje oferty utworzone lub zaktualizowane w przeciągu ostatniego tygodnia
     */
    public List<OfferPreview> getLatestOffersFromFavoriteCategories(List<Integer> favoriteCategoryIds,
                                                                   List<Integer> favoriteSubcategoryIds,
                                                                   BigDecimal lat,
                                                                   BigDecimal lon,
                                                                   DistanceUnit distanceUnit) {
        // Jeśli współrzędne nie zostały podane, pobierz z danych użytkownika
        BigDecimal finalLat;
        BigDecimal finalLon;
        
        if (lat == null || lon == null) {
            UserModel currentUser = getCurrentUser();
            if (currentUser != null) {
                finalLat = currentUser.getLat();
                finalLon = currentUser.getLon();
            } else {
                finalLat = null;
                finalLon = null;
            }
        } else {
            finalLat = lat;
            finalLon = lon;
        }

        // Jeśli nadal nie ma współrzędnych, zwróć pustą listę
        if (finalLat == null || finalLon == null) {
            return List.of();
        }

        // Ustaw zasięg na 25km
        Integer range = DistanceUnit.KILOMETERS.equals(distanceUnit) ? 25 : 15;

        // Oblicz datę sprzed tygodnia
        LocalDateTime oneWeekAgo = LocalDateTime.now().minusWeeks(1);

        // Oblicz granice geograficzne
        BigDecimal maxLon = null;
        BigDecimal minLon = null;
        BigDecimal maxLat = null;
        BigDecimal minLat = null;

        if (finalLat != null && finalLon != null && range != null && distanceUnit != null) {
            BigDecimal[] corners = GeoSquareCalculator.calculateRange(finalLat, finalLon, range, distanceUnit);
            if (corners != null) {
                maxLon = corners[0]; // góra (maxLon)
                maxLat = corners[1]; // prawa (maxLat)
                minLon = corners[2]; // dół (minLon)
                minLat = corners[3]; // lewa (minLat)
            }
        }

        // Pobierz oferty z ulubionych kategorii i podkategorii z filtrowaniem według daty
        List<OfferEntity> offers = offerRepository.findOffersByFiltersWithDateFilter(
                favoriteCategoryIds, favoriteSubcategoryIds, null, maxLon, minLon, maxLat, minLat, oneWeekAgo);

        // Filtruj oferty
        List<OfferEntity> filteredOffers = offers.stream()
                .filter(offer -> offer.getLatitude() != null && offer.getLongitude() != null)
                .filter(offer -> GeoProximityChecker.isPointInCircle(
                        finalLat, finalLon, range, distanceUnit,
                        offer.getLatitude(), offer.getLongitude()))
                .toList();

        // Pobierz aktualnie zalogowanego użytkownika (tylko raz)
        UserModel currentUser = getCurrentUser();

        // Pobierz ID wszystkich ofert do sprawdzenia ulubionych
        List<String> offerIds = filteredOffers.stream()
                .map(OfferEntity::getId)
                .toList();

        // Sprawdź które oferty są w ulubionych (jedno zapytanie do bazy)
        Set<String> favoriteOfferIds = favoriteOfferService.getFavoriteOfferIds(currentUser, offerIds);

        // Mapuj oferty na preview z informacją o ulubionych
        return filteredOffers.stream()
                .map(e -> getOfferPreview(e, finalLat, finalLon, distanceUnit, favoriteOfferIds))
                //sortujemy oferty: najpierw recommended=true, potem po odległości
                .sorted(Comparator.comparing(OfferPreview::getRecommended).reversed()
                        .thenComparing(OfferPreview::getDistance, new DistanceStringNumericComparator()))
                .toList();
    }



    private void validateCategoryAndSubcategory(List<Integer> categoryIds, List<Integer> subcategoryIds) {
        if (categoryIds != null && !categoryIds.isEmpty()) {
            for (Integer categoryId : categoryIds) {
                Optional<CategoryEntity> category = categoryRepository.findById(categoryId);
                CategoryEntity categoryEntity = category.orElseThrow(() -> new InvalidRequestException("Category with ID " + categoryId + " not found"));
                if (subcategoryIds != null && !subcategoryIds.isEmpty()) {
                    for (Integer subcategoryId : subcategoryIds) {
                        categoryEntity.getSubcategories().stream().map(SubcategoryEntity::getId)
                            .filter(id -> id.equals(subcategoryId))
                            .findFirst()
                            .orElseThrow(() -> new InvalidRequestException("Subcategory with ID " + subcategoryId + " not found in category " + categoryId));
                    }
                }
            }
        }
    }

    private void validateGeoCoordinates(BigDecimal latitude, BigDecimal longitude, Integer range, DistanceUnit distanceUnit) {
        if (latitude != null && longitude != null) {
            if (range == null || range < 0) {
                throw new InvalidRequestException("Range must be a positive value");
            }
            if (distanceUnit == null) {
                throw new InvalidRequestException("Distance unit must be specified");
            }
            BigDecimal minLatitude = new BigDecimal("-90");
            BigDecimal maxLatitude = new BigDecimal("90");
            BigDecimal minLongitude = new BigDecimal("-180");
            BigDecimal maxLongitude = new BigDecimal("180");

            boolean isLatitudeValid = latitude.compareTo(minLatitude) >= 0 &&
                    latitude.compareTo(maxLatitude) <= 0;

            boolean isLongitudeValid = longitude.compareTo(minLongitude) >= 0 &&
                    longitude.compareTo(maxLongitude) <= 0;

            if (!isLatitudeValid || !isLongitudeValid) {
                throw new InvalidRequestException("Invalid geographic coordinates: latitude must be between -90 and 90, longitude must be between -180 and 180");
            }
        }
    }

    @Transactional
    public OfferDetailsDTO getOffer(String offerId) {
        OfferEntity offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new InvalidRequestException("Oferta o ID " + offerId + " nie została znaleziona"));

        // Sprawdź czy użytkownik może zobaczyć ofertę
        UserModel currentUser = getCurrentUser();
        boolean isOwner = currentUser != null && offer.getUser() != null &&
                         currentUser.getId().equals(offer.getUser().getId());
        
        // Zapisz statystykę wyświetlenia (tylko jeśli użytkownik nie jest właścicielem)
        if (!isOwner && currentUser != null) {
            try {
                dashboardStatisticsService.recordOfferView(offerId, currentUser);
            } catch (Exception ex) {
                logger.warn("Nie udało się zapisać statystyki wyświetlenia oferty {}: {}", offerId, ex.getMessage());
            }
        }
        
        return mapToOfferDetailsDTO(offer);
    }

    private OfferDetailsDTO mapToOfferDetailsDTO(OfferEntity offer) {
        OfferDetailsDTO details = new OfferDetailsDTO();

        // Informacje o ofercie
        details.setId(offer.getId());
        details.setName(offer.getName());
        details.setDescription(offer.getDescription());
        details.setTransactionType(offer.getTransactionType());
        details.setExpiryDate(offer.getExpiryDate());
        details.setCreatedAt(offer.getCreatedAt());
        details.setUpdatedAt(offer.getUpdatedAt());
        details.setPickupDateFrom(offer.getPickupDateFrom());
        details.setPickupDateTo(offer.getPickupDateTo());
        details.setPrice(offer.getPrice());
        details.setCurrency(offer.getCurrency());
        details.setLatitude(offer.getLatitude());
        details.setLongitude(offer.getLongitude());
        details.setLocation(offer.getLocation());
        
        // Kategoria i podkategoria
        if (offer.getCategory() != null) {
            details.setCategoryId(offer.getCategory().getId());
        }
        if (offer.getSubcategory() != null) {
            details.setSubcategoryId(offer.getSubcategory().getId());
        }

        // Lista zdjęć oferty
        if (offer.getImages() != null && !offer.getImages().isEmpty()) {
            List<String> imageUrls = offer.getImages().stream()
                    .map(offerImage -> offerImage.getImage().getFilePath())
                    .collect(Collectors.toList());
            details.setImageUrls(imageUrls);
        } else {
            details.setImageUrls(new ArrayList<>());
        }

        // Informacje o sprzedawcy
        if (offer.getUser() != null) {
            UserModel user = offer.getUser();
            details.setSellerId(user.getId());
            details.setSellerPhoneNumber(user.getPhoneNumber());
            details.setSellerAddress(user.getAddress());
            details.setSellerType(user.getType());

            // Avatar sprzedawcy
            if (user.getAvatar() != null) {
                details.setSellerAvatar(user.getAvatar().getFilePath());
            }

            // Nazwa sprzedawcy - zależna od typu użytkownika
            details.setSellerName(getSellerName(user));
            
            // Ranga i punkty zaufania sprzedawcy
            details.setSellerRank(user.getUserRank());
            details.setSellerTrustPoints(user.getTrustPoints());
        }

        // Sprawdź czy oferta jest w ulubionych
        details.setIsFavorite(favoriteOfferService.isFavorite(offer.getId()));

        // Ustaw status oferty
        details.setStatus(offer.getStatus());

        return details;
    }

    private String getSellerName(UserModel user) {
        if (user.getType() == UserType.COMPANY) {
            // Dla użytkowników firmowych pobierz BusinessUserModel i użyj companyName
            Optional<BusinessUserModel> businessUser = businessUserModelRepository.findById(user.getId());
            if (businessUser.isPresent()) {
                return businessUser.get().getCompanyName();
            }
        }

        // Dla wszystkich innych typów użytkowników użyj firstName + lastName
        return user.getFirstName() + " " + user.getLastName();
    }

    public List<OfferPreview> getUserOffers(Long userId) {
        List<OfferEntity> offers = offerRepository.findByUser(userId);

        // Pobierz aktualnie zalogowanego użytkownika (tylko raz)
        UserModel currentUser = getCurrentUser();

        // Pobierz ID wszystkich ofert do sprawdzenia ulubionych
        List<String> offerIds = offers.stream()
                .map(OfferEntity::getId)
                .toList();

        // Sprawdź które oferty są w ulubionych (jedno zapytanie do bazy)
        Set<String> favoriteOfferIds = favoriteOfferService.getFavoriteOfferIds(currentUser, offerIds);

        return offers.stream()
                .map(e -> getOfferPreview(e, null, null, null, favoriteOfferIds))
                .sorted(Comparator.comparing(OfferPreview::getName))
                .collect(Collectors.toList());
    }

    @Transactional
    public String updateOffer(String offerId, UpdateOfferDTO updateOfferDTO, List<MultipartFile> newImages) {
        // Pobierz aktualnie zalogowanego użytkownika
        String currentUserEmail = SessionService.getCurrentUserEmail();
        if (currentUserEmail == null) {
            throw new InvalidRequestException("Użytkownik musi być zalogowany, aby edytować ofertę");
        }

        UserModel currentUser = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new InvalidRequestException("Nie znaleziono użytkownika"));

        // Pobierz ofertę i sprawdź czy należy do użytkownika
        OfferEntity offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new InvalidRequestException("Oferta nie została znaleziona"));

        if (!offer.getUser().getId().equals(currentUser.getId())) {
            throw new InvalidRequestException("Możesz edytować tylko swoje oferty");
        }

        // Pobierz kategorię
        CategoryEntity category = categoryRepository.findById(updateOfferDTO.getCategoryId())
                .orElseThrow(() -> new InvalidRequestException("Kategoria nie została znalezona"));

        // Walidacja podkategorii - sprawdź czy kategoria ma podkategorie
        SubcategoryEntity subcategory = null;
        if (updateOfferDTO.getSubcategoryId() != null) {
            subcategory = subcategoryRepository.findById(updateOfferDTO.getSubcategoryId())
                    .orElseThrow(() -> new InvalidRequestException("Podkategoria nie została znalezona"));
            
            // Sprawdź czy podkategoria należy do wybranej kategorii
            if (!subcategory.getCategory().getId().equals(category.getId())) {
                throw new InvalidRequestException("Podkategoria nie należy do wybranej kategorii");
            }
        } else {
            // Jeśli nie podano podkategorii, sprawdź czy kategoria ma podkategorie
            if (!category.getSubcategories().isEmpty()) {
                throw new InvalidRequestException("Kategoria '" + category.getName() + "' wymaga wyboru podkategorii");
            }
        }

        // Parsuj współrzędne
        BigDecimal latitude = null;
        BigDecimal longitude = null;

        if (updateOfferDTO.getLat() != null && updateOfferDTO.getLon() != null) {
            latitude = BigDecimal.valueOf(updateOfferDTO.getLat());
            longitude = BigDecimal.valueOf(updateOfferDTO.getLon());
        } else if (updateOfferDTO.getCoordinates() != null && !updateOfferDTO.getCoordinates().trim().isEmpty()) {
            String[] coords = updateOfferDTO.getCoordinates().split(",");
            if (coords.length == 2) {
                longitude = new BigDecimal(coords[0].trim());
                latitude = new BigDecimal(coords[1].trim());
            }
        }

        // Parsuj datę wygaśnięcia
        LocalDate expiryDate = null;
        if (updateOfferDTO.getExpiryDate() != null && !updateOfferDTO.getExpiryDate().trim().isEmpty()) {
            try {
                expiryDate = LocalDate.parse(updateOfferDTO.getExpiryDate(), DateTimeFormatter.ISO_LOCAL_DATE);
            } catch (DateTimeParseException e) {
                throw new InvalidRequestException("Nieprawidłowy format daty wygaśnięcia");
            }
        }

        // Parsuj typ oferty
        TransactionType transactionType;
        try {
            transactionType = TransactionType.valueOf(updateOfferDTO.getOfferType().toLowerCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidRequestException("Nieprawidłowy typ oferty");
        }

        // Aktualizuj dane oferty
        offer.setName(updateOfferDTO.getName());
        offer.setDescription(updateOfferDTO.getDescription());
        offer.setTransactionType(transactionType);
        offer.setLocation(updateOfferDTO.getLocation());
        offer.setPickupDateFrom(updateOfferDTO.getPickupTimeFrom());
        offer.setPickupDateTo(updateOfferDTO.getPickupTimeTo());
        offer.setCategory(category);
        offer.setSubcategory(subcategory);

        if (latitude != null && longitude != null) {
            offer.setLatitude(latitude);
            offer.setLongitude(longitude);
        }

        if (expiryDate != null) {
            offer.setExpiryDate(expiryDate);
        }

        // Logika statusu po edycji
        boolean containsForbidden = forbiddenPatternService.containsForbiddenContent(
                offer.getName(),
                offer.getDescription(),
                offer.getLocation()
        );
        
        // Jeśli oferta była zablokowana lub zawiera zakazane treści, ustaw na PENDING
        if (offer.getStatus() == OfferStatus.BLOCKED || containsForbidden) {
            offer.setStatus(OfferStatus.PENDING);
            if (offer.getStatus() == OfferStatus.BLOCKED) {
                logger.info("Oferta {} zmieniona z BLOCKED na PENDING po edycji", offerId);
            } else if (containsForbidden) {
                logger.info("Oferta {} ustawiona na PENDING (zakazane treści)", offerId);
            }
        }

        // Zarządzaj obrazami
        manageOfferImages(offer, updateOfferDTO.getExistingImages(), updateOfferDTO.getRemovedImages(), newImages);

        // Zapisz ofertę
        offerRepository.save(offer);

        // Wyślij powiadomienia do zainteresowanych o zmianach w ofercie
        sendOfferChangeNotifications(offer);

        if (containsForbidden) {
            logger.info("Oferta {} ustawiona na PENDING podczas edycji (zakazane treści)", offerId);
            throw new ForbiddenContentFoundException(
                    "Treść oferty zawiera zakazane słowa/wzorce. Oferta została oznaczona do weryfikacji.",
                    offer.getId());
        }
        logger.info("Oferta {} została zaktualizowana przez użytkownika {}", offerId, currentUserEmail);
        return "Oferta została zaktualizowana pomyślnie";
    }

    private void manageOfferImages(OfferEntity offer, List<String> existingImages, List<String> removedImages, List<MultipartFile> newImages) {
        // Usuń obrazy, które mają zostać usunięte
        if (removedImages != null && !removedImages.isEmpty()) {
            for (String imagePath : removedImages) {
                try {
                    // Znajdź obraz w bazie danych
                    ImageEntity imageToRemove = imageModelRepository.findByFilePath(imagePath)
                            .orElse(null);

                    if (imageToRemove != null) {
                        // Usuń powiązanie z ofertą
                        offerImagesRepository.deleteByOfferAndImage(offer, imageToRemove);

                        // Usuń plik fizyczny
                        fileStorageService.deleteFile(imagePath);

                        // Usuń z bazy danych
                        imageModelRepository.delete(imageToRemove);

                        logger.info("Usunięto obraz: {}", imagePath);
                    }
                } catch (Exception e) {
                    logger.error("Błąd podczas usuwania obrazu {}: {}", imagePath, e.getMessage());
                }
            }
        }

        // Zachowaj istniejące obrazy (usuń te, które nie są w liście existingImages)
        if (existingImages != null) {
            List<OfferImagesEntity> currentImages = offerImagesRepository.findByOffer(offer);
            for (OfferImagesEntity offerImage : currentImages) {
                String imagePath = offerImage.getImage().getFilePath();
                if (!existingImages.contains(imagePath)) {
                    try {
                        // Usuń powiązanie z ofertą
                        offerImagesRepository.delete(offerImage);

                        // Usuń plik fizyczny
                        fileStorageService.deleteFile(imagePath);

                        // Usuń z bazy danych
                        imageModelRepository.delete(offerImage.getImage());

                        logger.info("Usunięto obraz (nie w existingImages): {}", imagePath);
                    } catch (Exception e) {
                        logger.error("Błąd podczas usuwania obrazu {}: {}", imagePath, e.getMessage());
                    }
                }
            }
        }

        // Dodaj nowe obrazy
        if (newImages != null && !newImages.isEmpty()) {
            for (MultipartFile imageFile : newImages) {
                if (!imageFile.isEmpty()) {
                    try {
                        // Zapisz plik fizycznie
                        String filePath = fileStorageService.saveOfferImage(offer.getId(), imageFile);

                        // Utwórz encję ImageModel
                        ImageEntity imageEntity = new ImageEntity();
                        imageEntity.setFileName(imageFile.getOriginalFilename());
                        imageEntity.setTypMime(imageFile.getContentType());
                        imageEntity.setAdded(LocalDateTime.now());
                        imageEntity.setFilePath(filePath);

                        // Zapisz ImageModel
                        imageEntity = imageModelRepository.save(imageEntity);

                        // Utwórz powiązanie w offer_images
                        OfferImagesEntity offerImage = new OfferImagesEntity();
                        offerImage.setOffer(offer);
                        offerImage.setImage(imageEntity);
                        offerImagesRepository.save(offerImage);

                        logger.info("Dodano nowy obraz: {}", filePath);
                    } catch (Exception e) {
                        logger.error("Błąd podczas dodawania obrazu: {}", e.getMessage());
                        throw new RuntimeException("Błąd podczas dodawania obrazu: " + e.getMessage(), e);
                    }
                }
            }
        }
    }

    /**
     * Zarządza obrazami oferty dla moderatora - tylko usuwa wskazane obrazy i dodaje nowe
     * Nie wymaga przekazywania existingImages - wszystkie obrazy oprócz removedImages pozostają
     */
    private void manageOfferImagesForModerator(OfferEntity offer, List<String> removedImages, List<MultipartFile> newImages) {
        // Usuń obrazy, które mają zostać usunięte
        if (removedImages != null && !removedImages.isEmpty()) {
            for (String imagePath : removedImages) {
                try {
                    // Znajdź obraz w bazie danych
                    ImageEntity imageToRemove = imageModelRepository.findByFilePath(imagePath)
                            .orElse(null);

                    if (imageToRemove != null) {
                        // Usuń powiązanie z ofertą
                        offerImagesRepository.deleteByOfferAndImage(offer, imageToRemove);

                        // Usuń plik fizyczny
                        fileStorageService.deleteFile(imagePath);

                        // Usuń z bazy danych
                        imageModelRepository.delete(imageToRemove);

                        logger.info("Usunięto obraz: {}", imagePath);
                    }
                } catch (Exception e) {
                    logger.error("Błąd podczas usuwania obrazu {}: {}", imagePath, e.getMessage());
                }
            }
        }

        // Dodaj nowe obrazy
        if (newImages != null && !newImages.isEmpty()) {
            for (MultipartFile imageFile : newImages) {
                if (!imageFile.isEmpty()) {
                    try {
                        // Zapisz plik fizycznie
                        String filePath = fileStorageService.saveOfferImage(offer.getId(), imageFile);

                        // Utwórz encję ImageModel
                        ImageEntity imageEntity = new ImageEntity();
                        imageEntity.setFileName(imageFile.getOriginalFilename());
                        imageEntity.setTypMime(imageFile.getContentType());
                        imageEntity.setAdded(LocalDateTime.now());
                        imageEntity.setFilePath(filePath);

                        // Zapisz ImageModel
                        imageEntity = imageModelRepository.save(imageEntity);

                        // Utwórz powiązanie w offer_images
                        OfferImagesEntity offerImage = new OfferImagesEntity();
                        offerImage.setOffer(offer);
                        offerImage.setImage(imageEntity);
                        offerImagesRepository.save(offerImage);

                        logger.info("Dodano nowy obraz: {}", filePath);
                    } catch (Exception e) {
                        logger.error("Błąd podczas dodawania obrazu: {}", e.getMessage());
                        throw new RuntimeException("Błąd podczas dodawania obrazu: " + e.getMessage(), e);
                    }
                }
            }
        }
    }

    /**
     * Wysyła powiadomienia email do użytkowników zainteresowanych zmianami w ofercie
     */
    private void sendOfferChangeNotifications(OfferEntity offer) {
        try {
            // Znajdź wszystkich użytkowników zainteresowanych ofertą
            List<FavoriteOfferEntity> favoriteOffers = favoriteOfferRepository.findByOfferId(offer.getId());

            if (favoriteOffers.isEmpty()) {
                logger.info("Brak użytkowników zainteresowanych ofertą {}", offer.getId());
                return;
            }

            // Pobierz szablon emaila
            MailTemplateEntity emailTemplate = mailTemplateRepository.findByName("offer-change");
            if (emailTemplate == null) {
                logger.error("Nie znaleziono szablonu emaila 'offer-change'");
                return;
            }

            // Przygotuj link do oferty
            String offerLink = frontAppUrl + "/offers/" + offer.getId() + offer.getName().replace(" ", "%20");

            // Wyślij powiadomienia do każdego zainteresowanego użytkownika
            for (FavoriteOfferEntity favoriteOffer : favoriteOffers) {
                UserModel user = favoriteOffer.getUser();

                // Przygotuj tagi do szablonu
                Map<String, String> tags = new HashMap<>();
                tags.put("username", user.getFirstName());
                tags.put("offerName", offer.getName());
                tags.put("offerLink", offerLink);

                // Przetwórz szablon
                String filledTemplate = TemplateProcessor.processTemplate(emailTemplate.getTemplate(), tags);

                // Wyślij email
                emailSenderService.sendEmail(user.getEmail(), "Aktualizacja oferty", filledTemplate, null);

                logger.info("Wysłano powiadomienie o zmianie oferty {} do użytkownika {}", offer.getId(), user.getEmail());
            }

            logger.info("Wysłano {} powiadomień o zmianie oferty {}", favoriteOffers.size(), offer.getId());

        } catch (Exception e) {
            logger.error("Błąd podczas wysyłania powiadomień o zmianie oferty {}: {}", offer.getId(), e.getMessage(), e);
        }
    }

    /**
     * Zmienia status oferty z walidacją
     */
    @Transactional
    public String changeOfferStatus(String offerId, OfferStatus newStatus) {
        // Pobierz aktualnie zalogowanego użytkownika
        String currentUserEmail = SessionService.getCurrentUserEmail();
        if (currentUserEmail == null) {
            throw new InvalidRequestException("Użytkownik musi być zalogowany, aby zmienić status oferty");
        }

        UserModel currentUser = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new InvalidRequestException("Nie znaleziono użytkownika"));

        // Pobierz ofertę
        OfferEntity offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new InvalidRequestException("Oferta nie została znaleziona"));

        // Sprawdź czy użytkownik może zmienić status oferty (właściciel lub admin)
        if (!offer.getUser().getId().equals(currentUser.getId())) {
            throw new InvalidRequestException("Możesz zmieniać status tylko swoich ofert");
        }

        // Walidacja dla zmiany na aktywny
        if (newStatus == OfferStatus.ACTIVE) {
            if (offer.getExpiryDate() != null && offer.getExpiryDate().isBefore(LocalDate.now())) {
                throw new InvalidRequestException("Nie można ustawić oferty jako aktywną, ponieważ data wygaśnięcia już minęła");
            }
        }

        // Zmień status
        OfferStatus oldStatus = offer.getStatus();
        offer.setStatus(newStatus);
        offerRepository.save(offer);

        logger.info("Status oferty {} zmieniony z {} na {} przez użytkownika {}",
                   offerId, oldStatus, newStatus, currentUserEmail);

        return "Status oferty został zmieniony pomyślnie";
    }

    /**
     * Automatycznie ustawia status na nieaktywny dla ofert z przekroczoną datą wygaśnięcia
     */
    @Transactional
    public void deactivateExpiredOffers() {
        LocalDate today = LocalDate.now();
        List<OfferEntity> expiredOffers = offerRepository.findByExpiryDateBeforeAndStatus(today, OfferStatus.ACTIVE);

        int updatedCount = 0;
        for (OfferEntity offer : expiredOffers) {
            offer.setStatus(OfferStatus.INACTIVE);
            offerRepository.save(offer);
            
            // Wyślij powiadomienie emailowe
            sendOfferExpiryNotification(offer);
            
            updatedCount++;
            logger.info("Automatycznie dezaktywowano ofertę {} - data wygaśnięcia: {}",
                       offer.getId(), offer.getExpiryDate());
        }

        logger.info("Automatycznie dezaktywowano {} ofert z przekroczoną datą wygaśnięcia", updatedCount);
    }


    /**
     * Wysyła powiadomienie emailowe o wygaśnięciu oferty
     */
    private void sendOfferExpiryNotification(OfferEntity offer) {
        try {
            MailTemplateEntity emailTemplate = mailTemplateRepository.findByName("offer-expiry-notification");
            if (emailTemplate == null) {
                logger.error("Szablon emaila 'offer-expiry-notification' nie został znaleziony");
                return;
            }

            Map<String, String> tags = new HashMap<>();
            tags.put("username", offer.getUser().getFirstName() + " " + offer.getUser().getLastName());
            tags.put("offerName", offer.getName());
            tags.put("expiryDate", offer.getExpiryDate().format(DateTimeFormatter.ofPattern("dd.MM.yyyy")));

            String filledTemplate = TemplateProcessor.processTemplate(emailTemplate.getTemplate(), tags);
            String subject = "Oferta wygasła - GNG";

            emailSenderService.sendEmail(offer.getUser().getEmail(), subject, filledTemplate, null);
            logger.info("Wysłano powiadomienie o wygaśnięciu oferty {} do użytkownika {}", offer.getId(), offer.getUser().getEmail());

        } catch (Exception e) {
            logger.error("Błąd podczas wysyłania powiadomienia o wygaśnięciu oferty {}: {}", offer.getId(), e.getMessage());
        }
    }

    /**
     * Aktualizuje ofertę przez moderatora/administratora
     * Moderator NIE może zmieniać: expiryDate, pickupDateFrom, pickupDateTo
     * @param offerId ID oferty
     * @param updateDTO DTO z danymi do aktualizacji
     * @param newImages Nowe obrazy (opcjonalne)
     * @return Komunikat o powodzeniu
     */
    @Transactional
    public String updateOfferByModerator(String offerId, ModeratorUpdateOfferDTO updateDTO, List<MultipartFile> newImages) {
        // Pobierz zalogowanego moderatora
        String currentUserEmail = SessionService.getCurrentUserEmail();
        if (currentUserEmail == null) {
            throw new InvalidRequestException("Użytkownik musi być zalogowany");
        }

        UserModel moderator = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new InvalidRequestException("Użytkownik nie znaleziony"));

        // Sprawdź czy użytkownik jest moderatorem lub administratorem
        if (moderator.getType() != UserType.ADMIN && moderator.getType() != UserType.EMPLOYEE) {
            throw new InvalidRequestException("Tylko moderatorzy i administratorzy mogą edytować oferty");
        }

        // Pobierz ofertę
        OfferEntity offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new InvalidRequestException("Oferta nie została znaleziona"));

        // UWAGA: expiryDate, pickupDateFrom, pickupDateTo NIE są zmieniane przez moderatora

        // Pobierz kategorię
        CategoryEntity category = categoryRepository.findById(updateDTO.getCategoryId())
                .orElseThrow(() -> new InvalidRequestException("Kategoria nie została znaleziona"));

        // Walidacja podkategorii
        SubcategoryEntity subcategory = null;
        if (updateDTO.getSubcategoryId() != null) {
            subcategory = subcategoryRepository.findById(updateDTO.getSubcategoryId())
                    .orElseThrow(() -> new InvalidRequestException("Podkategoria nie została znaleziona"));
            
            if (!subcategory.getCategory().getId().equals(category.getId())) {
                throw new InvalidRequestException("Podkategoria nie należy do wybranej kategorii");
            }
        } else {
            if (!category.getSubcategories().isEmpty()) {
                throw new InvalidRequestException("Kategoria '" + category.getName() + "' wymaga wyboru podkategorii");
            }
        }

        // Parsuj typ oferty
        TransactionType transactionType;
        try {
            transactionType = TransactionType.valueOf(updateDTO.getOfferType().toLowerCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidRequestException("Nieprawidłowy typ oferty");
        }

        // Aktualizuj dane oferty
        // UWAGA: NIE zmieniamy name, location, expiryDate, pickupDateFrom, pickupDateTo
        offer.setDescription(updateDTO.getDescription());
        offer.setTransactionType(transactionType);
        offer.setCategory(category);
        offer.setSubcategory(subcategory);

        // WAŻNE: name, location, expiryDate, pickupDateFrom, pickupDateTo pozostają bez zmian

        // Sprawdź zakazane treści (tylko w opisie, bo name i location nie są zmieniane)
        boolean containsForbidden = forbiddenPatternService.containsForbiddenContent(
                offer.getName(), // Sprawdzamy oryginalną nazwę
                offer.getDescription(), // Sprawdzamy nowy opis
                offer.getLocation() // Sprawdzamy oryginalną lokalizację
        );
        
        if (containsForbidden) {
            offer.setStatus(OfferStatus.PENDING);
            logger.info("Oferta {} ustawiona na PENDING (zakazane treści) przez moderatora", offerId);
        }

        // Zarządzaj obrazami - tylko usuwanie i dodawanie nowych (bez existingImages)
        manageOfferImagesForModerator(offer, updateDTO.getRemovedImages(), newImages);

        // Zapisz ofertę
        offerRepository.save(offer);

        // Wyślij email do właściciela oferty o modyfikacji przez pracownika
        sendModeratorUpdateNotification(offer, updateDTO.getReason(), moderator);

        // Wyślij powiadomienia do zainteresowanych o zmianach w ofercie
        sendOfferChangeNotifications(offer);

        if (containsForbidden) {
            logger.info("Oferta {} ustawiona na PENDING podczas edycji przez moderatora (zakazane treści)", offerId);
            throw new ForbiddenContentFoundException(
                    "Treść oferty zawiera zakazane słowa/wzorce. Oferta została oznaczona do weryfikacji.",
                    offer.getId());
        }

        logger.info("Oferta {} została zaktualizowana przez moderatora/administratora {}", offerId, currentUserEmail);
        return "Oferta została zaktualizowana pomyślnie";
    }

    /**
     * Wysyła powiadomienie emailowe do właściciela oferty o modyfikacji przez pracownika
     */
    private void sendModeratorUpdateNotification(OfferEntity offer, String reason, UserModel moderator) {
        try {
            MailTemplateEntity emailTemplate = mailTemplateRepository.findByName("offer-modified-by-staff");
            if (emailTemplate == null) {
                logger.error("Szablon emaila 'offer-modified-by-staff' nie został znaleziony");
                return;
            }

            Map<String, String> tags = new HashMap<>();
            tags.put("username", offer.getUser().getFirstName() + " " + offer.getUser().getLastName());
            tags.put("offerName", offer.getName());
            tags.put("reason", reason != null ? reason : "Brak podanego powodu");
            tags.put("moderatorName", moderator.getFirstName() + " " + moderator.getLastName());
            tags.put("offerLink", frontAppUrl + "/offers/" + offer.getId());

            String filledTemplate = TemplateProcessor.processTemplate(emailTemplate.getTemplate(), tags);
            String subject = "Twoja oferta została zmodyfikowana przez pracownika - GNG";

            emailSenderService.sendEmail(offer.getUser().getEmail(), subject, filledTemplate, null);
            logger.info("Wysłano powiadomienie o modyfikacji oferty {} przez moderatora do użytkownika {}", 
                    offer.getId(), offer.getUser().getEmail());

        } catch (Exception e) {
            logger.error("Błąd podczas wysyłania powiadomienia o modyfikacji oferty {}: {}", 
                    offer.getId(), e.getMessage());
        }
    }

}