package com.example.gng.reservation.service;

import com.example.gng.common.exception.ForbiddenOperationException;
import com.example.gng.common.exception.InvalidPickupCodeException;
import com.example.gng.common.exception.InvalidStateException;
import com.example.gng.common.exception.OfferNotAvailableException;
import com.example.gng.common.exception.TooManyRequestsException;
import com.example.gng.common.ratelimit.RateLimitProperties;
import com.example.gng.common.ratelimit.TokenBucketRateLimiter;
import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.entity.OfferStatus;
import com.example.gng.offer.entity.TransactionType;
import com.example.gng.offer.repository.OfferRepository;
import com.example.gng.register.company.model.BusinessUserModel;
import com.example.gng.register.company.repository.BusinessUserModelRepository;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.store.entity.StoreEmployeeModel;
import com.example.gng.store.repository.StoreEmployeeRepository;
import com.example.gng.reservation.dto.CreateReservationRequest;
import com.example.gng.reservation.entity.ReservationEntity;
import com.example.gng.reservation.entity.ReservationStatus;
import com.example.gng.reservation.repository.ReservationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
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
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Testy rezerwacji na prawdziwym MySQL 8.
 *
 * <p>Dlaczego nie na mockach: sekcja 2 designu opiera poprawność na pesymistycznej
 * blokadzie wiersza oferty. Mock zwróci, co mu każemy, i „przejdzie" niezależnie od tego,
 * czy {@code SELECT ... FOR UPDATE} faktycznie serializuje zapisy. Jedyny sposób, żeby
 * udowodnić, że nie sprzedamy towaru, którego nie ma, to puścić równoczesne transakcje
 * na silniku, który tę blokadę implementuje. Ten test przy okazji weryfikuje migrację
 * 48 — indeks UNIQUE na {@code pickup_code} i typy kolumn.
 *
 * <p>Bazę podaje się z zewnątrz property {@code it.mysql.url} — schemat buduje Liquibase
 * z tego samego changelogu, co produkcja, więc test jest jednocześnie weryfikacją migracji.
 * Bez tej property klasa jest pomijana, żeby zwykłe {@code mvn test} nie wymagało bazy.
 *
 * <p>Uruchomienie lokalnie (baza musi być pusta — Liquibase zakłada schemat od zera):
 * <pre>
 * docker run -d --name gng-it-mysql -p 3307:3306 \
 *   -e MYSQL_ROOT_PASSWORD=it -e MYSQL_DATABASE=gngit mysql:8.0
 *
 * mvn test -Dtest=ReservationConcurrencyTest \
 *   -Dit.mysql.url='jdbc:mysql://localhost:3307/gngit?useSSL=false&amp;allowPublicKeyRetrieval=true&amp;serverTimezone=UTC' \
 *   -Dit.mysql.username=root -Dit.mysql.password=it
 * </pre>
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({ReservationService.class, PickupCodeGenerator.class,
        TokenBucketRateLimiter.class, RateLimitProperties.class})
// Metody testowe działają BEZ transakcji — inaczej wątki nie mogłyby zobaczyć
// nawzajem swoich zatwierdzonych zapisów, a blokada wiersza nie miałaby czego serializować.
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@EnabledIfSystemProperty(named = "it.mysql.url", matches = ".+",
        disabledReason = "Brak property it.mysql.url — test wymaga pustej bazy MySQL 8")
