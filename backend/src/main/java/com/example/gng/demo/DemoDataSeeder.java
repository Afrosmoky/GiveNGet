package com.example.gng.demo;

import com.example.gng.chat.entity.ChatEntity;
import com.example.gng.chat.entity.ChatParticipantEntity;
import com.example.gng.chat.entity.MessageEntity;
import com.example.gng.chat.enums.MessageType;
import com.example.gng.complaint.entity.ComplaintEntity;
import com.example.gng.demo.DemoCatalog.AccountSpec;
import com.example.gng.demo.DemoCatalog.ChatSpec;
import com.example.gng.demo.DemoCatalog.ComplaintSpec;
import com.example.gng.demo.DemoCatalog.FavoriteSpec;
import com.example.gng.demo.DemoCatalog.HistoricalTemplate;
import com.example.gng.demo.DemoCatalog.MessageSpec;
import com.example.gng.demo.DemoCatalog.OfferSpec;
import com.example.gng.demo.DemoCatalog.RateSpec;
import com.example.gng.favorites.entity.FavoriteOfferEntity;
import com.example.gng.image.model.ImageEntity;
import com.example.gng.offer.entity.CategoryEntity;
import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.entity.OfferImagesEntity;
import com.example.gng.offer.entity.OfferStatus;
import com.example.gng.offer.entity.SubcategoryEntity;
import com.example.gng.offer.entity.TransactionType;
import com.example.gng.rates.model.UserRateEntity;
import com.example.gng.register.company.model.BusinessUserModel;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.reservation.entity.ReservationEntity;
import com.example.gng.reservation.entity.ReservationStatus;
import com.example.gng.reservation.service.PickupCodeGenerator;
import com.example.gng.statistics.entity.MessageStatisticsEntity;
import com.example.gng.statistics.entity.OfferStatisticsEntity;
import com.example.gng.store.entity.StoreEmployeeModel;
import com.example.gng.user.register.model.RegularUserModel;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.UUID;

/**
 * Dane demonstracyjne dla instancji pokazowej (rekrutacja, prezentacje).
 *
 * <p>Włączany wyłącznie jawnie: {@code DEMO_SEED_ENABLED=true} + {@code DEMO_SEED_PASSWORD}.
 * Bez tej flagi bean w ogóle nie powstaje, więc na produkcji nie ma czego przypadkiem odpalić.
 *
 * <p>Co robi:
 * <ol>
 *   <li><b>Seed</b> (raz) — konta do logowania i tło marketplace'u, aktualne oferty, ~3 miesiące
 *       historii zamkniętych ofert z odebranymi rezerwacjami (z tego żyje raport oszczędności),
 *       aktywne rezerwacje do potwierdzenia przy kasie, statystyki wyświetleń, oceny, ulubione,
 *       rozmowy. Rozpoznaje „już zrobione" po istnieniu konta {@code demo.sklep@example.com}.</li>
 *   <li><b>Odświeżanie</b> (przy starcie i co godzinę) — przesuwa całe demo w czasie o pełne doby,
 *       które minęły od poprzedniego przesunięcia, żeby po miesiącu oferty nie były przeterminowane,
 *       a raport nie był pusty „w tym tygodniu". Raz na dobę przywraca też konta do logowania
 *       (hasło, odblokowanie, anulowane usunięcie) — ktoś z rekruterów mógł je zmienić.
 *       Klientowi demo zawsze zostają co najmniej dwie aktywne rezerwacje, żeby pracownik sklepu
 *       miał co potwierdzić.</li>
 * </ol>
 *
 * <p>Zapisujemy bezpośrednio przez JPA, z pominięciem serwisów: serwisy wysyłają maile i pushe,
 * pilnują limitów (np. aktywnych rezerwacji) i nie pozwalają tworzyć rekordów „wstecz", a tu
 * potrzebujemy dokładnie tego. Reguły domenowe, które mają znaczenie dla spójności (dozwolone
 * typy transakcji kategorii, dostępność sztuk, unikalność kodu odbioru), sprawdzamy tutaj sami.
 */
