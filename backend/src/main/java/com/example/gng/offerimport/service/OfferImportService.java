package com.example.gng.offerimport.service;

import com.example.gng.common.exception.ApiException;
import com.example.gng.common.exception.ForbiddenOperationException;
import com.example.gng.exceptions.InvalidRequestException;
import com.example.gng.moderation.service.ForbiddenPatternService;
import com.example.gng.offer.entity.CategoryEntity;
import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.entity.OfferStatus;
import com.example.gng.offer.entity.SubcategoryEntity;
import com.example.gng.offer.entity.TransactionType;
import com.example.gng.offer.repository.CategoryEntityRepository;
import com.example.gng.offer.repository.OfferRepository;
import com.example.gng.offer.service.OfferService;
import com.example.gng.offerimport.dto.OfferImportResult;
import com.example.gng.offerimport.dto.OfferImportRowError;
import com.example.gng.offerimport.service.OfferImportTemplate.Column;
import com.example.gng.offerimport.service.OfferSheetParser.ParsedRow;
import com.example.gng.register.company.model.BusinessUserModel;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Import ofert z pliku .xlsx dla konta firmowego (docs/08, pozycja 1).
 *
 * <p>Przebieg: walidacja pliku jako całości (typ, rozmiar, nagłówki, liczba wierszy) →
 * walidacja każdego wiersza osobno → zapis wszystkich poprawnych wierszy w jednej
 * transakcji. Wiersz z błędem nie zatrzymuje importu, tylko trafia do raportu;
 * błąd zapisu w bazie wycofuje cały import, żeby nie zostawić połowy pliku.
 *
 * <p>Reguły ceny i ilości są te same co przy tworzeniu oferty z formularza —
 * wołamy je z {@link OfferService}, a nie kopiujemy.
 *
 * <p>Import nie zużywa miesięcznego limitu darmowych ofert ({@code freeOffersCount}):
 * limit jest mechanizmem antyspamowym dla kont prywatnych, a masowe wystawienie
 * asortymentu sklepu jest celem tej funkcji (decyzja z 10.2026).
 */
@Service
public class OfferImportService {

    private static final Logger logger = LoggerFactory.getLogger(OfferImportService.class);

    /** Sygnatura ZIP („PK\3\4") — każdy plik .xlsx jest archiwum ZIP. */
    private static final byte[] ZIP_SIGNATURE = {0x50, 0x4B, 0x03, 0x04};

    /** Limity kolumn tabeli offer (name/location VARCHAR(255), description TEXT). */
    private static final int MAX_NAME_LENGTH = 255;
    private static final int MAX_LOCATION_LENGTH = 255;
    private static final int MAX_DESCRIPTION_LENGTH = 5000;

    /** Skala kolumn latitude/longitude DECIMAL(9,6). */
    private static final int COORDINATE_SCALE = 6;

    /** Ten sam wzorzec co w CreateOfferDTO. */
    private static final Pattern PICKUP_TIME = Pattern.compile("^([01]?[0-9]|2[0-3]):[0-5][0-9]$");

    private final UserRepository userRepository;
    private final CategoryEntityRepository categoryRepository;
    private final OfferRepository offerRepository;
    private final ForbiddenPatternService forbiddenPatternService;
    private final long maxFileBytes;
    private final int maxRows;
    private final Clock clock;

    @Autowired
    public OfferImportService(UserRepository userRepository,
                              CategoryEntityRepository categoryRepository,
                              OfferRepository offerRepository,
                              ForbiddenPatternService forbiddenPatternService,
                              @Value("${offer-import.max-file-size:2MB}") DataSize maxFileSize,
                              @Value("${offer-import.max-rows:500}") int maxRows) {
        this(userRepository, categoryRepository, offerRepository, forbiddenPatternService,
                maxFileSize, maxRows, Clock.systemDefaultZone());
    }

    /** Dla testów — stały zegar zamiast systemowego. */
    OfferImportService(UserRepository userRepository,
                       CategoryEntityRepository categoryRepository,
                       OfferRepository offerRepository,
                       ForbiddenPatternService forbiddenPatternService,
                       DataSize maxFileSize,
                       int maxRows,
                       Clock clock) {
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.offerRepository = offerRepository;
        this.forbiddenPatternService = forbiddenPatternService;
        this.maxFileBytes = maxFileSize.toBytes();
        this.maxRows = maxRows;
        this.clock = clock;
    }