class ReservationConcurrencyTest {

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getProperty("it.mysql.url"));
        registry.add("spring.datasource.username", () -> System.getProperty("it.mysql.username", "root"));
        registry.add("spring.datasource.password", () -> System.getProperty("it.mysql.password", ""));
        registry.add("spring.datasource.driver-class-name", () -> "com.mysql.cj.jdbc.Driver");
        // Schemat buduje Liquibase z tego samego changelogu, co produkcja
        registry.add("spring.liquibase.enabled", () -> "true");
        registry.add("spring.liquibase.change-log", () -> "classpath:db/changelog/db.changelog-master.xml");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "none");
        registry.add("reservation.hold-ttl-hours", () -> "24");
        // Limit tempa celowo luźny — tu sprawdzamy TWARDY limit aktywnych rezerwacji,
        // nie tempo. Twardy limit ustawiony nisko, żeby test był krótki.
        registry.add("ratelimit.reservation-create.capacity", () -> "1000");
        registry.add("ratelimit.reservation-create.period", () -> "PT1M");
        registry.add("reservation.max-active-per-user", () -> "3");
    }

    @Autowired private ReservationService reservationService;
    @Autowired private ReservationRepository reservationRepository;
    @Autowired private OfferRepository offerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private BusinessUserModelRepository businessUserRepository;
    @Autowired private StoreEmployeeRepository storeEmployeeRepository;

    private String offerId;

    @BeforeEach
    void resetData() {
        // Kolejność wymuszona kluczami obcymi: rezerwacje -> oferty -> pracownicy -> konta
        reservationRepository.deleteAll();
        offerRepository.deleteAll();
        storeEmployeeRepository.deleteAll();
        userRepository.deleteAll();
    }

    // ------------------------------------------------------------------
    // Współbieżność
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Równoczesne rezerwacje nie przekroczą stanu magazynowego")
    void concurrentReservationsNeverOversell() throws Exception {
        int stock = 3;
        int contenders = 8;

        UserModel seller = persistUser("sprzedawca@example.com");
        offerId = persistOffer(seller, stock).getId();
        List<UserModel> buyers = persistBuyers(contenders);

        CountDownLatch startGate = new CountDownLatch(1);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();

        ExecutorService pool = Executors.newFixedThreadPool(contenders);
        try {
            List<Callable<Void>> tasks = new ArrayList<>();
            for (UserModel buyer : buyers) {
                tasks.add(() -> {
                    startGate.await(10, TimeUnit.SECONDS);
                    try {
                        reservationService.create(buyer.getEmail(), new CreateReservationRequest(offerId, 1));
                        succeeded.incrementAndGet();
                    } catch (OfferNotAvailableException expected) {
                        rejected.incrementAndGet();
                    }
                    return null;
                });
            }

            List<Future<Void>> futures = new ArrayList<>();
            for (Callable<Void> task : tasks) {
                futures.add(pool.submit(task));
            }

            startGate.countDown(); // wszystkie wątki ruszają razem

            for (Future<Void> future : futures) {
                future.get(60, TimeUnit.SECONDS); // wyjątek innego typu wysadzi test
            }
        } finally {
            pool.shutdownNow();
        }

        assertEquals(stock, succeeded.get(), "Udać się powinno dokładnie tyle rezerwacji, ile jest sztuk");
        assertEquals(contenders - stock, rejected.get(), "Pozostałe muszą dostać OFFER_NOT_AVAILABLE");

        int reservedTotal = reservationRepository.sumOccupiedQuantityByOfferId(offerId, nowUtc());
        assertEquals(stock, reservedTotal, "Suma aktywnych rezerwacji nie może przekroczyć stanu");
        assertEquals(0, availability(), "Po rozejściu całego stanu dostępność musi być zerowa");
    }

    @Test
    @DisplayName("Równoczesne rezerwacje po wiele sztuk też nie przekroczą stanu")
    void concurrentMultiUnitReservationsNeverOversell() throws Exception {
        int stock = 10;
        int contenders = 6;
        int perReservation = 4; // zmieści się tylko dwa razy

        UserModel seller = persistUser("sprzedawca2@example.com");
        offerId = persistOffer(seller, stock).getId();
        List<UserModel> buyers = persistBuyers(contenders);

        CountDownLatch startGate = new CountDownLatch(1);
        AtomicInteger succeeded = new AtomicInteger();

        ExecutorService pool = Executors.newFixedThreadPool(contenders);
        try {
            List<Future<?>> futures = new ArrayList<>();
            for (UserModel buyer : buyers) {
                futures.add(pool.submit(() -> {
                    startGate.await(10, TimeUnit.SECONDS);
                    try {
                        reservationService.create(buyer.getEmail(),
                                new CreateReservationRequest(offerId, perReservation));
                        succeeded.incrementAndGet();
                    } catch (OfferNotAvailableException expected) {
                        // stan się skończył
                    }
                    return null;
                }));
            }
            startGate.countDown();
            for (Future<?> future : futures) {
                future.get(60, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }

        assertEquals(2, succeeded.get(), "10 sztuk mieści dokładnie dwie rezerwacje po 4");

        int reservedTotal = reservationRepository.sumOccupiedQuantityByOfferId(offerId, nowUtc());
        assertEquals(8, reservedTotal);
        assertTrue(reservedTotal <= stock, "Suma rezerwacji nigdy nie może przekroczyć quantity");
        assertEquals(2, availability(), "Zostają 2 sztuki, na które nie zmieściła się kolejna rezerwacja");
    }

    @Test
    @DisplayName("Twardy limit aktywnych rezerwacji wytrzymuje równoczesne żądania na RÓŻNE oferty")
    void concurrentReservationsRespectHardActiveLimit() throws Exception {
        // Najtrudniejszy przypadek: różne oferty = różne wiersze do zablokowania.
        // Bez blokady wiersza UŻYTKOWNIKA wszystkie wątki policzyłyby te same 0 aktywnych
        // rezerwacji i limit 3 zostałby przekroczony.
        int maxActive = 3;
        int attempts = 8;

        BusinessUserModel store = persistCompany("piekarnia-limit@example.com", "Piekarnia Limit");
        UserModel buyer = persistUser("kupujacy-limit@example.com");

        List<String> offerIds = new ArrayList<>();
        for (int i = 0; i < attempts; i++) {
            offerIds.add(persistOffer(store, 5).getId());
        }
        offerId = offerIds.get(0);

        CountDownLatch startGate = new CountDownLatch(1);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();

        ExecutorService pool = Executors.newFixedThreadPool(attempts);
        try {
            List<Future<?>> futures = new ArrayList<>();
            for (String targetOfferId : offerIds) {
                futures.add(pool.submit(() -> {
                    startGate.await(10, TimeUnit.SECONDS);
                    try {
                        reservationService.create(buyer.getEmail(),
                                new CreateReservationRequest(targetOfferId, 1));
                        succeeded.incrementAndGet();
                    } catch (TooManyRequestsException expected) {
                        rejected.incrementAndGet();
                    }
                    return null;
                }));
            }
            startGate.countDown();
            for (Future<?> future : futures) {
                future.get(60, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }

        assertEquals(maxActive, succeeded.get(),
                "Przejść ma dokładnie tyle rezerwacji, ile wynosi twardy limit");
        assertEquals(attempts - maxActive, rejected.get());
        assertEquals(maxActive, reservationRepository.countActiveByUserId(buyer.getId(), nowUtc()),
                "Stan w bazie musi zgadzać się z limitem");
    }

    @Test
    @DisplayName("Zwolnienie rezerwacji odblokowuje miejsce w twardym limicie")
    void cancellingFreesSlotInActiveLimit() {
        BusinessUserModel store = persistCompany("piekarnia-slot@example.com", "Piekarnia Slot");
        UserModel buyer = persistUser("kupujacy-slot@example.com");

        List<String> created = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            String id = persistOffer(store, 5).getId();
            created.add(reservationService.create(buyer.getEmail(),
                    new CreateReservationRequest(id, 1)).id());
        }

        String blockedOfferId = persistOffer(store, 5).getId();
        assertThrows(TooManyRequestsException.class, () -> reservationService.create(
                buyer.getEmail(), new CreateReservationRequest(blockedOfferId, 1)));

        reservationService.cancel(buyer.getEmail(), created.get(0));

        // Po anulowaniu jest wolne miejsce
        var extra = reservationService.create(buyer.getEmail(),
                new CreateReservationRequest(blockedOfferId, 1));
        assertEquals(1, extra.quantity());
        assertEquals(3, reservationRepository.countActiveByUserId(buyer.getId(), nowUtc()));
    }

    // ------------------------------------------------------------------
    // Anulowanie zwalnia dostępność
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Anulowanie zwalnia dostępność i pozwala zarezerwować ponownie")
    void cancellationReleasesAvailability() {
        UserModel seller = persistUser("sprzedawca3@example.com");
        offerId = persistOffer(seller, 2).getId();
        UserModel firstBuyer = persistUser("kupujacy-a@example.com");
        UserModel secondBuyer = persistUser("kupujacy-b@example.com");

        var reservation = reservationService.create(firstBuyer.getEmail(),
                new CreateReservationRequest(offerId, 2));
        assertEquals(0, availability(), "Cały stan zablokowany");

        // Drugi kupujący nie ma czego rezerwować
        assertThrows(OfferNotAvailableException.class, () -> reservationService.create(
                secondBuyer.getEmail(), new CreateReservationRequest(offerId, 1)));

        reservationService.cancel(firstBuyer.getEmail(), reservation.id());

        assertEquals(2, availability(), "Anulowanie musi natychmiast zwolnić sztuki");
        assertEquals(ReservationStatus.CANCELLED,
                reservationRepository.findById(reservation.id()).orElseThrow().getStatus());

        // ...i teraz drugi kupujący przechodzi
        var second = reservationService.create(secondBuyer.getEmail(),
                new CreateReservationRequest(offerId, 2));
        assertEquals(2, second.quantity());
        assertEquals(0, availability());
    }

    // ------------------------------------------------------------------
    // Wygasanie
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Rezerwacja po terminie nie blokuje dostępności, nawet przed przebiegiem schedulera")
    void expiredReservationDoesNotBlockAvailability() {
        UserModel seller = persistUser("sprzedawca4@example.com");
        OfferEntity offer = persistOffer(seller, 2);
        offerId = offer.getId();
        UserModel buyer = persistUser("kupujacy-c@example.com");

        // Rezerwacja wpisana bezpośrednio, z terminem w przeszłości i statusem wciąż RESERVED
        persistReservation(offer, buyer, 2, ReservationStatus.RESERVED, nowUtc().minusHours(1));

        assertEquals(2, availability(),
                "Dostępność liczy tylko niewygasłe rezerwacje, więc stan jest wolny od razu");
    }

    @Test
    @DisplayName("Scheduler przestawia przeterminowane RESERVED na EXPIRED i nie rusza pozostałych")
    void expiringOverdueReservationsFlipsOnlyOverdueOnes() {
        UserModel seller = persistUser("sprzedawca5@example.com");
        OfferEntity offer = persistOffer(seller, 10);
        offerId = offer.getId();
        UserModel buyer = persistUser("kupujacy-d@example.com");

        var overdue = persistReservation(offer, buyer, 1, ReservationStatus.RESERVED, nowUtc().minusHours(2));
        var stillActive = persistReservation(offer, buyer, 1, ReservationStatus.RESERVED, nowUtc().plusHours(5));
        var alreadyCancelled = persistReservation(offer, buyer, 1, ReservationStatus.CANCELLED, nowUtc().minusHours(3));

        int expired = reservationService.expireOverdueReservations();

        assertEquals(1, expired, "Tylko jedna rezerwacja była przeterminowana i aktywna");
        assertEquals(ReservationStatus.EXPIRED, statusOf(overdue));
        assertEquals(ReservationStatus.RESERVED, statusOf(stillActive), "Niewygasła zostaje bez zmian");
        assertEquals(ReservationStatus.CANCELLED, statusOf(alreadyCancelled), "Terminalna zostaje bez zmian");

        // Idempotencja: drugi przebieg nie ma już nic do roboty
        assertEquals(0, reservationService.expireOverdueReservations());
    }

    @Test
    @DisplayName("Wygaśnięcie zwalnia sztuki dla kolejnego kupującego")
    void expiryFreesStockForNextBuyer() {
        UserModel seller = persistUser("sprzedawca6@example.com");
        OfferEntity offer = persistOffer(seller, 1);
        offerId = offer.getId();
        UserModel firstBuyer = persistUser("kupujacy-e@example.com");
        UserModel secondBuyer = persistUser("kupujacy-f@example.com");

        persistReservation(offer, firstBuyer, 1, ReservationStatus.RESERVED, nowUtc().minusMinutes(1));
        reservationService.expireOverdueReservations();

        var second = reservationService.create(secondBuyer.getEmail(),
                new CreateReservationRequest(offerId, 1));

        assertEquals(1, second.quantity());
        assertEquals(0, availability());
    }

    @Test
    @DisplayName("Odebrana rezerwacja nadal zajmuje stan — odbiór nie odblokowuje towaru")
    void collectedReservationKeepsOccupyingStock() {
        UserModel seller = persistUser("sprzedawca8@example.com");
        OfferEntity offer = persistOffer(seller, 2);
        offerId = offer.getId();
        UserModel buyer = persistUser("kupujacy-h@example.com");

        // Towar wydany: status COLLECTED, termin holdu dawno minął
        persistReservation(offer, buyer, 2, ReservationStatus.COLLECTED, nowUtc().minusHours(5));

        assertEquals(0, availability(),
                "COLLECTED zajmuje stan — inaczej wydany towar wróciłby do puli");

        // ...i nikt nie zarezerwuje tego, co już wyszło ze sklepu
        UserModel otherBuyer = persistUser("kupujacy-i@example.com");
        assertThrows(OfferNotAvailableException.class, () -> reservationService.create(
                otherBuyer.getEmail(), new CreateReservationRequest(offerId, 1)));
    }

    @Test
    @DisplayName("Scheduler nie rusza rezerwacji COLLECTED, choć jej termin minął")
    void expiringDoesNotTouchCollectedReservations() {
        UserModel seller = persistUser("sprzedawca9@example.com");
        OfferEntity offer = persistOffer(seller, 5);
        offerId = offer.getId();
        UserModel buyer = persistUser("kupujacy-j@example.com");

        var collected = persistReservation(offer, buyer, 1, ReservationStatus.COLLECTED, nowUtc().minusHours(6));

        assertEquals(0, reservationService.expireOverdueReservations());
        assertEquals(ReservationStatus.COLLECTED, statusOf(collected));
    }

    // ------------------------------------------------------------------
    // Potwierdzenie odbioru (pracownik sklepu)
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Pracownik sklepu potwierdza odbiór po kodzie, a dostępność NIE rośnie")
    void collectByPickupCodeDoesNotReleaseStock() {
        BusinessUserModel store = persistCompany("piekarnia@example.com", "Piekarnia");
        OfferEntity offer = persistOffer(store, 3);
        offerId = offer.getId();
        UserModel buyer = persistUser("kupujacy-k@example.com");
        StoreEmployeeModel staff = persistStoreEmployee("pracownik-a@example.com", store);

        var reservation = reservationService.create(buyer.getEmail(),
                new CreateReservationRequest(offerId, 2));
        assertEquals(1, availability(), "3 sztuki minus 2 zarezerwowane");

        var collected = reservationService.collect(staff.getEmail(), reservation.pickupCode());

        assertEquals(ReservationStatus.COLLECTED, collected.status());
        assertNotNull(collected.collectedAt(), "collectedAt musi zostać zapisane");

        ReservationEntity fromDb = reservationRepository.findById(reservation.id()).orElseThrow();
        assertEquals(ReservationStatus.COLLECTED, fromDb.getStatus());
        assertNotNull(fromDb.getCollectedAt());

        assertEquals(1, availability(),
                "Po odbiorze dostępność nie może wzrosnąć — COLLECTED nadal zajmuje stan");
        assertEquals(2, reservationRepository.sumOccupiedQuantityByOfferId(offerId, nowUtc()));
    }

    @Test
    @DisplayName("Podwójny odbiór tego samego kodu jest zablokowany")
    void doubleCollectIsRejected() {
        BusinessUserModel store = persistCompany("piekarnia2@example.com", "Piekarnia 2");
        OfferEntity offer = persistOffer(store, 5);
        offerId = offer.getId();
        UserModel buyer = persistUser("kupujacy-l@example.com");
        StoreEmployeeModel staff = persistStoreEmployee("pracownik-b@example.com", store);

        var reservation = reservationService.create(buyer.getEmail(),
                new CreateReservationRequest(offerId, 1));

        reservationService.collect(staff.getEmail(), reservation.pickupCode());

        InvalidStateException ex = assertThrows(InvalidStateException.class,
                () -> reservationService.collect(staff.getEmail(), reservation.pickupCode()));
        assertEquals("RESERVATION_NOT_COLLECTABLE", ex.getCode());
        assertEquals("COLLECTED", ex.getDetails().get("status"));

        assertEquals(4, availability(), "Stan policzony dokładnie raz, nie dwa");
    }

    @Test
    @DisplayName("Równoczesne próby odbioru tego samego kodu — dokładnie jedna przechodzi")
    void concurrentCollectAttemptsSucceedExactlyOnce() throws Exception {
        BusinessUserModel store = persistCompany("piekarnia3@example.com", "Piekarnia 3");
        OfferEntity offer = persistOffer(store, 5);
        offerId = offer.getId();
        UserModel buyer = persistUser("kupujacy-m@example.com");
        StoreEmployeeModel staff = persistStoreEmployee("pracownik-c@example.com", store);

        var reservation = reservationService.create(buyer.getEmail(),
                new CreateReservationRequest(offerId, 2));

        int attempts = 6;
        CountDownLatch startGate = new CountDownLatch(1);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();

        ExecutorService pool = Executors.newFixedThreadPool(attempts);
        try {
            List<Future<?>> futures = new ArrayList<>();
            for (int i = 0; i < attempts; i++) {
                futures.add(pool.submit(() -> {
                    startGate.await(10, TimeUnit.SECONDS);
                    try {
                        reservationService.collect(staff.getEmail(), reservation.pickupCode());
                        succeeded.incrementAndGet();
                    } catch (InvalidStateException expected) {
                        rejected.incrementAndGet();
                    }
                    return null;
                }));
            }
            startGate.countDown();
            for (Future<?> future : futures) {
                future.get(60, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }

        assertEquals(1, succeeded.get(), "Towar wydaje się raz, więc raz go potwierdzamy");
        assertEquals(attempts - 1, rejected.get());
        assertEquals(3, availability(), "5 sztuk minus 2 odebrane — liczone raz");
    }

    @Test
    @DisplayName("Pracownik innego sklepu nie odbierze rezerwacji")
    void employeeFromAnotherStoreCannotCollect() {
        BusinessUserModel ourStore = persistCompany("naszsklep@example.com", "Nasz sklep");
        BusinessUserModel otherStore = persistCompany("obcysklep@example.com", "Obcy sklep");
        OfferEntity offer = persistOffer(ourStore, 2);
        offerId = offer.getId();
        UserModel buyer = persistUser("kupujacy-n@example.com");
        StoreEmployeeModel foreignStaff = persistStoreEmployee("pracownik-obcy@example.com", otherStore);

        var reservation = reservationService.create(buyer.getEmail(),
                new CreateReservationRequest(offerId, 1));

        ForbiddenOperationException ex = assertThrows(ForbiddenOperationException.class,
                () -> reservationService.collect(foreignStaff.getEmail(), reservation.pickupCode()));
        assertEquals("FORBIDDEN", ex.getCode());

        assertEquals(ReservationStatus.RESERVED,
                reservationRepository.findById(reservation.id()).orElseThrow().getStatus(),
                "Rezerwacja musi zostać nietknięta");
    }

    @Test
    @DisplayName("Nieznany kod odbioru daje INVALID_PICKUP_CODE")
    void unknownPickupCodeIsRejected() {
        BusinessUserModel store = persistCompany("piekarnia4@example.com", "Piekarnia 4");
        offerId = persistOffer(store, 1).getId();
        StoreEmployeeModel staff = persistStoreEmployee("pracownik-d@example.com", store);

        InvalidPickupCodeException ex = assertThrows(InvalidPickupCodeException.class,
                () -> reservationService.collect(staff.getEmail(), "ZZZZZZ"));
        assertEquals("INVALID_PICKUP_CODE", ex.getCode());
    }

    @Test
    @DisplayName("Rezerwacja po terminie nie da się odebrać")
    void expiredReservationCannotBeCollected() {
        BusinessUserModel store = persistCompany("piekarnia5@example.com", "Piekarnia 5");
        OfferEntity offer = persistOffer(store, 2);
        offerId = offer.getId();
        UserModel buyer = persistUser("kupujacy-o@example.com");
        StoreEmployeeModel staff = persistStoreEmployee("pracownik-e@example.com", store);

        ReservationEntity overdue = persistReservation(offer, buyer, 1,
                ReservationStatus.RESERVED, nowUtc().minusMinutes(1));

        InvalidStateException ex = assertThrows(InvalidStateException.class,
                () -> reservationService.collect(staff.getEmail(), overdue.getPickupCode()));
        assertEquals("RESERVATION_NOT_COLLECTABLE", ex.getCode());
        assertEquals("EXPIRED", ex.getDetails().get("status"));

        assertEquals(2, availability(), "Wygasła rezerwacja zwolniła stan i odbiór go nie zajmuje");
    }

    // ------------------------------------------------------------------
    // Migracja: indeks UNIQUE na pickup_code
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Baza wymusza unikalność kodu odbioru")
    void pickupCodeIsUniqueAtDatabaseLevel() {
        UserModel seller = persistUser("sprzedawca7@example.com");
        OfferEntity offer = persistOffer(seller, 5);
        offerId = offer.getId();
        UserModel buyer = persistUser("kupujacy-g@example.com");

        ReservationEntity first = new ReservationEntity();
        first.setOffer(offer);
        first.setUser(buyer);
        first.setQuantity(1);
        first.setStatus(ReservationStatus.RESERVED);
        first.setPickupCode("DUP234");
        first.setCreatedAt(nowUtc());
        first.setExpiresAt(nowUtc().plusHours(24));
        reservationRepository.saveAndFlush(first);

        ReservationEntity duplicate = new ReservationEntity();
        duplicate.setOffer(offer);
        duplicate.setUser(buyer);
        duplicate.setQuantity(1);
        duplicate.setStatus(ReservationStatus.RESERVED);
        duplicate.setPickupCode("DUP234");
        duplicate.setCreatedAt(nowUtc());
        duplicate.setExpiresAt(nowUtc().plusHours(24));

        assertThrows(DataIntegrityViolationException.class,
                () -> reservationRepository.saveAndFlush(duplicate),
                "Indeks UNIQUE z migracji 48 musi odrzucić powtórzony kod odbioru");
    }

    // ------------------------------------------------------------------
    // Pomocnicze
    // ------------------------------------------------------------------

    private static LocalDateTime nowUtc() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    private int availability() {
        OfferEntity offer = offerRepository.findById(offerId).orElseThrow();
        return reservationService.availableQuantity(offer, nowUtc());
    }

    private ReservationStatus statusOf(ReservationEntity reservation) {
        return reservationRepository.findById(reservation.getId()).orElseThrow().getStatus();
    }

    private List<UserModel> persistBuyers(int count) {
        List<UserModel> buyers = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            buyers.add(persistUser("kupujacy" + i + "@example.com"));
        }
        return buyers;
    }

    private BusinessUserModel persistCompany(String email, String companyName) {
        BusinessUserModel company = new BusinessUserModel();
        applyCommonUserFields(company, email);
        company.setType(UserType.COMPANY);
        company.setCompanyName(companyName);
        return businessUserRepository.saveAndFlush(company);
    }

    private StoreEmployeeModel persistStoreEmployee(String email, BusinessUserModel store) {
        StoreEmployeeModel employee = new StoreEmployeeModel();
        applyCommonUserFields(employee, email);
        employee.setType(UserType.STORE_EMPLOYEE);
        employee.setStore(store);
        return storeEmployeeRepository.saveAndFlush(employee);
    }

    private void applyCommonUserFields(UserModel user, String email) {
        user.setFirstName("Jan");
        user.setLastName("Testowy");
        user.setEmail(email);
        user.setPassword("{noop}nieistotne");
        user.setVerified(true);
        user.setBanned(false);
        // Kolumny NOT NULL z migracji 07 — Hibernate wysyła jawny null, więc DEFAULT nie zadziała
        user.setLang("pl");
        user.setCurrency("PLN");
        user.setLat(new BigDecimal("50.064700"));
        user.setLon(new BigDecimal("19.945000"));
        user.setCreateDate(nowUtc());
    }

    private UserModel persistUser(String email) {
        UserModel user = new UserModel();
        applyCommonUserFields(user, email);
        user.setType(UserType.REGULAR);
        return userRepository.saveAndFlush(user);
    }

    private OfferEntity persistOffer(UserModel seller, int quantity) {
        OfferEntity offer = new OfferEntity();
        offer.setName("Chleb wczorajszy");
        offer.setDescription("Testowa oferta");
        offer.setTransactionType(TransactionType.free);
        offer.setExpiryDate(LocalDate.now().plusDays(3));
        offer.setLatitude(new BigDecimal("50.064700"));
        offer.setLongitude(new BigDecimal("19.945000"));
        offer.setLocation("Kraków");
        offer.setStatus(OfferStatus.ACTIVE);
        offer.setQuantity(quantity);
        offer.setUser(seller);
        return offerRepository.saveAndFlush(offer);
    }

    private ReservationEntity persistReservation(OfferEntity offer, UserModel user, int quantity,
                                                ReservationStatus status, LocalDateTime expiresAt) {
        ReservationEntity reservation = new ReservationEntity();
        reservation.setOffer(offer);
        reservation.setUser(user);
        reservation.setQuantity(quantity);
        reservation.setStatus(status);
        reservation.setPickupCode(new PickupCodeGenerator().generate());
        reservation.setCreatedAt(nowUtc().minusHours(25));
        reservation.setExpiresAt(expiresAt);
        return reservationRepository.saveAndFlush(reservation);
    }
}
