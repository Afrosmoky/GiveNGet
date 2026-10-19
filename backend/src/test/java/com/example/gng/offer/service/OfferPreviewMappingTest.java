package com.example.gng.offer.service;

import com.example.gng.auth.service.SessionService;
import com.example.gng.email.service.EmailSenderService;
import com.example.gng.favorites.repository.FavoriteOfferRepository;
import com.example.gng.favorites.service.FavoriteOfferService;
import com.example.gng.file.service.FileStorageService;
import com.example.gng.geocode.service.GeoCodeService;
import com.example.gng.image.repository.ImageModelRepository;
import com.example.gng.mail_template.repository.MailTemplateRepository;
import com.example.gng.moderation.service.ForbiddenPatternService;
import com.example.gng.common.exception.BadRequestException;
import com.example.gng.common.exception.ResourceNotFoundException;
import com.example.gng.offer.dto.CreateOfferDTO;
import com.example.gng.offer.entity.CategoryEntity;
import com.example.gng.offer.entity.SubcategoryEntity;
import com.example.gng.offer.dto.OfferPreview;
import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.entity.OfferStatus;
import com.example.gng.offer.entity.TransactionType;
import com.example.gng.offer.repository.CategoryEntityRepository;
import com.example.gng.offer.repository.OfferImagesRepository;
import com.example.gng.offer.repository.OfferRepository;
import com.example.gng.offer.repository.SubcategoryRepository;
import com.example.gng.register.company.model.BusinessUserModel;
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
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.MockitoAnnotations;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

/**
 * Wspólne mapowanie ofert na kafelki ({@link OfferService#toPreviews}) — używane przez
 * profil sklepu i listy profilu: kolejność wejścia, dane sprzedawcy, odporność na błąd
 * geokodowania i filtr ofert widocznych publicznie.
 */
class OfferPreviewMappingTest {

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
    private BusinessUserModel company;
    private UserModel person;

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

        // Anonimowy odwiedzający — bez ulubionych
        sessionServiceStatic = mockStatic(SessionService.class);
        sessionServiceStatic.when(SessionService::getCurrentUserEmail).thenReturn(null);

        company = new BusinessUserModel();
        company.setId(7L);
        company.setType(UserType.COMPANY);
        company.setCompanyName("Piekarnia Testowa");
        company.setFirstName("Anna");
        company.setLastName("Nowak");