@Component
@ConditionalOnProperty(name = "demo.seed.enabled", havingValue = "true")
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final String CURRENCY = "PLN";
    private static final String LANG = "pl";

    /** Stałe ziarno — ten sam zbiór danych przy każdym seedzie, łatwiej opisać demo. */
    private static final long RANDOM_SEED = 20261123L;

    private static final int HISTORY_DAYS = 90;
    private static final int HISTORY_SKLEP_OFFERS = 40;
    private static final int HISTORY_OTHER_OFFERS = 15;
    private static final int ACTIVE_RESERVATIONS_FOR_CUSTOMER = 2;
    private static final int RESTOCK_BELOW = 2;
    private static final int RESTOCK_BY = 5;
    private static final int FLUSH_EVERY = 500;

    private static final List<String> IMAGE_SUFFIXES = List.of("", "-2", "-3");
    private static final List<String> IMAGE_EXTENSIONS = List.of("jpg", "jpeg", "png", "webp");

    @PersistenceContext
    private EntityManager em;

    private final PasswordEncoder passwordEncoder;
    private final TransactionTemplate tx;
    private final PickupCodeGenerator pickupCodeGenerator;
    private final ResourceLoader resourceLoader;
    private final String demoPassword;
    private final String termsVersion;
    private final long holdTtlHours;
    private final Path imagesLocation;

    public DemoDataSeeder(PasswordEncoder passwordEncoder,
                          PlatformTransactionManager transactionManager,
                          PickupCodeGenerator pickupCodeGenerator,
                          ResourceLoader resourceLoader,
                          @Value("${demo.seed.password:}") String demoPassword,
                          @Value("${terms.current-version:1.0}") String termsVersion,
                          @Value("${reservation.hold-ttl-hours:24}") long holdTtlHours,
                          @Value("${file.storage.images.path}") String imagesPath) {
        this.passwordEncoder = passwordEncoder;
        this.tx = new TransactionTemplate(transactionManager);
        this.pickupCodeGenerator = pickupCodeGenerator;
        this.resourceLoader = resourceLoader;
        this.demoPassword = demoPassword;
        this.termsVersion = termsVersion;
        this.holdTtlHours = holdTtlHours;
        this.imagesLocation = Paths.get(imagesPath);
    }

    // ==================================================================
    // Punkty wejścia
    // ==================================================================

    @Override
    public void run(ApplicationArguments args) {
        // Spójnie z StartupConfigurationCheck: lepiej nie wstać, niż wystawić publiczne demo
        // z pustym albo trywialnym hasłem do kont firmowych.
        if (demoPassword == null || demoPassword.isBlank() || demoPassword.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalStateException(
                    "DEMO_SEED_ENABLED=true wymaga DEMO_SEED_PASSWORD (min. " + MIN_PASSWORD_LENGTH + " znaków).");
        }

        Boolean created = tx.execute(status -> seedIfMissing());
        refresh(true);
        logSummary(Boolean.TRUE.equals(created));
    }

    /** Co godzinę: przesunięcie w czasie (gdy minęła pełna doba) + aktywne rezerwacje klienta. */
    @Scheduled(cron = "${demo.seed.refresh-cron:0 15 * * * *}")
    public void scheduledRefresh() {
        try {
            refresh(false);
        } catch (RuntimeException e) {
            // Demo nie może położyć aplikacji w środku dnia — logujemy i próbujemy za godzinę
            log.error("Odświeżenie danych demo nie powiodło się: {}", e.getMessage(), e);
        }
    }

    // ==================================================================
    // Seed
    // ==================================================================

    private boolean seedIfMissing() {
        if (findUser(DemoCatalog.MARKER_ACCOUNT).isPresent()) {
            if (readAnchor().isEmpty()) {
                writeAnchor(nowUtc(), true);
            }
            log.info("Dane demo już istnieją — pomijam seed, wykonam tylko odświeżenie.");
            return false;
        }

        log.info("Tworzę dane demo…");
        LocalDateTime now = nowUtc();
        Random rnd = new Random(RANDOM_SEED);
        Set<String> usedCodes = new HashSet<>();

        Map<String, UserModel> users = createAccounts(now);
        Map<String, OfferEntity> offers = createCurrentOffers(users, now, rnd);
        createHistory(users, now, rnd, usedCodes);
        createCurrentReservations(users, offers, now, usedCodes);
        createCurrentOfferStatistics(users, offers, now, rnd);
        createRates(users, now);
        createFavorites(users, offers, now);
        createChats(users, now);
        createComplaints(users, offers, now);

        writeAnchor(now, true);
        return true;
    }

    // ------------------------------------------------------------------
    // Konta
    // ------------------------------------------------------------------

    private Map<String, UserModel> createAccounts(LocalDateTime now) {
        Map<String, UserModel> users = new LinkedHashMap<>();
        // Kolejność w katalogu gwarantuje, że sklep powstaje przed swoimi pracownikami
        for (AccountSpec spec : DemoCatalog.ACCOUNTS) {
            users.put(spec.key(), createAccount(spec, users, now));
        }
        em.flush();
        return users;
    }

    private UserModel createAccount(AccountSpec spec, Map<String, UserModel> existing, LocalDateTime now) {
        UserModel user = switch (spec.type()) {
            case COMPANY -> {
                BusinessUserModel company = new BusinessUserModel();
                company.setCompanyName(spec.companyName());
                yield company;
            }
            case STORE_EMPLOYEE -> {
                StoreEmployeeModel employee = new StoreEmployeeModel();
                UserModel store = existing.get(spec.storeKey());
                if (!(store instanceof BusinessUserModel business)) {
                    throw new IllegalStateException("Pracownik demo " + spec.key()
                            + " wskazuje sklep '" + spec.storeKey() + "', którego nie ma.");
                }
                employee.setStore(business);
                employee.setActive(spec.active());
                yield employee;
            }
            // REGULAR, a także EMPLOYEE/ADMIN — w aplikacji moderatorem zostaje zwykłe konto,
            // któremu administrator zmienia typ, więc tu też nie ma osobnej encji
            default -> {
                RegularUserModel regular = new RegularUserModel();
                regular.setDateOfBirth(spec.dateOfBirth());
                yield regular;
            }
        };

        LocalDateTime createdAt = now.minusDays(spec.createdDaysAgo());
        user.setType(spec.type());
        user.setFirstName(spec.firstName());
        user.setLastName(spec.lastName());
        user.setEmail(DemoCatalog.email(spec.key()));
        user.setPhoneNumber(spec.phone());
        // Konta tła dostają losowe hasło, którego nikt nie zna — mają tylko „zaludniać" serwis
        user.setPassword(passwordEncoder.encode(spec.login() ? demoPassword : UUID.randomUUID().toString()));
        user.setAddress("Warszawa, " + spec.district());
        user.setLat(BigDecimal.valueOf(spec.lat()));
        user.setLon(BigDecimal.valueOf(spec.lon()));
        user.setVerified(true);
        user.setBanned(false);
        user.setLang(LANG);
        user.setCurrency(CURRENCY);
        user.setBio(spec.bio());
        user.setCreateDate(createdAt);
        user.setTrustPoints(spec.trustPoints());
        user.setUserRank(spec.rank());
        user.setTermsAcceptedVersion(termsVersion);
        user.setTermsAcceptedAt(createdAt);
        user.setPrivacyAcceptedAt(createdAt);
        em.persist(user);
        return user;
    }

    // ------------------------------------------------------------------
    // Oferty aktualne
    // ------------------------------------------------------------------

    private Map<String, OfferEntity> createCurrentOffers(Map<String, UserModel> users, LocalDateTime now, Random rnd) {
        Map<String, OfferEntity> offers = new LinkedHashMap<>();
        LocalDate today = now.toLocalDate();
        for (OfferSpec spec : DemoCatalog.OFFERS) {
            UserModel owner = requireUser(users, spec.ownerKey());
            // Oferta z długim terminem „wisi" od kilku dni, krótka pojawiła się kilka godzin temu
            // (wcześniej niż najstarsza rezerwacja na niej, patrz createCurrentReservations)
            LocalDateTime createdAt = spec.expiresInDays() >= 7
                    ? now.minusDays(3 + rnd.nextInt(10)).minusHours(rnd.nextInt(8))
                    : now.minusHours(6 + rnd.nextInt(8)).minusMinutes(rnd.nextInt(60));

            OfferEntity offer = newOffer(owner, spec.name(), spec.description(),
                    spec.category(), spec.subcategory(), spec.type(),
                    spec.price(), spec.originalPrice(), spec.quantity(),
                    today.plusDays(spec.expiresInDays()), spec.pickupFrom(), spec.pickupTo(), createdAt);
            offer.setRecommended(spec.recommended());
            offer.setStatus(OfferStatus.ACTIVE);
            em.persist(offer);
            attachImages(spec.key(), offer);
            offers.put(spec.key(), offer);
        }
        em.flush();
        return offers;
    }

    private OfferEntity newOffer(UserModel owner, String name, String description,
                                 String categoryName, String subcategoryName, TransactionType type,
                                 String price, String originalPrice, int quantity, LocalDate expiryDate,
                                 String pickupFrom, String pickupTo, LocalDateTime createdAt) {
        CategoryEntity category = requireCategory(categoryName);
        SubcategoryEntity subcategory = requireSubcategory(category, subcategoryName);
        requireAllowed(type, category.getAllowedTransactionTypes(), categoryName);
        requireAllowed(type, subcategory.getAllowedTransactionTypes(), subcategoryName);

        OfferEntity offer = new OfferEntity();
        offer.setName(name);
        offer.setDescription(description);
        offer.setTransactionType(type);
        offer.setCategory(category);
        offer.setSubcategory(subcategory);
        offer.setUser(owner);
        offer.setQuantity(quantity);
        offer.setExpiryDate(expiryDate);
        offer.setPickupDateFrom(pickupFrom);
        offer.setPickupDateTo(pickupTo);
        offer.setLatitude(owner.getLat());
        offer.setLongitude(owner.getLon());
        offer.setLocation(owner.getAddress());
        offer.setCreatedAt(createdAt);
        offer.setUpdatedAt(createdAt);
        offer.setRecommended(false);
        // Jak OfferService: cena tylko przy sprzedaży, poza nią brak ceny i waluty
        if (type == TransactionType.sale) {
            offer.setPrice(new BigDecimal(price));
            offer.setOriginalPrice(originalPrice != null ? new BigDecimal(originalPrice) : null);
            offer.setCurrency(CURRENCY);
        }
        return offer;
    }

    /**
     * Zdjęcia są opcjonalne: {@code src/main/resources/demo/images/<klucz-oferty>[-2|-3].<jpg|png|webp>}.
     * Bez nich frontend pokaże zastępczą grafikę — dlatego brak pliku to nie błąd.
     */
    private void attachImages(String offerKey, OfferEntity offer) {
        for (String suffix : IMAGE_SUFFIXES) {
            for (String ext : IMAGE_EXTENSIONS) {
                Resource resource = resourceLoader.getResource("classpath:demo/images/" + offerKey + suffix + "." + ext);
                if (!resource.exists()) {
                    continue;
                }
                try {
                    String fileName = "demo_" + offerKey + suffix + "." + ext;
                    Path directory = imagesLocation.resolve("offer").resolve(offer.getId());
                    Files.createDirectories(directory);
                    try (InputStream in = resource.getInputStream()) {
                        Files.copy(in, directory.resolve(fileName), StandardCopyOption.REPLACE_EXISTING);
                    }

                    ImageEntity image = new ImageEntity();
                    image.setFileName(fileName);
                    image.setTypMime(ext.equals("jpg") ? "image/jpeg" : "image/" + ext);
                    image.setAdded(offer.getCreatedAt());
                    image.setFilePath("images/offer/" + offer.getId() + "/" + fileName);
                    em.persist(image);

                    OfferImagesEntity link = new OfferImagesEntity();
                    link.setOffer(offer);
                    link.setImage(image);
                    em.persist(link);
                    if (offer.getImages() == null) {
                        offer.setImages(new ArrayList<>());
                    }
                    offer.getImages().add(link);
                } catch (IOException e) {
                    log.warn("Nie udało się skopiować zdjęcia demo {}{}.{}: {}", offerKey, suffix, ext, e.getMessage());
                }
                break; // jedno rozszerzenie na pozycję wystarczy
            }
        }
    }

    // ------------------------------------------------------------------
    // Historia: zamknięte oferty + odebrane rezerwacje (źródło raportu)
    // ------------------------------------------------------------------

    private void createHistory(Map<String, UserModel> users, LocalDateTime now, Random rnd, Set<String> usedCodes) {
        // Klient demo trzy razy w puli — jego historia ma być wyraźnie widoczna
        List<UserModel> customers = List.of(
                requireUser(users, "klient"), requireUser(users, "klient"), requireUser(users, "klient"),
                requireUser(users, "kasia"), requireUser(users, "pawel"),
                requireUser(users, "ewa"), requireUser(users, "michal"));

        int reservations = 0;
        reservations += createHistoryFor(requireUser(users, "sklep"), DemoCatalog.HISTORY_SKLEP,
                HISTORY_SKLEP_OFFERS, customers, now, rnd, usedCodes);
        reservations += createHistoryFor(requireUser(users, "piekarnia"), DemoCatalog.HISTORY_PIEKARNIA,
                HISTORY_OTHER_OFFERS, customers, now, rnd, usedCodes);
        reservations += createHistoryFor(requireUser(users, "bistro"), DemoCatalog.HISTORY_BISTRO,
                HISTORY_OTHER_OFFERS, customers, now, rnd, usedCodes);
        em.flush();
        log.info("Historia demo: {} rezerwacji.", reservations);
    }

    private int createHistoryFor(UserModel store, List<HistoricalTemplate> templates, int count,
                                 List<UserModel> customers, LocalDateTime now, Random rnd, Set<String> usedCodes) {
        int created = 0;
        for (int i = 0; i < count; i++) {
            // Od 2 dni wstecz: termin = dzień wystawienia + 1, więc zawsze już minął
            int daysAgo = 2 + rnd.nextInt(HISTORY_DAYS - 2);
            HistoricalTemplate t = templates.get(rnd.nextInt(templates.size()));
            LocalDateTime offerCreated = now.minusDays(daysAgo)
                    .withHour(13 + rnd.nextInt(3)).withMinute(rnd.nextInt(60)).withSecond(0).withNano(0);
            int quantity = 2 + rnd.nextInt(5);

            OfferEntity offer = newOffer(store, t.name(), t.description(), t.category(), t.subcategory(),
                    TransactionType.sale, t.price(), t.originalPrice(), quantity,
                    offerCreated.toLocalDate().plusDays(1), "16:00", "20:00", offerCreated);
            offer.setStatus(OfferStatus.INACTIVE);
            offer.setUpdatedAt(offerCreated.plusDays(1));
            em.persist(offer);

            int remaining = quantity;
            int collectedCount = 1 + rnd.nextInt(3);
            for (int j = 0; j < collectedCount && remaining > 0; j++) {
                int qty = Math.min(remaining, 1 + rnd.nextInt(2));
                remaining -= qty;
                LocalDateTime reservedAt = offerCreated.plusMinutes(20 + rnd.nextInt(240));
                ReservationEntity r = newReservation(offer, pick(customers, rnd), qty, reservedAt, usedCodes);
                r.setStatus(ReservationStatus.COLLECTED);
                r.setCollectedAt(reservedAt.plusMinutes(60 + rnd.nextInt(17 * 60)));
                em.persist(r);
                created++;
            }
            // Trochę „szumu": przepadłe i anulowane rezerwacje, które raport ma pomijać
            if (remaining > 0 && rnd.nextInt(100) < 20) {
                LocalDateTime reservedAt = offerCreated.plusMinutes(30 + rnd.nextInt(180));
                ReservationEntity r = newReservation(offer, pick(customers, rnd), 1, reservedAt, usedCodes);
                r.setStatus(ReservationStatus.EXPIRED);
                em.persist(r);
                created++;
            }
            if (rnd.nextInt(100) < 12) {
                LocalDateTime reservedAt = offerCreated.plusMinutes(30 + rnd.nextInt(180));
                ReservationEntity r = newReservation(offer, pick(customers, rnd), 1, reservedAt, usedCodes);
                r.setStatus(ReservationStatus.CANCELLED);
                r.setCancelledAt(reservedAt.plusMinutes(15 + rnd.nextInt(120)));
                em.persist(r);
                created++;
            }

            // Kilka wyświetleń z dnia, kiedy oferta wisiała
            int views = 5 + rnd.nextInt(26);
            for (int v = 0; v < views; v++) {
                persistStat(offer, rnd.nextBoolean() ? null : pick(customers, rnd),
                        OfferStatisticsEntity.EventType.VIEW, offerCreated.plusMinutes(rnd.nextInt(24 * 60)));
            }
        }
        return created;
    }

    // ------------------------------------------------------------------
    // Rezerwacje na aktualnych ofertach
    // ------------------------------------------------------------------

    private void createCurrentReservations(Map<String, UserModel> users, Map<String, OfferEntity> offers,
                                           LocalDateTime now, Set<String> usedCodes) {
        // Aktywne — do potwierdzenia przez pracownika sklepu
        reserve(offers, users, "zk-paczka", "klient", 1, now.minusMinutes(130), usedCodes);
        reserve(offers, users, "zk-jogurt", "klient", 2, now.minusMinutes(40), usedCodes);
        reserve(offers, users, "zk-pomidory", "kasia", 2, now.minusMinutes(95), usedCodes);
        reserve(offers, users, "zk-chleb", "pawel", 1, now.minusMinutes(25), usedCodes);
        reserve(offers, users, "pk-drozdzowki", "michal", 1, now.minusMinutes(70), usedCodes);
        reserve(offers, users, "bi-pierogi", "ewa", 1, now.minusMinutes(50), usedCodes);

        // Odebrane dziś — raport „dzisiaj" nie jest pusty
        ReservationEntity collected1 = reserve(offers, users, "zk-banany", "michal", 2, now.minusMinutes(300), usedCodes);
        collected1.setStatus(ReservationStatus.COLLECTED);
        collected1.setCollectedAt(now.minusMinutes(60));
        ReservationEntity collected2 = reserve(offers, users, "zk-paczka", "ewa", 1, now.minusMinutes(240), usedCodes);
        collected2.setStatus(ReservationStatus.COLLECTED);
        collected2.setCollectedAt(now.minusMinutes(30));

        // Anulowana i przepadła — żeby lista „moje rezerwacje" pokazywała wszystkie stany
        ReservationEntity cancelled = reserve(offers, users, "zk-salata", "klient", 1, now.minusMinutes(200), usedCodes);
        cancelled.setStatus(ReservationStatus.CANCELLED);
        cancelled.setCancelledAt(now.minusMinutes(180));
        ReservationEntity expired = reserve(offers, users, "pr-jablka", "klient", 1,
                now.minusHours(holdTtlHours + 6), usedCodes);
        expired.setStatus(ReservationStatus.EXPIRED);
        em.flush();
    }

    private ReservationEntity reserve(Map<String, OfferEntity> offers, Map<String, UserModel> users,
                                      String offerKey, String userKey, int quantity,
                                      LocalDateTime reservedAt, Set<String> usedCodes) {
        OfferEntity offer = offers.get(offerKey);
        if (offer == null) {
            throw new IllegalStateException("Rezerwacja demo wskazuje nieistniejącą ofertę: " + offerKey);
        }
        ReservationEntity r = newReservation(offer, requireUser(users, userKey), quantity, reservedAt, usedCodes);
        em.persist(r);
        return r;
    }

    private ReservationEntity newReservation(OfferEntity offer, UserModel user, int quantity,
                                             LocalDateTime reservedAt, Set<String> usedCodes) {
        ReservationEntity r = new ReservationEntity();
        r.setOffer(offer);
        r.setUser(user);
        r.setQuantity(quantity);
        r.setStatus(ReservationStatus.RESERVED);
        r.setPickupCode(uniquePickupCode(usedCodes));
        r.setCreatedAt(reservedAt);
        r.setExpiresAt(reservedAt.plusHours(holdTtlHours));
        return r;
    }

    private String uniquePickupCode(Set<String> usedCodes) {
        for (int attempt = 0; attempt < 20; attempt++) {
            String code = pickupCodeGenerator.generate();
            if (usedCodes.add(code) && !pickupCodeExists(code)) {
                return code;
            }
        }
        throw new IllegalStateException("Nie udało się wylosować unikalnego kodu odbioru.");
    }

    private boolean pickupCodeExists(String code) {
        Long count = em.createQuery(
                        "SELECT COUNT(r) FROM ReservationEntity r WHERE r.pickupCode = :code", Long.class)
                .setParameter("code", code)
                .getSingleResult();
        return count > 0;
    }

    // ------------------------------------------------------------------
    // Statystyki, oceny, ulubione, rozmowy
    // ------------------------------------------------------------------

    private void createCurrentOfferStatistics(Map<String, UserModel> users, Map<String, OfferEntity> offers,
                                              LocalDateTime now, Random rnd) {
        List<UserModel> viewers = users.values().stream()
                .filter(u -> u.getType() == UserType.REGULAR)
                .toList();
        int events = 0;
        for (OfferEntity offer : offers.values()) {
            long minutesLive = Math.max(30, ChronoUnit.MINUTES.between(offer.getCreatedAt(), now));
            boolean longLived = minutesLive > 24 * 60;
            int views = longLived ? 30 + rnd.nextInt(90) : 8 + rnd.nextInt(35);
            for (int v = 0; v < views; v++) {
                UserModel viewer = rnd.nextBoolean() ? null : pick(viewers, rnd);
                LocalDateTime at = offer.getCreatedAt().plusMinutes((long) (rnd.nextDouble() * minutesLive));
                persistStat(offer, viewer, OfferStatisticsEntity.EventType.VIEW, at);
                events++;
                if (rnd.nextInt(100) < 35) {
                    persistStat(offer, viewer, OfferStatisticsEntity.EventType.CLICK, at.plusSeconds(5 + rnd.nextInt(40)));
                    events++;
                }
                if (rnd.nextInt(100) < 10) {
                    persistStat(offer, viewer, OfferStatisticsEntity.EventType.PROFILE_VIEW, at.plusSeconds(30 + rnd.nextInt(90)));
                    events++;
                }
                if (events % FLUSH_EVERY == 0) {
                    em.flush();
                }
            }
        }
        em.flush();
        log.info("Statystyki demo: {} zdarzeń.", events);
    }

    private void persistStat(OfferEntity offer, UserModel user, OfferStatisticsEntity.EventType type, LocalDateTime at) {
        OfferStatisticsEntity stat = new OfferStatisticsEntity();
        stat.setOffer(offer);
        stat.setUser(user);
        stat.setEventType(type);
        stat.setCreatedAt(at);
        em.persist(stat);
    }

    private void createRates(Map<String, UserModel> users, LocalDateTime now) {
        for (RateSpec spec : DemoCatalog.RATES) {
            UserRateEntity rate = new UserRateEntity();
            rate.setUser(requireUser(users, spec.ratedKey()));
            rate.setCleanliness(spec.cleanliness());
            rate.setQuality(spec.quality());
            rate.setTransactionRating(spec.transaction());
            rate.setComment(spec.comment());
            rate.setCreatedAt(now.minusDays(spec.daysAgo()));
            em.persist(rate);
        }
    }

    private void createFavorites(Map<String, UserModel> users, Map<String, OfferEntity> offers, LocalDateTime now) {
        int i = 0;
        for (FavoriteSpec spec : DemoCatalog.FAVORITES) {
            OfferEntity offer = offers.get(spec.offerKey());
            if (offer == null) {
                throw new IllegalStateException("Ulubiona oferta demo nie istnieje: " + spec.offerKey());
            }
            FavoriteOfferEntity favorite = new FavoriteOfferEntity();
            favorite.setUser(requireUser(users, spec.userKey()));
            favorite.setOffer(offer);
            // Nie wcześniej niż sama oferta
            LocalDateTime at = now.minusMinutes(30L + 17L * i++);
            favorite.setCreatedAt(at.isBefore(offer.getCreatedAt()) ? offer.getCreatedAt().plusMinutes(5) : at);
            em.persist(favorite);
        }
    }

    private void createChats(Map<String, UserModel> users, LocalDateTime now) {
        for (ChatSpec spec : DemoCatalog.CHATS) {
            UserModel first = requireUser(users, spec.firstKey());
            UserModel second = requireUser(users, spec.secondKey());
            List<MessageSpec> messages = spec.messages();
            LocalDateTime startedAt = now.minusMinutes(messages.get(0).minutesAgo());

            ChatEntity chat = new ChatEntity();
            chat.setCreatedAt(startedAt);
            em.persist(chat);

            Map<String, ChatParticipantEntity> participants = new HashMap<>();
            for (UserModel user : List.of(first, second)) {
                ChatParticipantEntity p = new ChatParticipantEntity();
                p.setChat(chat);
                p.setUser(user);
                p.setJoinedAt(startedAt);
                em.persist(p);
                participants.put(user.getEmail(), p);
            }

            MessageEntity last = null;
            Map<String, Long> lastReadBy = new HashMap<>();
            for (MessageSpec m : messages) {
                UserModel sender = requireUser(users, m.senderKey());
                UserModel recipient = sender == first ? second : first;
                LocalDateTime at = now.minusMinutes(m.minutesAgo());

                MessageEntity message = new MessageEntity();
                message.setChat(chat);
                message.setSender(sender);
                message.setContent(m.content());
                message.setTimestamp(at);
                message.setMessageType(MessageType.TEXT);
                em.persist(message); // IDENTITY — id jest od razu

                MessageStatisticsEntity stat = new MessageStatisticsEntity();
                stat.setSender(sender);
                stat.setRecipient(recipient);
                stat.setChat(chat);
                stat.setCreatedAt(at);
                em.persist(stat);

                // Nadawca „przeczytał" własną wiadomość; ostatnia zostaje nieprzeczytana dla odbiorcy
                lastReadBy.put(sender.getEmail(), message.getId());
                last = message;
            }
            lastReadBy.forEach((email, messageId) -> participants.get(email).setLastReadMessageId(messageId));

            chat.setLastMessagePreview(preview(last.getContent()));
            chat.setLastMessageTimestamp(last.getTimestamp());
        }
        em.flush();
    }

    private void createComplaints(Map<String, UserModel> users, Map<String, OfferEntity> offers, LocalDateTime now) {
        for (ComplaintSpec spec : DemoCatalog.COMPLAINTS) {
            OfferEntity offer = offers.get(spec.offerKey());
            if (offer == null) {
                throw new IllegalStateException("Zgłoszenie demo wskazuje nieistniejącą ofertę: " + spec.offerKey());
            }
            ComplaintEntity complaint = new ComplaintEntity();
            complaint.setReporter(requireUser(users, spec.reporterKey()));
            complaint.setReportedUser(offer.getUser());
            complaint.setOfferEntity(offer);
            complaint.setExplanation(spec.explanation());
            LocalDateTime at = now.minusHours(spec.hoursAgo());
            complaint.setCreatedAt(at.isBefore(offer.getCreatedAt()) ? offer.getCreatedAt().plusMinutes(30) : at);
            complaint.setResolved(spec.resolved());
            em.persist(complaint);
        }
    }

    private static String preview(String content) {
        return content.length() <= 100 ? content : content.substring(0, 97) + "…";
    }

    // ==================================================================
    // Odświeżanie
    // ==================================================================

    private void refresh(boolean startup) {
        tx.executeWithoutResult(status -> {
            LocalDateTime now = nowUtc();
            long shiftedDays = shiftInTime(now);
            if (startup || shiftedDays > 0) {
                restoreLoginAccounts(now);
                restock(now);
            }
            ensureCustomerReservations(now);
        });
    }

    /**
     * Przesuwa demo o pełne doby, które minęły od kotwicy.
     *
     * <p>Przesuwamy tylko rekordy sprzed kotwicy: po przesunięciu o {@code d} dni lądują przed
     * {@code kotwica + d} ≤ teraz, więc nic nie trafia w przyszłość. Rekordy dopisane później
     * (np. rezerwacja zrobiona przez rekrutera) przesuną się dopiero przy następnej dobie.
     * Kotwica idzie do przodu dokładnie o {@code d} dni, nie do „teraz", żeby nie gubić reszty doby.
     *
     * @return o ile dni przesunięto (0 = jeszcze nie minęła pełna doba)
     */
    private long shiftInTime(LocalDateTime now) {
        Optional<LocalDateTime> anchorOpt = readAnchor();
        if (anchorOpt.isEmpty()) {
            writeAnchor(now, true);
            return 0;
        }
        LocalDateTime anchor = anchorOpt.get();
        long days = ChronoUnit.DAYS.between(anchor, now);
        if (days <= 0) {
            return 0;
        }
        List<Long> ids = demoUserIds();
        if (ids.isEmpty()) {
            writeAnchor(anchor.plusDays(days), false);
            return 0;
        }

        Map<String, Object> p = new HashMap<>();
        p.put("ids", ids);
        p.put("d", days);
        p.put("anchor", anchor);
        p.put("now", now);

        String demoOffers = "SELECT o.id FROM offer o WHERE o.user_id IN (:ids)";
        String demoChats = "SELECT cp.chat_id FROM chat_participants cp WHERE cp.user_id IN (:ids)";

        // Rezerwacje przed ofertami: warunek po offer.user_id, nie po datach oferty.
        // RESERVED pomijamy — trwający hold ma swój termin, który pilnuje scheduler rezerwacji.
        int reservations = exec("""
                UPDATE reservation SET
                    created_at = DATE_ADD(created_at, INTERVAL :d DAY),
                    expires_at = DATE_ADD(expires_at, INTERVAL :d DAY),
                    collected_at = LEAST(DATE_ADD(collected_at, INTERVAL :d DAY), :now),
                    cancelled_at = LEAST(DATE_ADD(cancelled_at, INTERVAL :d DAY), :now),
                    expiry_warning_sent_at = LEAST(DATE_ADD(expiry_warning_sent_at, INTERVAL :d DAY), :now),
                    pickup_reminder_sent_at = LEAST(DATE_ADD(pickup_reminder_sent_at, INTERVAL :d DAY), :now)
                WHERE created_at < :anchor
                  AND status <> 'RESERVED'
                  AND (user_id IN (:ids) OR offer_id IN (SELECT x.id FROM (%s) x))
                """.formatted(demoOffers), p);
        int offers = exec("""
                UPDATE offer SET
                    expiry_date = DATE_ADD(expiry_date, INTERVAL :d DAY),
                    created_at = DATE_ADD(created_at, INTERVAL :d DAY),
                    updated_at = LEAST(DATE_ADD(updated_at, INTERVAL :d DAY), :now)
                WHERE user_id IN (:ids) AND created_at < :anchor
                """, p);
        exec("""
                UPDATE offer_statistics SET created_at = DATE_ADD(created_at, INTERVAL :d DAY)
                WHERE created_at < :anchor AND offer_id IN (%s)
                """.formatted(demoOffers), p);
        exec("""
                UPDATE complaints SET created_at = DATE_ADD(created_at, INTERVAL :d DAY)
                WHERE created_at < :anchor AND (reporter_id IN (:ids) OR reported_user_id IN (:ids))
                """, p);
        exec("""
                UPDATE user_rates SET created_at = DATE_ADD(created_at, INTERVAL :d DAY)
                WHERE created_at < :anchor AND user_id IN (:ids)
                """, p);
        exec("""
                UPDATE favorite_offers SET created_at = DATE_ADD(created_at, INTERVAL :d DAY)
                WHERE created_at < :anchor AND user_id IN (:ids)
                """, p);
        exec("""
                UPDATE messages SET timestamp = DATE_ADD(timestamp, INTERVAL :d DAY)
                WHERE timestamp < :anchor AND chat_id IN (SELECT x.chat_id FROM (%s) x)
                """.formatted(demoChats), p);
        exec("""
                UPDATE message_statistics SET created_at = DATE_ADD(created_at, INTERVAL :d DAY)
                WHERE created_at < :anchor AND (sender_id IN (:ids) OR recipient_id IN (:ids))
                """, p);
        exec("""
                UPDATE chats SET
                    created_at = DATE_ADD(created_at, INTERVAL :d DAY),
                    last_message_timestamp = LEAST(DATE_ADD(last_message_timestamp, INTERVAL :d DAY), :now)
                WHERE created_at < :anchor AND id IN (SELECT x.chat_id FROM (%s) x)
                """.formatted(demoChats), p);
        exec("""
                UPDATE chat_participants SET joined_at = DATE_ADD(joined_at, INTERVAL :d DAY)
                WHERE joined_at < :anchor AND user_id IN (:ids)
                """, p);
        exec("""
                UPDATE users SET
                    create_date = DATE_ADD(create_date, INTERVAL :d DAY),
                    terms_accepted_at = DATE_ADD(terms_accepted_at, INTERVAL :d DAY),
                    privacy_accepted_at = DATE_ADD(privacy_accepted_at, INTERVAL :d DAY)
                WHERE create_date < :anchor AND id IN (:ids)
                """, p);

        // Oferta, którą scheduler zdążył wygasić, a po przesunięciu znów ma termin w przyszłości
        Map<String, Object> reactivate = new HashMap<>();
        reactivate.put("ids", ids);
        reactivate.put("today", now.toLocalDate());
        int reactivated = exec("""
                UPDATE offer SET status = 'ACTIVE'
                WHERE user_id IN (:ids) AND status = 'INACTIVE' AND expiry_date >= :today
                """, reactivate);

        writeAnchor(anchor.plusDays(days), false);
        // Bulk UPDATE omija kontekst persystencji — nie ufamy już niczemu, co w nim siedzi
        em.clear();
        log.info("Demo przesunięte o {} dni: {} ofert, {} rezerwacji, {} reaktywowanych.",
                days, offers, reservations, reactivated);
        return days;
    }

    /** Przywraca konta do logowania do stanu wyjściowego — rekruter mógł zmienić hasło albo je usunąć. */
    private void restoreLoginAccounts(LocalDateTime now) {
        Map<String, UserModel> byKey = new LinkedHashMap<>();
        for (AccountSpec spec : DemoCatalog.ACCOUNTS) {
            Optional<UserModel> found = findUser(spec.key());
            if (found.isPresent()) {
                byKey.put(spec.key(), found.get());
                continue;
            }
            if (!spec.login()) {
                continue;
            }
            // Konto zostało skasowane (np. „usuń konto" + nocny scheduler) — zakładamy je od nowa.
            // Pracownik bez sklepu nie ma sensu, więc w tym jednym przypadku odpuszczamy.
            if (spec.type() == UserType.STORE_EMPLOYEE && !byKey.containsKey(spec.storeKey())) {
                log.warn("Nie odtwarzam konta demo {} — brak sklepu {}.", spec.key(), spec.storeKey());
                continue;
            }
            byKey.put(spec.key(), createAccount(spec, byKey, now));
            log.info("Odtworzono usunięte konto demo {}.", DemoCatalog.email(spec.key()));
        }

        for (AccountSpec spec : DemoCatalog.ACCOUNTS) {
            UserModel user = byKey.get(spec.key());
            if (user == null || !spec.login()) {
                continue;
            }
            if (!passwordEncoder.matches(demoPassword, user.getPassword())) {
                user.setPassword(passwordEncoder.encode(demoPassword));
            }
            user.setType(spec.type()); // admin demo mógł komuś zmienić rolę
            user.setDeleteDate(null);
            user.setVerified(true);
            user.setBanned(false);
            if (user instanceof StoreEmployeeModel employee) {
                employee.setActive(spec.active());
            }
        }
        em.flush();

        List<Long> ids = demoUserIds();
        if (!ids.isEmpty()) {
            exec("DELETE FROM user_bans WHERE user_id IN (:ids)", Map.of("ids", ids));
        }
    }

    /** Dokłada sztuk aktualnym ofertom firm demo, które wyprzedali odwiedzający. */
    private void restock(LocalDateTime now) {
        List<OfferEntity> offers = em.createQuery("""
                        SELECT o FROM OfferEntity o
                        WHERE o.user.email LIKE :prefix AND o.user.type = :company
                          AND o.status = :active AND o.expiryDate >= :today
                        """, OfferEntity.class)
                .setParameter("prefix", DemoCatalog.EMAIL_PREFIX + "%" + DemoCatalog.EMAIL_DOMAIN)
                .setParameter("company", UserType.COMPANY)
                .setParameter("active", OfferStatus.ACTIVE)
                .setParameter("today", now.toLocalDate())
                .getResultList();
        int restocked = 0;
        for (OfferEntity offer : offers) {
            if (available(offer, now) < RESTOCK_BELOW) {
                offer.setQuantity(offer.getQuantity() + RESTOCK_BY);
                restocked++;
            }
        }
        if (restocked > 0) {
            log.info("Demo: uzupełniono stan {} ofert.", restocked);
        }
    }

    /** Klient demo ma zawsze co najmniej dwie aktywne rezerwacje w sklepie demo — jest co potwierdzać. */
    private void ensureCustomerReservations(LocalDateTime now) {
        Optional<UserModel> customer = findUser(DemoCatalog.MAIN_CUSTOMER);
        Optional<UserModel> store = findUser(DemoCatalog.MAIN_STORE);
        if (customer.isEmpty() || store.isEmpty()) {
            return;
        }

        List<ReservationEntity> active = em.createQuery("""
                        SELECT r FROM ReservationEntity r
                        WHERE r.user = :customer AND r.offer.user = :store
                          AND r.status = :reserved AND r.expiresAt > :now
                        """, ReservationEntity.class)
                .setParameter("customer", customer.get())
                .setParameter("store", store.get())
                .setParameter("reserved", ReservationStatus.RESERVED)
                .setParameter("now", now)
                .getResultList();
        int missing = ACTIVE_RESERVATIONS_FOR_CUSTOMER - active.size();
        if (missing <= 0) {
            return;
        }

        Set<String> alreadyReserved = new HashSet<>();
        active.forEach(r -> alreadyReserved.add(r.getOffer().getId()));

        List<OfferEntity> candidates = em.createQuery("""
                        SELECT o FROM OfferEntity o
                        WHERE o.user = :store AND o.status = :active AND o.expiryDate >= :today
                          AND o.transactionType = :sale
                        ORDER BY o.createdAt DESC, o.id
                        """, OfferEntity.class)
                .setParameter("store", store.get())
                .setParameter("active", OfferStatus.ACTIVE)
                .setParameter("today", now.toLocalDate())
                .setParameter("sale", TransactionType.sale)
                .getResultList();

        Set<String> usedCodes = new HashSet<>();
        for (OfferEntity offer : candidates) {
            if (missing == 0) {
                break;
            }
            if (alreadyReserved.contains(offer.getId()) || available(offer, now) < 1) {
                continue;
            }
            ReservationEntity r = newReservation(offer, customer.get(), 1, now.minusMinutes(5), usedCodes);
            em.persist(r);
            missing--;
            log.info("Demo: nowa rezerwacja klienta na „{}”, kod {}.", offer.getName(), r.getPickupCode());
        }
    }

    /** Dostępność jak w ReservationService: ilość minus odebrane i trwające holdy. */
    private long available(OfferEntity offer, LocalDateTime now) {
        Long occupied = em.createQuery("""
                        SELECT SUM(r.quantity) FROM ReservationEntity r
                        WHERE r.offer = :offer
                          AND (r.status = :collected OR (r.status = :reserved AND r.expiresAt > :now))
                        """, Long.class)
                .setParameter("offer", offer)
                .setParameter("collected", ReservationStatus.COLLECTED)
                .setParameter("reserved", ReservationStatus.RESERVED)
                .setParameter("now", now)
                .getSingleResult();
        return offer.getQuantity() - (occupied != null ? occupied : 0L);
    }

    // ==================================================================
    // Kotwica czasu (tabela demo_seed_state, migracja 58)
    // ==================================================================

    private Optional<LocalDateTime> readAnchor() {
        List<?> rows = em.createNativeQuery("SELECT anchor_at FROM demo_seed_state WHERE id = 1")
                .getResultList();
        if (rows.isEmpty() || rows.get(0) == null) {
            return Optional.empty();
        }
        Object value = rows.get(0);
        if (value instanceof Timestamp ts) {
            return Optional.of(ts.toLocalDateTime());
        }
        if (value instanceof LocalDateTime ldt) {
            return Optional.of(ldt);
        }
        throw new IllegalStateException("Nieoczekiwany typ kolumny demo_seed_state.anchor_at: " + value.getClass());
    }

    private void writeAnchor(LocalDateTime anchor, boolean insertIfMissing) {
        Map<String, Object> p = Map.of("anchor", anchor);
        if (insertIfMissing) {
            exec("""
                    INSERT INTO demo_seed_state (id, anchor_at) VALUES (1, :anchor)
                    ON DUPLICATE KEY UPDATE anchor_at = VALUES(anchor_at)
                    """, p);
        } else {
            exec("UPDATE demo_seed_state SET anchor_at = :anchor WHERE id = 1", p);
        }
    }

    // ==================================================================
    // Pomocnicze
    // ==================================================================

    private void logSummary(boolean created) {
        StringBuilder sb = new StringBuilder();
        sb.append(created ? "Dane demo utworzone." : "Dane demo odświeżone.")
                .append(" Konta (hasło z DEMO_SEED_PASSWORD):");
        for (AccountSpec spec : DemoCatalog.ACCOUNTS) {
            if (spec.login()) {
                sb.append("\n  ").append(String.format("%-16s", spec.type()))
                        .append(DemoCatalog.email(spec.key()))
                        .append(spec.type() == UserType.STORE_EMPLOYEE && !spec.active() ? "  (nieaktywny)" : "");
            }
        }
        tx.executeWithoutResult(status -> findUser(DemoCatalog.MAIN_CUSTOMER).ifPresent(customer ->
                em.createQuery("""
                                SELECT r FROM ReservationEntity r
                                WHERE r.user = :customer AND r.status = :reserved AND r.expiresAt > :now
                                ORDER BY r.createdAt
                                """, ReservationEntity.class)
                        .setParameter("customer", customer)
                        .setParameter("reserved", ReservationStatus.RESERVED)
                        .setParameter("now", nowUtc())
                        .getResultList()
                        .forEach(r -> sb.append("\n  kod odbioru ").append(r.getPickupCode())
                                .append(" — ").append(r.getOffer().getName())
                                .append(" × ").append(r.getQuantity()))));
        log.info(sb.toString());
    }

    private int exec(String sql, Map<String, Object> params) {
        var query = em.createNativeQuery(sql);
        params.forEach(query::setParameter);
        return query.executeUpdate();
    }

    private List<Long> demoUserIds() {
        return em.createQuery("SELECT u.id FROM UserModel u WHERE u.email LIKE :pattern", Long.class)
                .setParameter("pattern", DemoCatalog.EMAIL_PREFIX + "%" + DemoCatalog.EMAIL_DOMAIN)
                .getResultList();
    }

    private Optional<UserModel> findUser(String key) {
        return em.createQuery("SELECT u FROM UserModel u WHERE u.email = :email", UserModel.class)
                .setParameter("email", DemoCatalog.email(key))
                .getResultStream()
                .findFirst();
    }

    private static UserModel requireUser(Map<String, UserModel> users, String key) {
        UserModel user = users.get(key);
        if (user == null) {
            throw new IllegalStateException("Brak konta demo o kluczu: " + key);
        }
        return user;
    }

    private final Map<String, CategoryEntity> categories = new HashMap<>();

    private CategoryEntity requireCategory(String name) {
        return categories.computeIfAbsent(name, n -> em.createQuery(
                        "SELECT c FROM CategoryEntity c WHERE c.name = :name", CategoryEntity.class)
                .setParameter("name", n)
                .getResultStream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Brak kategorii z migracji 31: " + n)));
    }

    private SubcategoryEntity requireSubcategory(CategoryEntity category, String name) {
        return em.createQuery("""
                        SELECT s FROM SubcategoryEntity s WHERE s.name = :name AND s.category = :category
                        """, SubcategoryEntity.class)
                .setParameter("name", name)
                .setParameter("category", category)
                .getResultStream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Brak podkategorii '" + name + "' w kategorii '" + category.getName() + "'"));
    }

    private static void requireAllowed(TransactionType type, String allowedJson, String where) {
        if (allowedJson != null && !allowedJson.contains("\"" + type.name() + "\"")) {
            throw new IllegalStateException("Typ " + type + " niedozwolony w '" + where + "' (" + allowedJson + ")");
        }
    }

    private static <T> T pick(List<T> list, Random rnd) {
        return list.get(rnd.nextInt(list.size()));
    }

    private static LocalDateTime nowUtc() {
        return LocalDateTime.now(ZoneOffset.UTC).withNano(0);
    }
}
