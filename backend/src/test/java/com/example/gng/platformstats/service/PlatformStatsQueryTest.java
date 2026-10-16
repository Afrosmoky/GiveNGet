package com.example.gng.platformstats.service;

import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.entity.OfferStatus;
import com.example.gng.offer.entity.TransactionType;
import com.example.gng.offer.repository.OfferRepository;
import com.example.gng.platformstats.dto.PlatformStatsDTO;
import com.example.gng.register.company.model.BusinessUserModel;
import com.example.gng.register.company.repository.BusinessUserModelRepository;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.UserRepository;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Statystyki platformy na prawdziwym MySQL 8 (docs/08, pozycja 4).
 *
 * <p>Liczby powstają w bazie (COUNT, GROUP BY), więc mock nie powiedziałby, czy zapytania
 * faktycznie filtrują typ konta, weryfikację, status i daty. Dane są ułożone tak, żeby każdy
 * z tych filtrów mógł się zepsuć osobno — w szczególności rezerwacja utworzona w okresie,
 * ale odebrana po nim (liczy się do rezerwacji, nie do odbiorów) i odwrotnie.
 *
 * <p>Uruchomienie: property {@code it.mysql.url} wskazująca pustą bazę — patrz CLAUDE.md,
 * sekcja o testach integracyjnych. Bez niej klasa jest pomijana.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({PlatformStatsService.class, PickupCodeGenerator.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@EnabledIfSystemProperty(named = "it.mysql.url", matches = ".+",
        disabledReason = "Brak property it.mysql.url — test wymaga pustej bazy MySQL 8")
class PlatformStatsQueryTest {

    private static final String ADMIN_EMAIL = "admin@example.com";

    /** Zakres testowy: od 10 do 2 dni temu (UTC). */
    private static final LocalDate FROM = LocalDate.now(ZoneOffset.UTC).minusDays(10);
    private static final LocalDate TO = LocalDate.now(ZoneOffset.UTC).minusDays(2);

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getProperty("it.mysql.url"));
        registry.add("spring.datasource.username", () -> System.getProperty("it.mysql.username", "root"));
        registry.add("spring.datasource.password", () -> System.getProperty("it.mysql.password", ""));
        registry.add("spring.datasource.driver-class-name", () -> "com.mysql.cj.jdbc.Driver");
        registry.add("spring.liquibase.enabled", () -> "true");
        registry.add("spring.liquibase.change-log", () -> "classpath:db/changelog/db.changelog-master.xml");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "none");
    }

    @Autowired private PlatformStatsService statsService;
    @Autowired private ReservationRepository reservationRepository;
    @Autowired private OfferRepository offerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private BusinessUserModelRepository businessUserRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    private UserModel buyer;
    private BusinessUserModel store;

    @BeforeEach
    void setUpData() {
        reservationRepository.deleteAll();
        offerRepository.deleteAll();
        userRepository.deleteAll();

        persistUser("admin@example.com", UserType.ADMIN, true, daysAgo(5));

        // REGULAR: 2 zweryfikowane w okresie, 1 niezweryfikowane w okresie, 1 zweryfikowane
        // przed okresem, 1 zweryfikowane bez daty założenia (konto sprzed poprawki create_date)
        buyer = persistUser("kupujacy@example.com", UserType.REGULAR, true, daysAgo(5));
        persistUser("nowy2@example.com", UserType.REGULAR, true, daysAgo(9));
        persistUser("niezweryfikowany@example.com", UserType.REGULAR, false, daysAgo(3));
        persistUser("stary@example.com", UserType.REGULAR, true, daysAgo(40));
        UserModel legacy = persistUser("bezdaty@example.com", UserType.REGULAR, true, daysAgo(1));
        jdbcTemplate.update("UPDATE users SET create_date = NULL WHERE id = ?", legacy.getId());

        // COMPANY: 2 zweryfikowane, 1 niezweryfikowana
        store = persistCompany("sklepA@example.com", true);
        persistCompany("sklepB@example.com", true);
        persistCompany("sklepC@example.com", false);
    }

    @Test
    @DisplayName("Konta: łącznie, zweryfikowane i nowe w okresie — tylko REGULAR, NULL bez daty poza „nowymi”")
    void usersAndStores() {
        PlatformStatsDTO stats = statsService.getPlatformStats(ADMIN_EMAIL, FROM, TO);

        assertEquals(5, stats.users().total(), "admin i firmy nie są użytkownikami REGULAR");
        assertEquals(4, stats.users().verified());
        assertEquals(3, stats.users().newInRange(), "2 zweryfikowane + 1 niezweryfikowane z okresu; konto bez daty pominięte");
        assertEquals(2, stats.stores().verified(), "niezweryfikowana firma się nie liczy");
    }

    @Test
    @DisplayName("Oferty: ACTIVE to stan (bez dat), wystawione — w okresie niezależnie od statusu")
    void offers() {
        persistOffer(OfferStatus.ACTIVE, daysAgo(5));
        persistOffer(OfferStatus.ACTIVE, daysAgo(8));
        persistOffer(OfferStatus.INACTIVE, daysAgo(4));
        persistOffer(OfferStatus.ACTIVE, daysAgo(30));
        persistOffer(OfferStatus.PENDING, daysAgo(0));

        PlatformStatsDTO stats = statsService.getPlatformStats(ADMIN_EMAIL, FROM, TO);

        assertEquals(3, stats.offers().active(), "stan na teraz, także oferta sprzed okresu");
        assertEquals(3, stats.offers().createdInRange(), "2 ACTIVE + 1 INACTIVE wystawione w okresie");
    }

    @Test
    @DisplayName("Rezerwacje po dacie utworzenia, odbiory po dacie odbioru, sztuki tylko z COLLECTED")
    void reservationsAndPickups() {
        OfferEntity offer = persistOffer(OfferStatus.ACTIVE, daysAgo(30));

        // Utworzone w okresie
        persistReservation(offer, 2, ReservationStatus.RESERVED, daysAgo(5), null);
        persistReservation(offer, 3, ReservationStatus.COLLECTED, daysAgo(6), daysAgo(5));
        persistReservation(offer, 5, ReservationStatus.COLLECTED, daysAgo(3), daysAgo(1)); // odebrana po okresie
        persistReservation(offer, 6, ReservationStatus.EXPIRED, daysAgo(7), null);
        persistReservation(offer, 4, ReservationStatus.CANCELLED, daysAgo(4), null);
        // Utworzone przed okresem
        persistReservation(offer, 11, ReservationStatus.COLLECTED, daysAgo(20), daysAgo(4)); // odebrana w okresie
        persistReservation(offer, 7, ReservationStatus.COLLECTED, daysAgo(30), daysAgo(25));
        persistReservation(offer, 9, ReservationStatus.RESERVED, daysAgo(30), null);

        PlatformStatsDTO stats = statsService.getPlatformStats(ADMIN_EMAIL, FROM, TO);

        assertEquals(5, stats.reservations().createdInRange());
        assertEquals(new PlatformStatsDTO.ByStatus(1, 2, 1, 1), stats.reservations().byStatus(),
                "obecny status rezerwacji utworzonych w okresie");
        assertEquals(new PlatformStatsDTO.Pickups(2, 14), stats.pickups(),
                "odbiory w okresie: 3 szt. + 11 szt.; RESERVED/EXPIRED/CANCELLED nie są uratowanym towarem");

        PlatformStatsDTO all = statsService.getPlatformStats(ADMIN_EMAIL, null, null);
        assertEquals(8, all.reservations().createdInRange());
        assertEquals(new PlatformStatsDTO.ByStatus(2, 4, 1, 1), all.reservations().byStatus());
        assertEquals(new PlatformStatsDTO.Pickups(4, 26), all.pickups(), "3 + 5 + 11 + 7");
    }

    @Test
    @DisplayName("Pusta platforma daje zera, nie null")
    void emptyDataGivesZeros() {
        PlatformStatsDTO stats = statsService.getPlatformStats(ADMIN_EMAIL,
                LocalDate.now(ZoneOffset.UTC).minusDays(200), LocalDate.now(ZoneOffset.UTC).minusDays(100));

        assertEquals(0, stats.users().newInRange());
        assertEquals(0, stats.offers().createdInRange());
        assertEquals(0, stats.reservations().createdInRange());
        assertEquals(new PlatformStatsDTO.ByStatus(0, 0, 0, 0), stats.reservations().byStatus());
        assertEquals(new PlatformStatsDTO.Pickups(0, 0), stats.pickups());
    }

    @Test
    @DisplayName("Nowe konto dostaje create_date przy zapisie (@PrePersist)")
    void newAccountGetsCreateDate() {
        UserModel user = new UserModel();
        applyCommonFields(user, "swiezy@example.com", true);
        user.setType(UserType.REGULAR);
        user.setCreateDate(null);

        UserModel saved = userRepository.saveAndFlush(user);

        LocalDateTime stored = jdbcTemplate.queryForObject(
                "SELECT create_date FROM users WHERE id = ?", LocalDateTime.class, saved.getId());
        assertNotNull(stored, "bez @PrePersist Hibernate wstawiał jawny NULL mimo DEFAULT w kolumnie");
    }

    // ------------------------------------------------------------------
    // Fabryki danych
    // ------------------------------------------------------------------

    private static LocalDateTime daysAgo(int days) {
        // Południe, żeby test nie zależał od godziny uruchomienia przy granicach dni
        return LocalDate.now(ZoneOffset.UTC).minusDays(days).atTime(12, 0);
    }

    private UserModel persistUser(String email, UserType type, boolean verified, LocalDateTime createdAt) {
        UserModel user = new UserModel();
        applyCommonFields(user, email, verified);
        user.setType(type);
        user.setCreateDate(createdAt);
        return userRepository.saveAndFlush(user);
    }

    private BusinessUserModel persistCompany(String email, boolean verified) {
        BusinessUserModel company = new BusinessUserModel();
        applyCommonFields(company, email, verified);
        company.setType(UserType.COMPANY);
        company.setCompanyName("Sklep " + email);
        company.setCreateDate(daysAgo(5));
        return businessUserRepository.saveAndFlush(company);
    }

    private void applyCommonFields(UserModel user, String email, boolean verified) {
        user.setFirstName("Jan");
        user.setLastName("Testowy");
        user.setEmail(email);
        user.setPassword("{noop}nieistotne");
        user.setVerified(verified);
        user.setBanned(false);
        // Kolumny NOT NULL z migracji 07
        user.setLang("pl");
        user.setCurrency("PLN");
        user.setLat(new BigDecimal("50.064700"));
        user.setLon(new BigDecimal("19.945000"));
    }

    private OfferEntity persistOffer(OfferStatus status, LocalDateTime createdAt) {
        OfferEntity offer = new OfferEntity();
        offer.setName("Chleb wczorajszy");
        offer.setDescription("Testowa oferta");
        offer.setTransactionType(TransactionType.free);
        offer.setExpiryDate(LocalDate.now().plusDays(3));
        offer.setLatitude(new BigDecimal("50.064700"));
        offer.setLongitude(new BigDecimal("19.945000"));
        offer.setLocation("Kraków");
        offer.setStatus(status);
        offer.setQuantity(100);
        offer.setUser(store);
        offer.setCreatedAt(createdAt);
        offer.setUpdatedAt(createdAt);
        return offerRepository.saveAndFlush(offer);
    }

    private void persistReservation(OfferEntity offer, int quantity, ReservationStatus status,
                                    LocalDateTime createdAt, LocalDateTime collectedAt) {
        ReservationEntity reservation = new ReservationEntity();
        reservation.setOffer(offer);
        reservation.setUser(buyer);
        reservation.setQuantity(quantity);
        reservation.setStatus(status);
        reservation.setPickupCode(new PickupCodeGenerator().generate());
        reservation.setCreatedAt(createdAt);
        reservation.setExpiresAt(createdAt.plusHours(24));
        reservation.setCollectedAt(collectedAt);
        reservationRepository.saveAndFlush(reservation);
    }
}