        person = new UserModel();
        person.setId(8L);
        person.setType(UserType.REGULAR);
        person.setFirstName("Jan");
        person.setLastName("Kowalski");
    }

    @AfterEach
    void tearDown() throws Exception {
        sessionServiceStatic.close();
        mocks.close();
    }

    @Test
    void toPreviews_keepsInputOrderAndExposesStoreOnlyForCompanies() {
        List<OfferPreview> previews = offerService.toPreviews(List.of(
                offer("c", "Zupa", company, OfferStatus.ACTIVE),
                offer("a", "Ananas", person, OfferStatus.ACTIVE),
                offer("b", "Bułki", company, OfferStatus.ACTIVE)));

        assertEquals(List.of("c", "a", "b"), previews.stream().map(OfferPreview::getId).toList(),
                "kolejność z zapytania (sort i paginacja w bazie) nie może zostać przemieszana");

        OfferPreview fromStore = previews.get(0);
        assertEquals(7L, fromStore.getSellerId());
        assertEquals(UserType.COMPANY, fromStore.getSellerType());
        assertEquals("Piekarnia Testowa", fromStore.getStoreName());

        OfferPreview fromPerson = previews.get(1);
        assertEquals(8L, fromPerson.getSellerId());
        assertEquals(UserType.REGULAR, fromPerson.getSellerType());
        assertNull(fromPerson.getStoreName(), "imię i nazwisko osoby prywatnej nie trafia na kafelek");
    }

    @Test
    void pickupDateTo_isExposedForTheTile() {
        OfferEntity withPickup = offer("p", "Chleb", company, OfferStatus.ACTIVE);
        withPickup.setPickupDateTo("20:00");
        OfferEntity withoutPickup = offer("q", "Bułki", company, OfferStatus.ACTIVE);

        List<OfferPreview> previews = offerService.toPreviews(List.of(withPickup, withoutPickup));

        assertEquals("20:00", previews.get(0).getPickupDateTo());
        assertNull(previews.get(1).getPickupDateTo(), "brak okna odbioru — kafelek nie pokazuje godziny");
    }

    @Test
    void discount_isExposedWithPercentComputedInBackend() {
        OfferEntity discounted = offer("d", "Chleb", company, OfferStatus.ACTIVE);
        discounted.setTransactionType(TransactionType.sale);
        discounted.setPrice(new BigDecimal("4.50"));
        discounted.setOriginalPrice(new BigDecimal("7.99"));
        discounted.setCurrency("PLN");
        OfferEntity regular = offer("r", "Bułki", company, OfferStatus.ACTIVE);
        regular.setTransactionType(TransactionType.sale);
        regular.setPrice(new BigDecimal("2.00"));
        regular.setCurrency("PLN");

        List<OfferPreview> previews = offerService.toPreviews(List.of(discounted, regular));

        assertEquals(new BigDecimal("7.99"), previews.get(0).getOriginalPrice());
        assertEquals(44, previews.get(0).getDiscountPercent());
        assertNull(previews.get(1).getOriginalPrice());
        assertNull(previews.get(1).getDiscountPercent(), "bez przeceny — bez badge'a");
    }

    // ---------- podkategoria przy tworzeniu: błędy 6.3 zamiast 500 ----------

    private CreateOfferDTO createRequest(Integer subcategoryId) {
        sessionServiceStatic.when(SessionService::getCurrentUserEmail).thenReturn("firma@test.pl");
        when(userRepository.findByEmail("firma@test.pl")).thenReturn(Optional.of(company));
        when(userRankService.canCreateOffer(company)).thenReturn(true);

        CreateOfferDTO dto = new CreateOfferDTO();
        dto.setCategoryId(6);
        dto.setSubcategoryId(subcategoryId);
        dto.setName("Chleb");
        dto.setDescription("Opis");
        dto.setLocation("Kraków");
        dto.setCoordinates("19.94,50.06");
        dto.setPickupTimeFrom("09:00");
        dto.setPickupTimeTo("18:00");
        dto.setOfferType(TransactionType.free);
        dto.setExpiryDate(java.time.LocalDate.now().plusDays(2));
        return dto;
    }

    private CategoryEntity categoryWithSubcategory(int categoryId, int subcategoryId) {
        CategoryEntity category = new CategoryEntity();
        category.setId(categoryId);
        category.setName("Pieczywo i wypieki");
        SubcategoryEntity sub = new SubcategoryEntity();
        sub.setId(subcategoryId);
        sub.setCategory(category);
        category.setSubcategories(new java.util.ArrayList<>(List.of(sub)));
        return category;
    }

    @Test
    void createOffer_withoutRequiredSubcategory_is400WithCode() {
        when(categoryRepository.findById(6)).thenReturn(Optional.of(categoryWithSubcategory(6, 16)));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> offerService.createOffer(createRequest(null), List.of()));

        assertEquals("SUBCATEGORY_REQUIRED", ex.getCode());
        assertEquals(6, ex.getDetails().get("categoryId"));
    }

    @Test
    void createOffer_subcategoryFromOtherCategory_is400WithCode() {
        when(categoryRepository.findById(6)).thenReturn(Optional.of(categoryWithSubcategory(6, 16)));
        CategoryEntity other = categoryWithSubcategory(3, 2);
        when(subcategoryRepository.findById(2)).thenReturn(Optional.of(other.getSubcategories().get(0)));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> offerService.createOffer(createRequest(2), List.of()));
        assertEquals("SUBCATEGORY_MISMATCH", ex.getCode());
    }

    @Test
    void createOffer_unknownSubcategory_is404WithCode() {
        when(categoryRepository.findById(6)).thenReturn(Optional.of(categoryWithSubcategory(6, 16)));
        when(subcategoryRepository.findById(999)).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> offerService.createOffer(createRequest(999), List.of()));
        assertEquals("SUBCATEGORY_NOT_FOUND", ex.getCode());
    }

    @Test
    void geocodingFailure_doesNotBreakTheList() {
        when(geoCodeService.searchByCoordinatesSimplified(anyString(), anyString()))
                .thenThrow(new RestClientException("401 Invalid apiKey"));

        List<OfferPreview> previews = offerService.toPreviews(List.of(
                offer("a", "Chleb", company, OfferStatus.ACTIVE),
                offer("b", "Bułki", company, OfferStatus.ACTIVE)));

        assertEquals(2, previews.size());
        assertNull(previews.get(0).getLocation(), "bez miasta, ale kafelek jest");
    }

    @Test
    void activeUserOffers_hideModeratedBlockedAndInactiveOffers() {
        when(offerRepository.findByUser(7L)).thenReturn(List.of(
                offer("1", "Aktywna", company, OfferStatus.ACTIVE),
                offer("2", "Do moderacji", company, OfferStatus.PENDING),
                offer("3", "Wyłączona", company, OfferStatus.INACTIVE),
                offer("4", "Zablokowana", company, OfferStatus.BLOCKED)));

        List<OfferPreview> previews = offerService.getActiveUserOffers(7L);

        assertEquals(List.of("1"), previews.stream().map(OfferPreview::getId).toList());
    }

    @Test
    void ownerList_stillContainsAllStatuses() {
        when(offerRepository.findByUser(7L)).thenReturn(List.of(
                offer("1", "Aktywna", company, OfferStatus.ACTIVE),
                offer("2", "Do moderacji", company, OfferStatus.PENDING)));

        assertEquals(2, offerService.getUserOffers(7L).size(), "panel właściciela (/api/offer/my) bez zmian");
    }

    private static OfferEntity offer(String id, String name, UserModel owner, OfferStatus status) {
        OfferEntity offer = new OfferEntity();
        offer.setId(id);
        offer.setName(name);
        offer.setUser(owner);
        offer.setStatus(status);
        offer.setTransactionType(TransactionType.free);
        offer.setQuantity(1);
        offer.setLatitude(new BigDecimal("50.064700"));
        offer.setLongitude(new BigDecimal("19.945000"));
        return offer;
    }
}
