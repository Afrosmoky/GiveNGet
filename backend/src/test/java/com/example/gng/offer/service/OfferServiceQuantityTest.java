package com.example.gng.offer.service;

import com.example.gng.auth.service.SessionService;
import com.example.gng.email.service.EmailSenderService;
import com.example.gng.common.exception.BadRequestException;
import com.example.gng.common.exception.ForbiddenOperationException;
import com.example.gng.exceptions.InvalidRequestException;
import com.example.gng.favorites.repository.FavoriteOfferRepository;
import com.example.gng.favorites.service.FavoriteOfferService;
import com.example.gng.file.service.FileStorageService;
import com.example.gng.geocode.service.GeoCodeService;
import com.example.gng.image.repository.ImageModelRepository;
import com.example.gng.mail_template.repository.MailTemplateRepository;
import com.example.gng.moderation.service.ForbiddenPatternService;
import com.example.gng.offer.dto.CreateOfferDTO;
import com.example.gng.offer.dto.UpdateOfferDTO;
import com.example.gng.offer.entity.CategoryEntity;
import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.entity.OfferStatus;
import com.example.gng.offer.entity.TransactionType;
import com.example.gng.offer.repository.CategoryEntityRepository;
import com.example.gng.offer.repository.OfferImagesRepository;
import com.example.gng.offer.repository.OfferRepository;
import com.example.gng.offer.repository.SubcategoryRepository;
import com.example.gng.register.company.repository.BusinessUserModelRepository;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.reservation.repository.ReservationRepository;
import com.example.gng.statistics.service.DashboardStatisticsService;
import com.example.gng.user.register.repository.RegularUserModelRepository;
import com.example.gng.user.service.UserRankService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Zapis i walidacja liczby sztuk (quantity) w OfferService.
 *
 * Testy jednostkowe na zamockowanych zależnościach — sprawdzają, jaka wartość
 * quantity trafia do repozytorium przy tworzeniu i edycji oferty.
 */
class OfferServiceQuantityTest {

    private static final String USER_EMAIL = "sprzedawca@example.com";
    private static final Long USER_ID = 42L;
    private static final String OFFER_ID = "OFFER1234567";

    @Mock private OfferRepository offerRepository;
    @Mock private CategoryEntityRepository categoryRepository;
    @Mock private SubcategoryRepository subcategoryRepository;
    @Mock private OfferImagesRepository offerImagesRepository;
    @Mock private ImageModelRepository imageModelRepository;
    @Mock private FileStorageService fileStorageService;
    @Mock private GeoCodeService geoCodeService;
    @Mock private UserRepository userRepository;
    @Mock private SessionService sessionService;
    @Mock private BusinessUserModelRepository businessUserModelRepository;
    @Mock private RegularUserModelRepository regularUserModelRepository;
    @Mock private FavoriteOfferService favoriteOfferService;
    @Mock private FavoriteOfferRepository favoriteOfferRepository;
    @Mock private EmailSenderService emailSenderService;
    @Mock private MailTemplateRepository mailTemplateRepository;
    @Mock private ForbiddenPatternService forbiddenPatternService;
    @Mock private UserRankService userRankService;
    @Mock private DashboardStatisticsService dashboardStatisticsService;
    @Mock private ReservationRepository reservationRepository;

