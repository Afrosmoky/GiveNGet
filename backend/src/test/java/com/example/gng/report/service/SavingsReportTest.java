package com.example.gng.report.service;

import com.example.gng.common.exception.BadRequestException;
import com.example.gng.common.exception.ForbiddenOperationException;
import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.entity.OfferStatus;
import com.example.gng.offer.entity.TransactionType;
import com.example.gng.offer.repository.OfferRepository;
import com.example.gng.register.company.model.BusinessUserModel;
import com.example.gng.register.company.repository.BusinessUserModelRepository;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.report.dto.CurrencyAmountDTO;
import com.example.gng.report.dto.SavingsReportDTO;
import com.example.gng.report.repository.SavingsReportRepository;
import com.example.gng.reservation.entity.ReservationEntity;
import com.example.gng.reservation.entity.ReservationStatus;
import com.example.gng.reservation.repository.ReservationRepository;
import com.example.gng.reservation.service.PickupCodeGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Raport oszczędności na prawdziwym MySQL 8.
 *
 * <p>Agregacja dzieje się w bazie (SUM, GROUP BY), więc mock nie powiedziałby nic o tym,
 * czy zapytanie faktycznie filtruje status, zakres dat i firmę. Sprawdzamy wyniki na danych
 * ułożonych tak, żeby każda z tych trzech rzeczy mogła się zepsuć osobno.
 *
 * <p>Uruchomienie: property {@code it.mysql.url} wskazująca pustą bazę — patrz CLAUDE.md,
 * sekcja o testach integracyjnych. Bez niej klasa jest pomijana.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({SavingsReportService.class, PickupCodeGenerator.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@EnabledIfSystemProperty(named = "it.mysql.url", matches = ".+",
        disabledReason = "Brak property it.mysql.url — test wymaga pustej bazy MySQL 8")
class SavingsReportTest {

    private static final String ADMIN_EMAIL = "admin@example.com";

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getProperty("it.mysql.url"));
        registry.add("spring.datasource.username", () -> System.getProperty("it.mysql.username", "root"));
        registry.add("spring.datasource.password", () -> System.getProperty("it.mysql.password", ""));
        registry.add("spring.datasource.driver-class-name", () -> "com.mysql.cj.jdbc.Driver");
        registry.add("spring.liquibase.enabled", () -> "true");
        registry.add("spring.liquibase.change-log", () -> "classpath:db/changelog/db.changelog-master.xml");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "none");
        // Wartości jawne, żeby asercje nie zależały od tego, co stoi w properties profilu
        registry.add("report.avg-weight-kg-per-unit", () -> "0.4");
        registry.add("report.co2-factor-kg-per-kg", () -> "2.5");
    }

    @Autowired private SavingsReportService reportService;
    @Autowired private SavingsReportRepository reportRepository;
    @Autowired private ReservationRepository reservationRepository;
    @Autowired private OfferRepository offerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private BusinessUserModelRepository businessUserRepository;

    private BusinessUserModel storeA;
    private BusinessUserModel storeB;
    private UserModel buyer;
    private UserModel admin;

    @BeforeEach
    void setUpData() {
        reservationRepository.deleteAll();
        offerRepository.deleteAll();
        userRepository.deleteAll();

        storeA = persistCompany("sklepA@example.com", "Sklep A");
        storeB = persistCompany("sklepB@example.com", "Sklep B");
        buyer = persistRegular("kupujacy@example.com");
        admin = persistAdmin(ADMIN_EMAIL);
    }

    // ------------------------------------------------------------------
    // Sumy
    // ------------------------------------------------------------------

    @Test
    @DisplayName("ADMIN widzi sumy z całej platformy")
    void adminSeesWholePlatform() {
        OfferEntity offerA = persistOffer(storeA, 10, new BigDecimal("3.50"), "PLN");
        OfferEntity offerB = persistOffer(storeB, 10, new BigDecimal("2.00"), "PLN");

        persistCollected(offerA, 4, daysAgo(2));
        persistCollected(offerB, 3, daysAgo(1));

        SavingsReportDTO report = reportService.getSavingsReport(ADMIN_EMAIL, null, null, null);

        assertEquals(7, report.savedProductsCount());
        assertNull(report.storeId(), "Bez storeId raport obejmuje całą platformę");
        // 4 * 3.50 + 3 * 2.00 = 20.00
        assertEquals(List.of(new CurrencyAmountDTO("PLN", new BigDecimal("20.00"))), report.valueByCurrency());
    }

    @Test
    @DisplayName("Szacunki kg i CO2 liczone ze współczynników, oznaczone jako estimated")
    void estimatesUseConfiguredFactors() {
        OfferEntity offer = persistOffer(storeA, 20, new BigDecimal("1.00"), "PLN");
        persistCollected(offer, 15, daysAgo(1));

        SavingsReportDTO report = reportService.getSavingsReport(ADMIN_EMAIL, null, null, null);

        assertEquals(15, report.savedProductsCount());
        assertEquals(new BigDecimal("6.00"), report.estimatedKg(), "15 * 0.4");
        assertEquals(new BigDecimal("15.00"), report.estimatedCo2Kg(), "6.0 * 2.5");
        assertTrue(report.estimated(), "kg i CO2 są przybliżeniem i DTO musi to mówić");
    }

    // ------------------------------------------------------------------
    // Tylko COLLECTED
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Liczy się wyłącznie COLLECTED — pozostałe statusy są pomijane")
    void onlyCollectedReservationsCount() {
        OfferEntity offer = persistOffer(storeA, 50, new BigDecimal("5.00"), "PLN");

        persistCollected(offer, 2, daysAgo(1));
        persistReservation(offer, 7, ReservationStatus.RESERVED, null, nowUtc().plusHours(5));
        persistReservation(offer, 5, ReservationStatus.EXPIRED, null, nowUtc().minusHours(5));
        persistReservation(offer, 9, ReservationStatus.CANCELLED, null, nowUtc().plusHours(5));

        SavingsReportDTO report = reportService.getSavingsReport(ADMIN_EMAIL, null, null, null);

        assertEquals(2, report.savedProductsCount(),
                "Obietnica rezerwacji i jej brak nie są uratowanym towarem");
        assertEquals(List.of(new CurrencyAmountDTO("PLN", new BigDecimal("10.00"))), report.valueByCurrency());
    }

    // ------------------------------------------------------------------
    // Zakres dat
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Zakres dat obejmuje dni brzegowe i odcina resztę")
    void dateRangeFiltersByCollectedAt() {
        OfferEntity offer = persistOffer(storeA, 100, new BigDecimal("1.00"), "PLN");

        persistCollected(offer, 1, daysAgo(10)); // poza zakresem
        persistCollected(offer, 2, daysAgo(5));  // dolna granica
        persistCollected(offer, 4, daysAgo(3));  // środek
        persistCollected(offer, 8, daysAgo(1));  // górna granica
        persistCollected(offer, 16, nowUtc());   // poza zakresem

        LocalDate from = LocalDate.now(ZoneOffset.UTC).minusDays(5);
        LocalDate to = LocalDate.now(ZoneOffset.UTC).minusDays(1);

        SavingsReportDTO report = reportService.getSavingsReport(ADMIN_EMAIL, from, to, null);

        assertEquals(14, report.savedProductsCount(), "2 + 4 + 8; dni brzegowe wliczone");
        assertEquals(from, report.from());
        assertEquals(to, report.to());
    }

    @Test
    @DisplayName("Zakres bez odbiorów daje zera, nie null")
    void emptyRangeReturnsZeros() {
        OfferEntity offer = persistOffer(storeA, 10, new BigDecimal("4.00"), "PLN");
        persistCollected(offer, 5, daysAgo(1));

        LocalDate from = LocalDate.now(ZoneOffset.UTC).minusDays(60);
        LocalDate to = LocalDate.now(ZoneOffset.UTC).minusDays(50);

        SavingsReportDTO report = reportService.getSavingsReport(ADMIN_EMAIL, from, to, null);

        assertEquals(0, report.savedProductsCount());
        assertEquals(List.of(), report.valueByCurrency());
        assertEquals(new BigDecimal("0.00"), report.estimatedKg());
        assertEquals(new BigDecimal("0.00"), report.estimatedCo2Kg());
    }

    @Test
    @DisplayName("from po to daje INVALID_DATE_RANGE")
    void invertedRangeIsRejected() {
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> reportService.getSavingsReport(ADMIN_EMAIL,
                        LocalDate.now(ZoneOffset.UTC), LocalDate.now(ZoneOffset.UTC).minusDays(1), null));

        assertEquals("INVALID_DATE_RANGE", ex.getCode());
    }

    // ------------------------------------------------------------------
    // Zakres widoczności
    // ------------------------------------------------------------------

    @Test
    @DisplayName("COMPANY widzi wyłącznie swój sklep")
    void companySeesOnlyItsOwnStore() {
        OfferEntity offerA = persistOffer(storeA, 20, new BigDecimal("2.00"), "PLN");
        OfferEntity offerB = persistOffer(storeB, 20, new BigDecimal("2.00"), "PLN");

        persistCollected(offerA, 3, daysAgo(1));
        persistCollected(offerB, 11, daysAgo(1));

        SavingsReportDTO report = reportService.getSavingsReport(storeA.getEmail(), null, null, null);

        assertEquals(3, report.savedProductsCount(), "Odbiory sklepu B nie mogą wejść do raportu sklepu A");
        assertEquals(storeA.getId(), report.storeId());
        assertEquals(List.of(new CurrencyAmountDTO("PLN", new BigDecimal("6.00"))), report.valueByCurrency());
    }

    @Test
    @DisplayName("COMPANY pytająca o cudzy storeId dostaje FORBIDDEN, nie ciche zawężenie")
    void companyCannotQueryAnotherStore() {
        ForbiddenOperationException ex = assertThrows(ForbiddenOperationException.class,
                () -> reportService.getSavingsReport(storeA.getEmail(), null, null, storeB.getId()));

        assertEquals("FORBIDDEN", ex.getCode());
    }

    @Test
    @DisplayName("COMPANY może podać własne storeId")
    void companyMayPassItsOwnStoreId() {
        OfferEntity offerA = persistOffer(storeA, 20, new BigDecimal("2.00"), "PLN");
        persistCollected(offerA, 6, daysAgo(1));

        SavingsReportDTO report = reportService.getSavingsReport(storeA.getEmail(), null, null, storeA.getId());

        assertEquals(6, report.savedProductsCount());
        assertEquals(storeA.getId(), report.storeId());
    }

    @Test
    @DisplayName("ADMIN może zawęzić raport do jednej firmy")
    void adminCanNarrowToSingleStore() {
        OfferEntity offerA = persistOffer(storeA, 20, new BigDecimal("2.00"), "PLN");
        OfferEntity offerB = persistOffer(storeB, 20, new BigDecimal("2.00"), "PLN");

        persistCollected(offerA, 3, daysAgo(1));
        persistCollected(offerB, 11, daysAgo(1));

        SavingsReportDTO report = reportService.getSavingsReport(ADMIN_EMAIL, null, null, storeB.getId());

        assertEquals(11, report.savedProductsCount());
        assertEquals(storeB.getId(), report.storeId());
    }

    @Test
    @DisplayName("Konto konsumenckie nie ma dostępu do raportu")
    void regularUserHasNoAccess() {
        assertThrows(ForbiddenOperationException.class,
                () -> reportService.getSavingsReport(buyer.getEmail(), null, null, null));
    }

    // ------------------------------------------------------------------
    // Podział walutowy
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Wartość jest grupowana per waluta oferty, w stałej kolejności")
    void valueIsGroupedByCurrency() {
        OfferEntity pln = persistOffer(storeA, 50, new BigDecimal("10.00"), "PLN");
        OfferEntity eur = persistOffer(storeA, 50, new BigDecimal("4.00"), "EUR");
        OfferEntity gbp = persistOffer(storeA, 50, new BigDecimal("1.50"), "GBP");

        persistCollected(pln, 2, daysAgo(1));  // 20.00 PLN
        persistCollected(pln, 3, daysAgo(1));  // +30.00 PLN = 50.00
        persistCollected(eur, 5, daysAgo(1));  // 20.00 EUR
        persistCollected(gbp, 2, daysAgo(1));  // 3.00 GBP

        SavingsReportDTO report = reportService.getSavingsReport(storeA.getEmail(), null, null, null);

        assertEquals(12, report.savedProductsCount());
        assertEquals(List.of(
                new CurrencyAmountDTO("EUR", new BigDecimal("20.00")),
                new CurrencyAmountDTO("GBP", new BigDecimal("3.00")),
                new CurrencyAmountDTO("PLN", new BigDecimal("50.00"))
        ), report.valueByCurrency(), "Kolejność alfabetyczna po walucie — wynik musi być deterministyczny");
    }

    @Test
    @DisplayName("Oferty bez ceny liczą się do sztuk, ale nie do wartości")
    void offersWithoutPriceCountTowardsUnitsOnly() {
        // Tak wygląda dziś KAŻDA oferta w systemie: price i currency nie są ustawiane
        // przy tworzeniu oferty, więc wartość zostaje pusta do czasu dodania ceny.
        OfferEntity free = persistOffer(storeA, 30, null, null);
        OfferEntity paid = persistOffer(storeA, 30, new BigDecimal("2.50"), "PLN");

        persistCollected(free, 8, daysAgo(1));
        persistCollected(paid, 2, daysAgo(1));

        SavingsReportDTO report = reportService.getSavingsReport(storeA.getEmail(), null, null, null);

        assertEquals(10, report.savedProductsCount(), "Uratowany towar bez ceny nadal jest uratowany");
        assertEquals(List.of(new CurrencyAmountDTO("PLN", new BigDecimal("5.00"))), report.valueByCurrency());
        assertEquals(new BigDecimal("4.00"), report.estimatedKg(), "10 * 0.4");
    }

    @Test
    @DisplayName("Cena zapisana w kształcie, jaki produkuje OfferService, wchodzi do raportu")
    void priceWrittenByServiceShapeFeedsTheReport() {
        // OfferService normalizuje cenę do skali 2 i waluty z enuma Currency — raport musi
        // sumować dokładnie takie wartości. To domyka łańcuch: cena na ofercie -> odbiór -> raport.
        OfferEntity offer = persistOffer(storeA, 10, new BigDecimal("4.50"), "PLN");
        persistCollected(offer, 3, daysAgo(1));

        SavingsReportDTO report = reportService.getSavingsReport(storeA.getEmail(), null, null, null);

        assertEquals(3, report.savedProductsCount());
        assertEquals(List.of(new CurrencyAmountDTO("PLN", new BigDecimal("13.50"))), report.valueByCurrency());
    }

    // ------------------------------------------------------------------
    // Zapytania repozytorium bezpośrednio
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Repozytorium zwraca 0, a nie null, gdy nie ma żadnych odbiorów")
    void repositoryReturnsZeroForNoData() {
        long total = reportRepository.sumCollectedQuantity(
                LocalDateTime.of(1000, 1, 1, 0, 0),
                LocalDateTime.of(9999, 12, 31, 23, 59, 59),
                null);

        assertEquals(0L, total);
        assertEquals(List.of(), reportRepository.sumCollectedValueByCurrency(
                LocalDateTime.of(1000, 1, 1, 0, 0),
                LocalDateTime.of(9999, 12, 31, 23, 59, 59),
                null));
    }

    // ------------------------------------------------------------------
    // Fabryki danych
    // ------------------------------------------------------------------

    private static LocalDateTime nowUtc() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    private static LocalDateTime daysAgo(int days) {
        // Południe, żeby test nie zależał od godziny uruchomienia przy granicach dni
        return LocalDate.now(ZoneOffset.UTC).minusDays(days).atTime(12, 0);
    }

    private BusinessUserModel persistCompany(String email, String companyName) {
        BusinessUserModel company = new BusinessUserModel();
        applyCommonFields(company, email);
        company.setType(UserType.COMPANY);
        company.setCompanyName(companyName);
        return businessUserRepository.saveAndFlush(company);
    }

    private UserModel persistRegular(String email) {
        UserModel user = new UserModel();
        applyCommonFields(user, email);
        user.setType(UserType.REGULAR);
        return userRepository.saveAndFlush(user);
    }

    private UserModel persistAdmin(String email) {
        UserModel user = new UserModel();
        applyCommonFields(user, email);
        user.setType(UserType.ADMIN);
        return userRepository.saveAndFlush(user);
    }

    private void applyCommonFields(UserModel user, String email) {
        user.setFirstName("Jan");
        user.setLastName("Testowy");
        user.setEmail(email);
        user.setPassword("{noop}nieistotne");
        user.setVerified(true);
        user.setBanned(false);
        // Kolumny NOT NULL z migracji 07
        user.setLang("pl");
        user.setCurrency("PLN");
        user.setLat(new BigDecimal("50.064700"));
        user.setLon(new BigDecimal("19.945000"));
        user.setCreateDate(nowUtc());
    }

    private OfferEntity persistOffer(UserModel seller, int quantity, BigDecimal price, String currency) {
        OfferEntity offer = new OfferEntity();
        offer.setName("Chleb wczorajszy");
        offer.setDescription("Testowa oferta");
        offer.setTransactionType(price != null ? TransactionType.sale : TransactionType.free);
        offer.setExpiryDate(LocalDate.now().plusDays(3));
        offer.setLatitude(new BigDecimal("50.064700"));
        offer.setLongitude(new BigDecimal("19.945000"));
        offer.setLocation("Kraków");
        offer.setStatus(OfferStatus.ACTIVE);
        offer.setQuantity(quantity);
        offer.setUser(seller);
        offer.setPrice(price);
        offer.setCurrency(currency);
        return offerRepository.saveAndFlush(offer);
    }

    private ReservationEntity persistCollected(OfferEntity offer, int quantity, LocalDateTime collectedAt) {
        return persistReservation(offer, quantity, ReservationStatus.COLLECTED, collectedAt,
                collectedAt.plusHours(24));
    }

    private ReservationEntity persistReservation(OfferEntity offer, int quantity, ReservationStatus status,
                                                LocalDateTime collectedAt, LocalDateTime expiresAt) {
        ReservationEntity reservation = new ReservationEntity();
        reservation.setOffer(offer);
        reservation.setUser(buyer);
        reservation.setQuantity(quantity);
        reservation.setStatus(status);
        reservation.setPickupCode(new PickupCodeGenerator().generate());
        reservation.setCreatedAt(expiresAt.minusHours(24));
        reservation.setExpiresAt(expiresAt);
        reservation.setCollectedAt(collectedAt);
        return reservationRepository.saveAndFlush(reservation);
    }
}