    @Transactional
    public OfferImportResult importOffers(String currentUserEmail, MultipartFile file) {
        BusinessUserModel company = requireCompany(currentUserEmail);
        validateFile(file);

        List<ParsedRow> rows;
        try (InputStream input = file.getInputStream()) {
            rows = OfferSheetParser.parse(input, maxRows);
        } catch (IOException e) {
            throw ImportFileException.unreadable();
        }

        CategoryIndex categories = new CategoryIndex(categoryRepository.findAll());
        LocalDate today = LocalDate.now(clock);

        List<OfferEntity> offers = new ArrayList<>();
        List<OfferImportRowError> errors = new ArrayList<>();
        List<Integer> pendingRows = new ArrayList<>();

        for (ParsedRow row : rows) {
            try {
                OfferEntity offer = toOffer(row, company, categories, today);
                if (forbiddenPatternService.containsForbiddenContent(
                        offer.getName(), offer.getDescription(), offer.getLocation())) {
                    offer.setStatus(OfferStatus.PENDING);
                    pendingRows.add(row.rowNumber());
                }
                offers.add(offer);
            } catch (RowValidationException e) {
                errors.add(new OfferImportRowError(row.rowNumber(), e.getCode(), e.getMessage()));
            } catch (ApiException e) {
                // Reguły ceny z OfferService niosą własny kod (PRICE_REQUIRED, INVALID_PRICE…)
                errors.add(new OfferImportRowError(row.rowNumber(), e.getCode(), e.getMessage()));
            }
        }

        if (!offers.isEmpty()) {
            offerRepository.saveAll(offers);
        }

        logger.info("Import ofert firmy {}: utworzono {}, odrzucono {}, do weryfikacji {}",
                company.getId(), offers.size(), errors.size(), pendingRows.size());

        return new OfferImportResult(offers.size(), errors, pendingRows);
    }

    @Transactional(readOnly = true)
    public byte[] buildTemplate() {
        return OfferImportTemplate.build(categoryRepository.findAll(), LocalDate.now(clock));
    }

    // ------------------------------------------------------------------
    // Plik
    // ------------------------------------------------------------------

    /**
     * Sprawdza plik, zanim trafi do POI. Rozszerzenie i sygnatura muszą się zgadzać;
     * Content-Type jest tylko pomocniczy — przeglądarki i systemy wysyłają tu różne
     * wartości (np. application/octet-stream), więc nie może być jedyną bramką.
     */
    private void validateFile(MultipartFile file) {
        // Formularz bez wybranego pliku wysyła pustą część bez nazwy — to brak pliku,
        // a nie pusty plik
        String name = file == null ? null : file.getOriginalFilename();
        if (file == null || (file.isEmpty() && (name == null || name.isBlank()))) {
            throw ImportFileException.fileRequired();
        }
        if (name == null || !name.toLowerCase(Locale.ROOT).endsWith(".xlsx")) {
            throw ImportFileException.invalidFileType();
        }
        if (file.isEmpty()) {
            throw ImportFileException.emptyFile();
        }
        if (file.getSize() > maxFileBytes) {
            throw ImportFileException.fileTooLarge(maxFileBytes);
        }
        String contentType = file.getContentType();
        if (contentType != null && (contentType.startsWith("text/") || contentType.startsWith("image/"))) {
            throw ImportFileException.invalidFileType();
        }
        if (!hasZipSignature(file)) {
            throw ImportFileException.invalidFileType();
        }
    }

    private static boolean hasZipSignature(MultipartFile file) {
        try (InputStream input = file.getInputStream()) {
            byte[] head = input.readNBytes(ZIP_SIGNATURE.length);
            if (head.length < ZIP_SIGNATURE.length) {
                return false;
            }
            for (int i = 0; i < ZIP_SIGNATURE.length; i++) {
                if (head[i] != ZIP_SIGNATURE[i]) {
                    return false;
                }
            }
            return true;
        } catch (IOException e) {
            throw ImportFileException.unreadable();
        }
    }