    private AutoCloseable mocks;
    private MockedStatic<SessionService> sessionServiceStatic;
    private OfferService offerService;
    private UserModel currentUser;

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);

        offerService = new OfferService(
                offerRepository, categoryRepository, subcategoryRepository, offerImagesRepository,
                imageModelRepository, fileStorageService, geoCodeService, userRepository, sessionService,
                businessUserModelRepository, regularUserModelRepository, favoriteOfferService,
                favoriteOfferRepository, emailSenderService, mailTemplateRepository,
                forbiddenPatternService, userRankService, dashboardStatisticsService,
                reservationRepository, "http://localhost:3000");

        currentUser = new UserModel();
        currentUser.setId(USER_ID);
        currentUser.setEmail(USER_EMAIL);
        currentUser.setType(UserType.REGULAR);

        sessionServiceStatic = mockStatic(SessionService.class);
        sessionServiceStatic.when(SessionService::getCurrentUserEmail).thenReturn(USER_EMAIL);

        CategoryEntity category = new CategoryEntity();
        category.setId(1);
        category.setName("Pieczywo");
        category.setSubcategories(new ArrayList<>()); // brak podkategorii = subcategoryId opcjonalne

        lenient().when(userRepository.findByEmail(USER_EMAIL)).thenReturn(Optional.of(currentUser));
        lenient().when(categoryRepository.findById(1)).thenReturn(Optional.of(category));
        lenient().when(userRankService.canCreateOffer(currentUser)).thenReturn(true);
        // containsForbiddenContent to varargs — domyślne false z mocka w zupełności wystarcza,
        // bo moderacja treści nie jest przedmiotem tych testów.
        lenient().when(favoriteOfferRepository.findByOfferId(anyString())).thenReturn(Collections.emptyList());
        lenient().when(offerRepository.save(any(OfferEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @AfterEach
    void tearDown() throws Exception {
        sessionServiceStatic.close();
        mocks.close();
    }

    // ---------- helpery ustalania wartości ----------

    @Test
    void resolveQuantityForCreate_defaultsToOneWhenMissing() {
        assertEquals(1, OfferService.resolveQuantityForCreate(null));
    }

    @Test
    void resolveQuantityForCreate_keepsProvidedValue() {
        assertEquals(0, OfferService.resolveQuantityForCreate(0));
        assertEquals(12, OfferService.resolveQuantityForCreate(12));
    }

    @Test
    void resolveQuantityForCreate_rejectsNegative() {
        InvalidRequestException ex = assertThrows(InvalidRequestException.class,
                () -> OfferService.resolveQuantityForCreate(-1));
        assertEquals("Ilość sztuk nie może być ujemna", ex.getMessage());
    }

    @Test
    void resolveQuantityForUpdate_keepsCurrentValueWhenMissing() {
        assertEquals(5, OfferService.resolveQuantityForUpdate(null, 5));
    }

    @Test
    void resolveQuantityForUpdate_fallsBackToOneWhenBothMissing() {
        assertEquals(1, OfferService.resolveQuantityForUpdate(null, null));
    }

    @Test
    void resolveQuantityForUpdate_rejectsNegative() {
        InvalidRequestException ex = assertThrows(InvalidRequestException.class,
                () -> OfferService.resolveQuantityForUpdate(-3, 5));
        assertEquals("Ilość sztuk nie może być ujemna", ex.getMessage());
    }

    // ---------- tworzenie oferty ----------

    @Test
    void createOffer_persistsProvidedQuantity() {
        CreateOfferDTO dto = validCreateDto();
        dto.setQuantity(8);

        offerService.createOffer(dto, null);

        assertEquals(8, savedOffer().getQuantity());
    }

    @Test
    void createOffer_defaultsQuantityToOneWhenNotProvided() {
        // Zgodność wsteczna: starszy klient nie wysyła pola quantity
        CreateOfferDTO dto = validCreateDto();
        dto.setQuantity(null);

        offerService.createOffer(dto, null);

        assertEquals(1, savedOffer().getQuantity());
    }

    @Test
    void createOffer_persistsZeroQuantity() {
        CreateOfferDTO dto = validCreateDto();
        dto.setQuantity(0);

        offerService.createOffer(dto, null);

        assertEquals(0, savedOffer().getQuantity());
    }

    @Test
    void createOffer_rejectsNegativeQuantity() {
        CreateOfferDTO dto = validCreateDto();
        dto.setQuantity(-1);

        InvalidRequestException ex = assertThrows(InvalidRequestException.class,
                () -> offerService.createOffer(dto, null));
        assertEquals("Ilość sztuk nie może być ujemna", ex.getMessage());
    }

    // ---------- cena: helpery ----------

    @Test
    void pricingForCreate_requiresPriceForSale() {
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> OfferService.resolvePricingForCreate(TransactionType.sale, null, "PLN"));
        assertEquals("PRICE_REQUIRED", ex.getCode());
    }

    @Test
    void pricingForCreate_defaultsCurrencyToPln() {
        var pricing = OfferService.resolvePricingForCreate(
                TransactionType.sale, new BigDecimal("3.50"), null);

        assertEquals(new BigDecimal("3.50"), pricing.price());
        assertEquals("PLN", pricing.currency());
    }

    @Test
    void pricingForCreate_normalizesCurrencyCase() {
        var pricing = OfferService.resolvePricingForCreate(
                TransactionType.sale, new BigDecimal("2.00"), " eur ");
        assertEquals("EUR", pricing.currency());
    }

    @Test
    void pricingForCreate_rejectsUnsupportedCurrency() {
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> OfferService.resolvePricingForCreate(
                        TransactionType.sale, new BigDecimal("2.00"), "USD"));
        assertEquals("INVALID_CURRENCY", ex.getCode());
    }

    @Test
    void pricingForCreate_rejectsZeroAndNegativePrice() {
        for (String bad : new String[]{"0", "0.00", "-1.00"}) {
            BadRequestException ex = assertThrows(BadRequestException.class,
                    () -> OfferService.resolvePricingForCreate(
                            TransactionType.sale, new BigDecimal(bad), "PLN"),
                    "Cena " + bad + " powinna zostać odrzucona");
            assertEquals("INVALID_PRICE", ex.getCode());
        }
    }

    @Test
    void pricingForCreate_rejectsTooManyDecimals() {
        // Zaokrąglenie za użytkownika byłoby cichą zmianą jego ceny
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> OfferService.resolvePricingForCreate(
                        TransactionType.sale, new BigDecimal("3.999"), "PLN"));
        assertEquals("INVALID_PRICE", ex.getCode());
        assertEquals(2, ex.getDetails().get("maxDecimals"));
    }

    @Test
    void pricingForCreate_acceptsShorterScaleAndNormalizesToTwoDecimals() {
        var pricing = OfferService.resolvePricingForCreate(
                TransactionType.sale, new BigDecimal("3.5"), "PLN");
        assertEquals(new BigDecimal("3.50"), pricing.price());
    }

    @Test
    void pricingForCreate_rejectsPriceAboveColumnLimit() {
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> OfferService.resolvePricingForCreate(
                        TransactionType.sale, new BigDecimal("100000000.00"), "PLN"));
        assertEquals("INVALID_PRICE", ex.getCode());
    }

    @Test
    void pricingForCreate_rejectsPriceOnFreeAndExchange() {
        for (TransactionType type : new TransactionType[]{TransactionType.free, TransactionType.exchange}) {
            BadRequestException ex = assertThrows(BadRequestException.class,
                    () -> OfferService.resolvePricingForCreate(type, new BigDecimal("1.00"), null));
            assertEquals("PRICE_NOT_ALLOWED_FOR_FREE", ex.getCode());
            assertEquals(type.name(), ex.getDetails().get("offerType"));
        }
    }

    @Test
    void pricingForCreate_rejectsCurrencyWithoutPriceOnFree() {
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> OfferService.resolvePricingForCreate(TransactionType.free, null, "PLN"));
        assertEquals("PRICE_NOT_ALLOWED_FOR_FREE", ex.getCode());
    }

    @Test
    void pricingForCreate_leavesFreeOfferWithoutPricing() {
        var pricing = OfferService.resolvePricingForCreate(TransactionType.free, null, null);
        assertNull(pricing.price());
        assertNull(pricing.currency());
    }

    @Test
    void pricingForUpdate_keepsCurrentPriceWhenFieldsMissing() {
        var pricing = OfferService.resolvePricingForUpdate(
                TransactionType.sale, null, null, new BigDecimal("7.25"), "EUR");

        assertEquals(new BigDecimal("7.25"), pricing.price());
        assertEquals("EUR", pricing.currency(), "Brak pola nie może przestawić waluty na domyślną");
    }

    @Test
    void pricingForUpdate_clearsPricingWhenSwitchingAwayFromSale() {
        var pricing = OfferService.resolvePricingForUpdate(
                TransactionType.free, null, null, new BigDecimal("7.25"), "PLN");

        assertNull(pricing.price(), "Przełączenie na darmową musi wyczyścić cenę");
        assertNull(pricing.currency());
    }

    @Test
    void pricingForUpdate_rejectsSwitchToFreeWithExplicitPrice() {
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> OfferService.resolvePricingForUpdate(
                        TransactionType.exchange, new BigDecimal("5.00"), null, null, null));
        assertEquals("PRICE_NOT_ALLOWED_FOR_FREE", ex.getCode());
    }

    @Test
    void pricingForUpdate_requiresPriceWhenSwitchingFreeToSale() {
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> OfferService.resolvePricingForUpdate(
                        TransactionType.sale, null, null, null, null));
        assertEquals("PRICE_REQUIRED", ex.getCode());
    }

    @Test
    void pricingForUpdate_defaultsCurrencyWhenOfferHadNone() {
        var pricing = OfferService.resolvePricingForUpdate(
                TransactionType.sale, new BigDecimal("4.00"), null, null, null);
        assertEquals("PLN", pricing.currency());
    }

    // ---------- cena: zapis przez serwis ----------

    @Test
    void createOffer_persistsPriceAndCurrencyForSale() {
        CreateOfferDTO dto = validCreateDto();
        dto.setOfferType(TransactionType.sale);
        dto.setPrice(new BigDecimal("12.99"));
        dto.setCurrency("PLN");

        offerService.createOffer(dto, null);

        OfferEntity saved = savedOffer();
        assertEquals(new BigDecimal("12.99"), saved.getPrice());
        assertEquals("PLN", saved.getCurrency());
    }

    @Test
    void createOffer_leavesFreeOfferWithoutPrice() {
        CreateOfferDTO dto = validCreateDto(); // domyślnie free

        offerService.createOffer(dto, null);

        OfferEntity saved = savedOffer();
        assertNull(saved.getPrice());
        assertNull(saved.getCurrency());
    }

    @Test
    void createOffer_rejectsSaleWithoutPrice() {
        CreateOfferDTO dto = validCreateDto();
        dto.setOfferType(TransactionType.sale);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> offerService.createOffer(dto, null));
        assertEquals("PRICE_REQUIRED", ex.getCode());
        verify(offerRepository, never()).save(any(OfferEntity.class));
    }

    @Test
    void updateOffer_clearsPriceWhenSwitchingSaleToFree() {
        givenExistingOffer(3);
        OfferEntity existing = offerRepository.findById(OFFER_ID).orElseThrow();
        existing.setTransactionType(TransactionType.sale);
        existing.setPrice(new BigDecimal("9.99"));
        existing.setCurrency("PLN");

        UpdateOfferDTO dto = validUpdateDto(); // offerType = "free"

        offerService.updateOffer(OFFER_ID, dto, null);

        OfferEntity saved = savedOffer();
        assertNull(saved.getPrice(), "sale -> free musi wyczyścić cenę");
        assertNull(saved.getCurrency());
    }

    @Test
    void updateOffer_keepsPriceWhenFieldsNotProvided() {
        givenExistingOffer(3);
        OfferEntity existing = offerRepository.findById(OFFER_ID).orElseThrow();
        existing.setPrice(new BigDecimal("9.99"));
        existing.setCurrency("EUR");

        UpdateOfferDTO dto = validUpdateDto();
        dto.setOfferType("sale");

        offerService.updateOffer(OFFER_ID, dto, null);

        OfferEntity saved = savedOffer();
        assertEquals(new BigDecimal("9.99"), saved.getPrice());
        assertEquals("EUR", saved.getCurrency());
    }

    // ---------- guard: kto może wystawiać oferty ----------

    @Test
    void createOffer_rejectsStoreEmployee() {
        // Oferta jest przypisywana do konta wywołującego, więc oferta pracownika należałaby
        // do niego, a nie do sklepu — byłaby nieodbieralna i nie trafiłaby do raportu sklepu
        currentUser.setType(UserType.STORE_EMPLOYEE);

        ForbiddenOperationException ex = assertThrows(ForbiddenOperationException.class,
                () -> offerService.createOffer(validCreateDto(), null));

        assertEquals("FORBIDDEN", ex.getCode());
        assertEquals("STORE_EMPLOYEE", ex.getDetails().get("userType"));
        verify(offerRepository, never()).save(any(OfferEntity.class));
    }

    @Test
    void createOffer_allowsRegularUser() {
        currentUser.setType(UserType.REGULAR);

        offerService.createOffer(validCreateDto(), null);

        assertEquals(1, savedOffer().getQuantity());
    }

    @Test
    void createOffer_allowsCompany() {
        currentUser.setType(UserType.COMPANY);

        offerService.createOffer(validCreateDto(), null);

        assertEquals(1, savedOffer().getQuantity());
    }

    // ---------- edycja oferty ----------

    @Test
    void updateOffer_persistsProvidedQuantity() {
        givenExistingOffer(3);
        UpdateOfferDTO dto = validUpdateDto();
        dto.setQuantity(10);

        offerService.updateOffer(OFFER_ID, dto, null);

        assertEquals(10, savedOffer().getQuantity());
    }

    @Test
    void updateOffer_keepsQuantityWhenNotProvided() {
        // Zgodność wsteczna: starszy klient nie wysyła pola, ilość nie może się zmienić
        givenExistingOffer(3);
        UpdateOfferDTO dto = validUpdateDto();
        dto.setQuantity(null);

        offerService.updateOffer(OFFER_ID, dto, null);

        assertEquals(3, savedOffer().getQuantity());
    }

    @Test
    void updateOffer_rejectsNegativeQuantity() {
        givenExistingOffer(3);
        UpdateOfferDTO dto = validUpdateDto();
        dto.setQuantity(-2);

        InvalidRequestException ex = assertThrows(InvalidRequestException.class,
                () -> offerService.updateOffer(OFFER_ID, dto, null));
        assertEquals("Ilość sztuk nie może być ujemna", ex.getMessage());
    }

    // ---------- pomocnicze ----------

    private void givenExistingOffer(int currentQuantity) {
        OfferEntity existing = new OfferEntity();
        existing.setId(OFFER_ID);
        existing.setName("Chleb");
        existing.setDescription("Wczorajszy");
        existing.setLocation("Kraków");
        existing.setStatus(OfferStatus.ACTIVE);
        existing.setTransactionType(TransactionType.free);
        existing.setQuantity(currentQuantity);
        existing.setUser(currentUser);

        when(offerRepository.findById(OFFER_ID)).thenReturn(Optional.of(existing));
    }

    private CreateOfferDTO validCreateDto() {
        CreateOfferDTO dto = new CreateOfferDTO();
        dto.setCategoryId(1);
        dto.setName("Chleb");
        dto.setLocation("Kraków");
        dto.setCoordinates("19.9450,50.0647"); // lon,lat
        dto.setDescription("Wczorajszy, jeszcze świeży");
        dto.setPickupTimeFrom("09:00");
        dto.setPickupTimeTo("17:00");
        dto.setOfferType(TransactionType.free);
        dto.setExpiryDate(LocalDate.now().plusDays(2));
        return dto;
    }

    private UpdateOfferDTO validUpdateDto() {
        UpdateOfferDTO dto = new UpdateOfferDTO();
        dto.setCategoryId(1);
        dto.setName("Chleb");
        dto.setLocation("Kraków");
        dto.setDescription("Wczorajszy, jeszcze świeży");
        dto.setOfferType("free");
        dto.setPickupTimeFrom("09:00");
        dto.setPickupTimeTo("17:00");
        return dto;
    }

    private OfferEntity savedOffer() {
        ArgumentCaptor<OfferEntity> captor = ArgumentCaptor.forClass(OfferEntity.class);
        verify(offerRepository).save(captor.capture());
        return captor.getValue();
    }
}
