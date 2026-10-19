package com.example.gng.reservation.notification;

import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.entity.OfferStatus;
import com.example.gng.offer.entity.TransactionType;
import com.example.gng.offer.repository.OfferRepository;
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
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Claim wysyłki pusha na prawdziwym MySQL 8 — gwarancja „co najwyżej raz” stoi na atomowości
 * warunkowego UPDATE w silniku, więc mock jej nie udowodni. Weryfikuje też migrację 56.
 *
 * <p>Uruchomienie jak {@code ReservationConcurrencyTest} (pusta baza, property {@code it.mysql.url}).
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@EnabledIfSystemProperty(named = "it.mysql.url", matches = ".+",
        disabledReason = "Brak property it.mysql.url — test wymaga pustej bazy MySQL 8")
class ReservationPushClaimTest {

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

    @Autowired private ReservationRepository reservationRepository;
    @Autowired private OfferRepository offerRepository;
    @Autowired private UserRepository userRepository;

    private ReservationEntity reservation;

    @BeforeEach
    void setUp() {
        reservationRepository.deleteAll();
        offerRepository.deleteAll();
        userRepository.deleteAll();

        UserModel seller = persistUser("sklep@example.com");
        UserModel customer = persistUser("klient@example.com");
        OfferEntity offer = persistOffer(seller);
        reservation = persistReservation(offer, customer, ReservationStatus.RESERVED, now().plusMinutes(90));
    }

    @Test
    @DisplayName("Z wielu równoczesnych przebiegów ostrzeżenie przejmuje dokładnie jeden")
    void concurrentClaimsYieldExactlyOneWinner() throws Exception {
        int contenders = 8;
        ExecutorService pool = Executors.newFixedThreadPool(contenders);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> results = new ArrayList<>();
        LocalDateTime now = now();
        for (int i = 0; i < contenders; i++) {
            Callable<Integer> claim = () -> {
                start.await();
                return reservationRepository.claimExpiryWarning(reservation.getId(), now);
            };
            results.add(pool.submit(claim));
        }
        start.countDown();

        int winners = 0;
        for (Future<Integer> result : results) {
            winners += result.get(30, TimeUnit.SECONDS);
        }
        pool.shutdown();

        assertEquals(1, winners, "dokładnie jeden przebieg może wysłać push");
        assertNotNull(reservationRepository.findById(reservation.getId()).orElseThrow().getExpiryWarningSentAt());
    }

    @Test
    @DisplayName("Po claimie rezerwacja wypada z kandydatów, a drugi claim zwraca 0")
    void claimedReservationIsNoLongerCandidate() {
        LocalDateTime now = now();
        assertEquals(1, reservationRepository.findExpiryWarningCandidates(now, now.plusHours(2)).size());

        assertEquals(1, reservationRepository.claimExpiryWarning(reservation.getId(), now));
        assertEquals(0, reservationRepository.claimExpiryWarning(reservation.getId(), now));
        assertTrue(reservationRepository.findExpiryWarningCandidates(now, now.plusHours(2)).isEmpty());

        // Znaczniki są niezależne — przypomnienie o odbiorze wciąż do wysłania
        assertEquals(1, reservationRepository.claimPickupReminder(reservation.getId(), now));
        assertEquals(0, reservationRepository.claimPickupReminder(reservation.getId(), now));
    }

    @Test
    @DisplayName("Odebranej rezerwacji nie da się już przejąć do wysyłki")
    void collectedReservationCannotBeClaimed() {
        ReservationEntity collected = reservationRepository.findById(reservation.getId()).orElseThrow();
        collected.setStatus(ReservationStatus.COLLECTED);
        collected.setCollectedAt(now());
        reservationRepository.saveAndFlush(collected);

        assertEquals(0, reservationRepository.claimExpiryWarning(reservation.getId(), now()));
        assertEquals(0, reservationRepository.claimPickupReminder(reservation.getId(), now()));
    }

    @Test
    @DisplayName("Kandydaci do ostrzeżenia: tylko hold kończący się w oknie")
    void expiryCandidatesRespectWindow() {
        LocalDateTime now = now();
        assertTrue(reservationRepository.findExpiryWarningCandidates(now, now.plusMinutes(60)).isEmpty(),
                "termin za 90 min — poza oknem 60 min");
        assertEquals(1, reservationRepository.findExpiryWarningCandidates(now, now.plusMinutes(120)).size());
    }

    private static LocalDateTime now() {
        return LocalDateTime.now(ZoneOffset.UTC).withNano(0);
    }

    private UserModel persistUser(String email) {
        UserModel user = new UserModel();
        user.setFirstName("Jan");
        user.setLastName("Testowy");
        user.setEmail(email);
        user.setPassword("{noop}nieistotne");
        user.setVerified(true);
        user.setBanned(false);
        user.setLang("pl");
        user.setCurrency("PLN");
        user.setLat(new BigDecimal("50.064700"));
        user.setLon(new BigDecimal("19.945000"));
        user.setCreateDate(now());
        user.setType(UserType.REGULAR);
        return userRepository.saveAndFlush(user);
    }

    private OfferEntity persistOffer(UserModel seller) {
        OfferEntity offer = new OfferEntity();
        offer.setName("Chleb wczorajszy");
        offer.setDescription("Testowa oferta");
        offer.setTransactionType(TransactionType.free);
        offer.setExpiryDate(LocalDate.now().plusDays(3));
        offer.setLatitude(new BigDecimal("50.064700"));
        offer.setLongitude(new BigDecimal("19.945000"));
        offer.setLocation("Kraków");
        offer.setStatus(OfferStatus.ACTIVE);
        offer.setQuantity(5);
        offer.setPickupDateFrom("15:00");
        offer.setPickupDateTo("20:00");
        offer.setUser(seller);
        return offerRepository.saveAndFlush(offer);
    }

    private ReservationEntity persistReservation(OfferEntity offer, UserModel user, ReservationStatus status,
                                                LocalDateTime expiresAt) {
        ReservationEntity entity = new ReservationEntity();
        entity.setOffer(offer);
        entity.setUser(user);
        entity.setQuantity(1);
        entity.setStatus(status);
        entity.setPickupCode(new PickupCodeGenerator().generate());
        entity.setCreatedAt(now().minusHours(2));
        entity.setExpiresAt(expiresAt);
        return reservationRepository.saveAndFlush(entity);
    }
}