    /**
     * Właścicielem ofert jest zawsze konto wywołujące. Rola COMPANY to pierwsza bramka
     * (SecurityConfig); tutaj potwierdzamy, że to faktycznie konto firmy z danymi sklepu.
     */
    private BusinessUserModel requireCompany(String email) {
        if (email == null || email.isBlank()) {
            throw new ForbiddenOperationException("Operacja wymaga zalogowanego użytkownika.", Map.of());
        }
        UserModel user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ForbiddenOperationException(
                        "Nie znaleziono konta zalogowanego użytkownika.", Map.of()));
        if (user.getType() != UserType.COMPANY || !(user instanceof BusinessUserModel company)) {
            throw new ForbiddenOperationException(
                    "Import ofert jest dostępny wyłącznie dla konta firmowego.", Map.of());
        }
        return company;
    }

    // ------------------------------------------------------------------
    // Wiersz
    // ------------------------------------------------------------------

    private OfferEntity toOffer(ParsedRow row, BusinessUserModel company, CategoryIndex categories, LocalDate today) {
        if (!row.invalidCells().isEmpty()) {
            Column first = row.invalidCells().iterator().next();
            throw new RowValidationException("FORMULA_NOT_ALLOWED",
                    "Kolumna „" + first.header() + "” zawiera formułę lub błąd Excela — wpisz samą wartość.");
        }

        String name = requireText(row, Column.NAZWA, MAX_NAME_LENGTH);
        String description = requireText(row, Column.OPIS, MAX_DESCRIPTION_LENGTH);
        TransactionType type = parseTransactionType(requireText(row, Column.TYP_TRANSAKCJI, Integer.MAX_VALUE));
        LocalDate expiryDate = parseExpiryDate(requireText(row, Column.TERMIN_WAZNOSCI, Integer.MAX_VALUE), today);
        LocalTime pickupFrom = parsePickupTime(row, Column.GODZINY_ODBIORU_OD);
        LocalTime pickupTo = parsePickupTime(row, Column.GODZINY_ODBIORU_DO);
        if (pickupFrom.isAfter(pickupTo)) {
            throw new RowValidationException("INVALID_PICKUP_TIME",
                    "Godzina odbioru „od” nie może być późniejsza niż „do”.");
        }

        CategoryEntity category = categories.category(requireText(row, Column.KATEGORIA, Integer.MAX_VALUE));
        SubcategoryEntity subcategory = categories.subcategory(category, row.get(Column.PODKATEGORIA));
        String allowed = subcategory != null ? subcategory.getAllowedTransactionTypes() : category.getAllowedTransactionTypes();
        if (!isTransactionTypeAllowed(allowed, type)) {
            throw new RowValidationException("TRANSACTION_TYPE_NOT_ALLOWED",
                    "Wybrana kategoria nie dopuszcza typu transakcji „" + row.get(Column.TYP_TRANSAKCJI) + "”.");
        }

        int quantity = parseQuantity(row.get(Column.ILOSC));
        // Reguły ceny i przeceny (tylko sprzedaż, wyższa od ceny) — te same co w formularzu;
        // BadRequestException z OfferService trafia do raportu jako błąd tego wiersza
        OfferService.OfferPricing pricing = OfferService.resolvePricingForCreate(
                type, parsePrice(row.get(Column.CENA)), row.get(Column.WALUTA),
                parseOriginalPrice(row.get(Column.CENA_PRZED_OBNIZKA)));

        OfferEntity offer = new OfferEntity();
        offer.setName(name);
        offer.setDescription(description);
        offer.setTransactionType(type);
        offer.setExpiryDate(expiryDate);
        offer.setPickupDateFrom(pickupFrom.toString());
        offer.setPickupDateTo(pickupTo.toString());
        offer.setCategory(category);
        offer.setSubcategory(subcategory);
        offer.setQuantity(quantity);
        offer.setPrice(pricing.price());
        offer.setCurrency(pricing.currency());
        offer.setOriginalPrice(pricing.originalPrice());
        offer.setUser(company);
        applyLocation(offer, row, company);
        return offer;
    }

    private static String requireText(ParsedRow row, Column column, int maxLength) {
        String value = row.get(column);
        if (value == null || value.isBlank()) {
            throw new RowValidationException("REQUIRED_FIELD_MISSING",
                    "Brak wartości w wymaganej kolumnie „" + column.header() + "”.");
        }
        if (value.length() > maxLength) {
            throw new RowValidationException("VALUE_TOO_LONG",
                    "Wartość w kolumnie „" + column.header() + "” jest za długa (maks. " + maxLength + " znaków).");
        }
        return value;
    }

    /** Akceptuje wartości z szablonu; spacje i polskie znaki dla wygody („za darmo”, „sprzedaż”). */
    private static TransactionType parseTransactionType(String raw) {
        String normalized = raw.trim().toLowerCase(Locale.ROOT)
                .replace('ż', 'z')
                .replace(' ', '_');
        return switch (normalized) {
            case "sprzedaz" -> TransactionType.sale;
            case "za_darmo" -> TransactionType.free;
            case "wymiana" -> TransactionType.exchange;
            default -> throw new RowValidationException("INVALID_TRANSACTION_TYPE",
                    "Nieznany typ transakcji „" + raw + "”. Dozwolone: sprzedaz, za_darmo, wymiana.");
        };
    }

    private static LocalDate parseExpiryDate(String raw, LocalDate today) {
        LocalDate date;
        try {
            date = LocalDate.parse(raw);
        } catch (DateTimeParseException e) {
            throw new RowValidationException("INVALID_DATE",
                    "Nieprawidłowy termin ważności „" + raw + "”. Użyj formatu RRRR-MM-DD.");
        }
        if (date.isBefore(today)) {
            throw new RowValidationException("EXPIRY_DATE_IN_PAST",
                    "Termin ważności " + date + " już minął.");
        }
        return date;
    }

    private static LocalTime parsePickupTime(ParsedRow row, Column column) {
        String raw = requireText(row, column, Integer.MAX_VALUE);
        if (!PICKUP_TIME.matcher(raw).matches()) {
            throw new RowValidationException("INVALID_PICKUP_TIME",
                    "Nieprawidłowa godzina w kolumnie „" + column.header() + "”. Użyj formatu GG:MM, np. 09:30.");
        }
        String[] parts = raw.split(":");
        return LocalTime.of(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]));
    }

    private static int parseQuantity(String raw) {
        Integer requested = null;
        if (raw != null) {
            try {
                requested = new BigDecimal(raw.replace(',', '.')).intValueExact();
            } catch (NumberFormatException | ArithmeticException e) {
                throw invalidQuantity(raw);
            }
        }
        try {
            return OfferService.resolveQuantityForCreate(requested);
        } catch (InvalidRequestException e) {
            throw invalidQuantity(raw);
        }
    }

    private static RowValidationException invalidQuantity(String raw) {
        return new RowValidationException("INVALID_QUANTITY",
                "Nieprawidłowa ilość „" + raw + "”. Podaj liczbę całkowitą nie mniejszą niż 0.");
    }

    /** Brak wartości = null — to, czy cena jest wymagana, rozstrzyga OfferService. */
    private static BigDecimal parsePrice(String raw) {
        if (raw == null) {
            return null;
        }
        try {
            // Polski zapis z przecinkiem dziesiętnym jest częsty w eksportach z systemów sklepowych
            return new BigDecimal(raw.replace(',', '.'));
        } catch (NumberFormatException e) {
            throw new RowValidationException("INVALID_PRICE",
                    "Nieprawidłowa cena „" + raw + "”. Podaj liczbę, np. 4.99.");
        }
    }

    /** Brak wartości = oferta bez przeceny. Reguły (sprzedaż, > cena) rozstrzyga OfferService. */
    private static BigDecimal parseOriginalPrice(String raw) {
        if (raw == null) {
            return null;
        }
        try {
            return new BigDecimal(raw.replace(',', '.'));
        } catch (NumberFormatException e) {
            throw new RowValidationException("INVALID_ORIGINAL_PRICE",
                    "Nieprawidłowa cena przed obniżką „" + raw + "”. Podaj liczbę, np. 7.99.");
        }
    }

    /** Zapis z bazy, np. ["free", "exchange", "sale"]; brak listy = brak ograniczeń. */
    private static boolean isTransactionTypeAllowed(String allowed, TransactionType type) {
        return allowed == null || allowed.isBlank() || allowed.contains("\"" + type.name() + "\"");
    }

    /**
     * Współrzędne z pliku albo — gdy ich brak — lokalizacja firmy. Jeśli plik podaje
     * współrzędne, musi podać też adres: adres firmy przy cudzych współrzędnych
     * wprowadzałby kupującego w błąd.
     */
    private static void applyLocation(OfferEntity offer, ParsedRow row, BusinessUserModel company) {
        String rawLat = row.get(Column.SZEROKOSC_GEO);
        String rawLon = row.get(Column.DLUGOSC_GEO);
        String location = row.get(Column.LOKALIZACJA);
        if (location != null && location.length() > MAX_LOCATION_LENGTH) {
            throw new RowValidationException("VALUE_TOO_LONG",
                    "Wartość w kolumnie „" + Column.LOKALIZACJA.header() + "” jest za długa (maks. "
                            + MAX_LOCATION_LENGTH + " znaków).");
        }

        BigDecimal lat;
        BigDecimal lon;
        if (rawLat == null && rawLon == null) {
            lat = company.getLat();
            lon = company.getLon();
            if (lat == null || lon == null) {
                throw new RowValidationException("LOCATION_REQUIRED",
                        "Konto firmy nie ma ustawionej lokalizacji — podaj szerokosc_geo, dlugosc_geo i lokalizacja.");
            }
        } else {
            lat = parseCoordinate(rawLat, 90);
            lon = parseCoordinate(rawLon, 180);
            if (location == null) {
                throw new RowValidationException("REQUIRED_FIELD_MISSING",
                        "Przy własnych współrzędnych podaj też adres w kolumnie „lokalizacja”.");
            }
        }

        if (location == null) {
            location = company.getAddress();
        }
        if (location == null || location.isBlank()) {
            throw new RowValidationException("LOCATION_REQUIRED",
                    "Konto firmy nie ma ustawionego adresu — podaj go w kolumnie „lokalizacja”.");
        }

        offer.setLatitude(lat.setScale(COORDINATE_SCALE, RoundingMode.HALF_UP));
        offer.setLongitude(lon.setScale(COORDINATE_SCALE, RoundingMode.HALF_UP));
        offer.setLocation(location);
    }

    private static BigDecimal parseCoordinate(String raw, int limit) {
        if (raw == null) {
            throw new RowValidationException("INVALID_COORDINATES",
                    "Podaj obie współrzędne: szerokosc_geo i dlugosc_geo.");
        }
        try {
            BigDecimal value = new BigDecimal(raw.replace(',', '.'));
            if (value.abs().compareTo(BigDecimal.valueOf(limit)) > 0) {
                throw new NumberFormatException();
            }
            return value;
        } catch (NumberFormatException e) {
            throw new RowValidationException("INVALID_COORDINATES",
                    "Nieprawidłowa współrzędna „" + raw + "”.");
        }
    }

    // ------------------------------------------------------------------
    // Kategorie
    // ------------------------------------------------------------------

    /** Kategorie z jednego zapytania, wyszukiwane po nazwie bez względu na wielkość liter. */
    private static final class CategoryIndex {
        private final Map<String, CategoryEntity> byName = new HashMap<>();

        CategoryIndex(List<CategoryEntity> categories) {
            for (CategoryEntity category : categories) {
                byName.putIfAbsent(key(category.getName()), category);
            }
        }

        CategoryEntity category(String name) {
            CategoryEntity category = byName.get(key(name));
            if (category == null) {
                throw new RowValidationException("CATEGORY_NOT_FOUND",
                        "Nie znaleziono kategorii „" + name + "”. Listę kategorii zawiera szablon.");
            }
            return category;
        }

        SubcategoryEntity subcategory(CategoryEntity category, String name) {
            List<SubcategoryEntity> subcategories = Optional.ofNullable(category.getSubcategories()).orElse(List.of());
            if (name == null) {
                if (!subcategories.isEmpty()) {
                    throw new RowValidationException("SUBCATEGORY_REQUIRED",
                            "Kategoria „" + category.getName() + "” wymaga podania podkategorii.");
                }
                return null;
            }
            return subcategories.stream()
                    .filter(sub -> key(sub.getName()).equals(key(name)))
                    .findFirst()
                    .orElseThrow(() -> new RowValidationException("SUBCATEGORY_NOT_FOUND",
                            "Kategoria „" + category.getName() + "” nie ma podkategorii „" + name + "”."));
        }

        private static String key(String name) {
            return name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
        }
    }
}
