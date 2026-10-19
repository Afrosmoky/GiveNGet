package com.example.gng.reservation.service;

import com.example.gng.common.dto.PageParams;
import com.example.gng.common.dto.PageResponse;
import com.example.gng.common.exception.ForbiddenOperationException;
import com.example.gng.common.exception.InvalidPickupCodeException;
import com.example.gng.common.exception.InvalidStateException;
import com.example.gng.common.exception.OfferNotAvailableException;
import com.example.gng.common.exception.ResourceNotFoundException;
import com.example.gng.common.exception.TooManyRequestsException;
import com.example.gng.common.ratelimit.RateLimitProperties;
import com.example.gng.common.ratelimit.RateLimitResult;
import com.example.gng.common.ratelimit.TokenBucketRateLimiter;
import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.entity.OfferStatus;
import com.example.gng.offer.repository.OfferRepository;
import com.example.gng.register.company.model.BusinessUserModel;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.store.entity.StoreEmployeeModel;
import com.example.gng.reservation.dto.CreateReservationRequest;
import com.example.gng.reservation.dto.ReservationDTO;
import com.example.gng.common.exception.BadRequestException;
import com.example.gng.reservation.dto.StoreReservationDTO;
import com.example.gng.reservation.entity.ReservationEntity;
import com.example.gng.reservation.entity.ReservationStatus;
import com.example.gng.reservation.repository.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

/**
 * Logika rezerwacji po stronie użytkownika (docs/04_REZERWACJE_DESIGN.md).
 *
 * Potwierdzanie odbioru (RESERVED → COLLECTED) świadomie nie jest tu zaimplementowane —
 * wymaga rozstrzygnięcia modelu pracownik↔sklep (sekcja 7 designu).
 *
 * <p>W odróżnieniu od starszych serwisów (np. {@code OfferService}) ten nie woła
 * statycznego {@code SessionService.getCurrentUserEmail()} — e-mail wywołującego jest
 * argumentem. Dzięki temu serwis jest testowalny bez kontekstu HTTP, a wywołania
 * ze schedulera nie udają zalogowanego użytkownika.
 */
@Service
public class ReservationService {

    private static final Logger logger = LoggerFactory.getLogger(ReservationService.class);

    /** Ile razy ponowić losowanie kodu odbioru, jeśli trafimy na zajęty. */
    private static final int PICKUP_CODE_ATTEMPTS = 10;

    /**
     * Stabilne sortowanie: klucz biznesowy plus id jako tie-breaker. Bez tego
     * infinite scroll na mobile duplikuje i gubi rekordy (CLAUDE.md 6.4).
     */
    private static final Sort LIST_SORT = Sort.by(
            Sort.Order.desc("createdAt"),
            Sort.Order.asc("id"));

    /**
     * Lista sklepu: najnowsze na górze, id malejąco jako tie-breaker — import i seryjne
     * rezerwacje dają identyczne createdAt, a bez drugiego klucza paginacja gubi rekordy.
     */
    private static final Sort STORE_LIST_SORT = Sort.by(
            Sort.Order.desc("createdAt"),
            Sort.Order.desc("id"));

    private final ReservationRepository reservationRepository;
    private final OfferRepository offerRepository;
    private final UserRepository userRepository;
    private final PickupCodeGenerator pickupCodeGenerator;
    private final TokenBucketRateLimiter rateLimiter;
    private final RateLimitProperties rateLimitProperties;
    private final long holdTtlHours;
    private final int maxActiveReservationsPerUser;

    public ReservationService(ReservationRepository reservationRepository,
                             OfferRepository offerRepository,
                             UserRepository userRepository,
                             PickupCodeGenerator pickupCodeGenerator,
                             TokenBucketRateLimiter rateLimiter,
                             RateLimitProperties rateLimitProperties,
                             @Value("${reservation.hold-ttl-hours:24}") long holdTtlHours,
                             @Value("${reservation.max-active-per-user:5}") int maxActiveReservationsPerUser) {
        this.reservationRepository = reservationRepository;
        this.offerRepository = offerRepository;
        this.userRepository = userRepository;
        this.pickupCodeGenerator = pickupCodeGenerator;
        this.rateLimiter = rateLimiter;
        this.rateLimitProperties = rateLimitProperties;
        this.holdTtlHours = holdTtlHours;
        this.maxActiveReservationsPerUser = maxActiveReservationsPerUser;
    }

    // ------------------------------------------------------------------
    // Tworzenie
    // ------------------------------------------------------------------

    /**
     * Tworzy rezerwację (sekcja 2 designu).
     *
     * Kolejność jest istotna i cała mieści się w jednej transakcji:
     * <ol>
     *   <li>pesymistyczna blokada wiersza oferty,</li>
     *   <li>obliczenie dostępności,</li>
     *   <li>zapis albo {@code OFFER_NOT_AVAILABLE}.</li>
     * </ol>
     * Blokada zdjęta przed punktem 2 oznaczałaby, że dwa równoczesne żądania widzą tę
     * samą dostępność i oba zapisują — czyli sprzedaż towaru, którego nie ma.
     *
     * <p><b>READ_COMMITTED jest tu konieczne, nie kosmetyczne.</b> MySQL domyślnie pracuje
     * w REPEATABLE READ, gdzie snapshot transakcji powstaje przy jej pierwszym odczycie.
     * Pierwszym odczytem jest pobranie użytkownika — czyli jeszcze przed blokadą. Wątek,
     * który poczeka na zwolnienie blokady wiersza oferty, i tak policzyłby dostępność ze
     * swojego starego snapshotu i nie zobaczył rezerwacji zapisanej w tym czasie przez
     * konkurenta. Blokada trzymałaby poprawnie, a liczenie kłamało — i stan magazynowy
     * zostałby przekroczony. Potwierdzone testem {@code ReservationConcurrencyTest}.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ReservationDTO create(String currentUserEmail, CreateReservationRequest request) {
        UserModel user = requireUser(currentUserEmail);
        LocalDateTime now = nowUtc();

        // Limit tempa PRZED jakąkolwiek pracą — nie ma po co blokować wierszy ani liczyć
        // dostępności dla żądania, które i tak odrzucimy
        requireWithinRateLimit("reservation-create:" + user.getId(),
                rateLimitProperties.getReservationCreate());

        // Blokada wiersza UŻYTKOWNIKA przed wierszem oferty — patrz UserRepository
        // .findByIdForUpdate. Serializuje rezerwacje tego samego użytkownika, bez czego
        // twardy limit aktywnych rezerwacji dałby się obejść równoczesnymi żądaniami
        // na różne oferty. Kolejność user -> offer jest tu jedyna i stała, więc nie ma deadlocku.
        userRepository.findByIdForUpdate(user.getId())
                .orElseThrow(() -> new ForbiddenOperationException(
                        "Nie znaleziono konta zalogowanego użytkownika.", Map.of()));

        int activeReservations = reservationRepository.countActiveByUserId(user.getId(), now);
        if (activeReservations >= maxActiveReservationsPerUser) {
            throw TooManyRequestsException.tooManyActiveReservations(
                    activeReservations, maxActiveReservationsPerUser);
        }

        // SELECT ... FOR UPDATE — serializuje równoczesne rezerwacje tej samej oferty
        OfferEntity offer = offerRepository.findByIdForUpdate(request.offerId())
                .orElseThrow(() -> ResourceNotFoundException.offer(request.offerId()));

        if (offer.getStatus() != OfferStatus.ACTIVE) {
            throw OfferNotAvailableException.offerNotActive(
                    offer.getId(),
                    offer.getStatus() != null ? offer.getStatus().name() : "UNKNOWN");
        }

        if (offer.getUser() != null && offer.getUser().getId().equals(user.getId())) {
            throw ForbiddenOperationException.ownOffer(offer.getId());
        }

        int available = availableQuantity(offer, now);
        if (request.quantity() > available) {
            throw OfferNotAvailableException.notEnoughQuantity(offer.getId(), request.quantity(), available);
        }

        ReservationEntity reservation = new ReservationEntity();
        reservation.setOffer(offer);
        reservation.setUser(user);
        reservation.setQuantity(request.quantity());
        reservation.setStatus(ReservationStatus.RESERVED);
        reservation.setCreatedAt(now);
        reservation.setExpiresAt(now.plusHours(holdTtlHours));
        reservation.setPickupCode(generateUniquePickupCode());

        ReservationEntity saved = reservationRepository.save(reservation);
        logger.info("Utworzono rezerwację {} na ofertę {} ({} szt., wygasa {})",
                saved.getId(), offer.getId(), saved.getQuantity(), saved.getExpiresAt());

        // Dostępność po tej rezerwacji: liczymy z wartości sprzed zapisu, bo jesteśmy wciąż
        // w tej samej transakcji pod blokadą wiersza oferty — wynik jest dokładny i nie
        // wymaga ponownego zapytania.
        int remainingAvailable = available - request.quantity();

        return toDto(saved, now, remainingAvailable);
    }

    // ------------------------------------------------------------------
    // Odczyt
    // ------------------------------------------------------------------

    /** Rezerwacje zalogowanego użytkownika, paginowane i stabilnie posortowane. */
    @Transactional(readOnly = true)
    public PageResponse<ReservationDTO> listForCurrentUser(String currentUserEmail, Integer page, Integer size) {
        UserModel user = requireUser(currentUserEmail);
        LocalDateTime now = nowUtc();

        Pageable pageable = PageParams.of(page, size, LIST_SORT);
        Page<ReservationEntity> reservations = reservationRepository.findByUserId(user.getId(), pageable);

        return PageResponse.from(reservations, reservation -> toDto(reservation, now));
    }

    /**
     * Rezerwacje na oferty sklepu wywołującego (panel firmy, docs/08 #8).
     *
     * <p>Rola COMPANY to pierwsza bramka (SecurityConfig); tu sprawdzamy ją ponownie, a zakres
     * danych wyznacza właściciel oferty w zapytaniu — firma nigdy nie zobaczy rezerwacji na
     * cudze oferty, niezależnie od parametrów.
     *
     * @param rawStatus opcjonalny filtr (RESERVED/COLLECTED/EXPIRED/CANCELLED, wielkość liter
     *                  bez znaczenia); nieznana wartość → 400 INVALID_RESERVATION_STATUS
     */
    @Transactional(readOnly = true)
    public PageResponse<StoreReservationDTO> listForStore(String currentUserEmail, String rawStatus,
                                                          Integer page, Integer size) {
        UserModel caller = requireUser(currentUserEmail);
        if (caller.getType() != UserType.COMPANY) {
            throw ForbiddenOperationException.storeReservationsCompanyOnly();
        }
        ReservationStatus status = parseStatusFilter(rawStatus);
        LocalDateTime now = nowUtc();

        Pageable pageable = PageParams.of(page, size, STORE_LIST_SORT);
        Page<ReservationEntity> reservations = reservationRepository.findForStore(caller.getId(), status, now, pageable);

        return PageResponse.from(reservations, reservation -> toStoreDto(reservation, now));
    }

    private static ReservationStatus parseStatusFilter(String rawStatus) {
        if (rawStatus == null || rawStatus.isBlank()) {
            return null;
        }
        try {
            return ReservationStatus.valueOf(rawStatus.trim().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw BadRequestException.invalidReservationStatus(rawStatus);
        }
    }

    StoreReservationDTO toStoreDto(ReservationEntity reservation, LocalDateTime now) {
        OfferEntity offer = reservation.getOffer();
        UserModel customer = reservation.getUser();
        return new StoreReservationDTO(
                reservation.getId(),
                reservation.effectiveStatus(now),
                reservation.getQuantity(),
                offer != null ? offer.getId() : null,
                offer != null ? offer.getName() : null,
                firstImageUrl(offer),
                customer != null ? customer.getFirstName() : null,
                reservation.getCreatedAt(),
                reservation.getExpiresAt(),
                reservation.getCollectedAt(),
                reservation.getCancelledAt());
    }

    /**
     * Szczegóły własnej rezerwacji.
     *
     * Cudza rezerwacja daje {@code RESERVATION_NOT_FOUND}, nie {@code FORBIDDEN} —
     * rozróżnienie tych dwóch odpowiedzi pozwoliłoby sprawdzać, które identyfikatory
     * istnieją, a kod odbioru jest sekretem.
     */
    @Transactional(readOnly = true)
    public ReservationDTO getOwned(String currentUserEmail, String reservationId) {
        UserModel user = requireUser(currentUserEmail);
        return toDto(requireOwnedReservation(user, reservationId), nowUtc());
    }

    // ------------------------------------------------------------------
    // Anulowanie
    // ------------------------------------------------------------------

    /**
     * Anuluje własną aktywną rezerwację, co natychmiast zwalnia dostępność oferty
     * (bo do dostępności liczą się tylko rezerwacje RESERVED i niewygasłe).
     *
     * Rezerwacja po terminie, której scheduler jeszcze nie przestawił, jest
     * traktowana jak wygasła — {@code RESERVATION_NOT_CANCELLABLE} ze statusem
     * {@code EXPIRED} w details, żeby klient wiedział, dlaczego.
     */
    @Transactional
    public ReservationDTO cancel(String currentUserEmail, String reservationId) {
        UserModel user = requireUser(currentUserEmail);
        LocalDateTime now = nowUtc();

        ReservationEntity reservation = requireOwnedReservation(user, reservationId);

        ReservationStatus effective = reservation.effectiveStatus(now);
        if (effective != ReservationStatus.RESERVED) {
            throw InvalidStateException.reservationNotCancellable(reservationId, effective.name());
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        reservation.setCancelledAt(now);
        ReservationEntity saved = reservationRepository.save(reservation);

        logger.info("Anulowano rezerwację {} użytkownika {}", reservationId, user.getId());
        return toDto(saved, now);
    }

    // ------------------------------------------------------------------
    // Potwierdzenie odbioru (pracownik sklepu)
    // ------------------------------------------------------------------

    /**
     * Potwierdza odbiór rezerwacji po kodzie okazanym przez klienta
     * (docs/04_REZERWACJE_DESIGN.md, sekcje 6, 7 i 8).
     *
     * <p>Warunki, wszystkie sprawdzane pod blokadą wiersza rezerwacji:
     * <ol>
     *   <li>kod odpowiada istniejącej rezerwacji,</li>
     *   <li>status efektywny to {@code RESERVED} — czyli nie odebrana, nie anulowana
     *       i nie po terminie,</li>
     *   <li>firma pracownika jest właścicielem oferty.</li>
     * </ol>
     *
     * <p>READ_COMMITTED z tego samego powodu co przy tworzeniu rezerwacji: w domyślnym
     * dla MySQL REPEATABLE READ snapshot powstaje przy pierwszym odczycie w transakcji,
     * czyli przy pobieraniu pracownika — przed blokadą.
     *
     * <p>Odbiór <b>nie zwalnia</b> stanu magazynowego: {@code COLLECTED} zajmuje go dalej
     * (sekcja 1 designu), bo towar fizycznie wyszedł ze sklepu. Samo zdarzenie odbioru
     * zasili później raport oszczędności — na tym etapie tylko ustawiamy status i znacznik.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ReservationDTO collect(String currentUserEmail, String rawPickupCode) {
        UserModel staff = requireUser(currentUserEmail);
        LocalDateTime now = nowUtc();

        // Limit na konto pracownika spowalnia zgadywanie kodu odbioru. Przestrzeń to 32^6,
        // ale bez limitu nic nie stoi na przeszkodzie, by przelecieć ją skryptem.
        requireWithinRateLimit("reservation-collect:" + staff.getId(),
                rateLimitProperties.getReservationCollect());

        String pickupCode = normalizePickupCode(rawPickupCode);
        if (pickupCode.isEmpty()) {
            throw new InvalidPickupCodeException();
        }

        // SELECT ... FOR UPDATE — serializuje równoczesne próby odebrania tego samego kodu
        ReservationEntity reservation = reservationRepository.findByPickupCodeForUpdate(pickupCode)
                .orElseThrow(InvalidPickupCodeException::new);

        ReservationStatus effective = reservation.effectiveStatus(now);
        if (effective != ReservationStatus.RESERVED) {
            throw InvalidStateException.reservationNotCollectable(reservation.getId(), effective.name());
        }

        requireStaffOwnsOffer(staff, reservation);

        reservation.setStatus(ReservationStatus.COLLECTED);
        reservation.setCollectedAt(now);
        ReservationEntity saved = reservationRepository.save(reservation);

        logger.info("Potwierdzono odbiór rezerwacji {} ({} szt. z oferty {}) przez konto {}",
                saved.getId(), saved.getQuantity(),
                saved.getOffer() != null ? saved.getOffer().getId() : null, staff.getId());

        return toDto(saved, now);
    }

    /**
     * Sprawdza, że potwierdzający ma prawo wydać towar z tej oferty.
     *
     * ADMIN platformy przechodzi bez sprawdzenia sklepu — nie ma przypisanej firmy, więc
     * inaczej dopuszczenie tej roli do endpointu byłoby martwe. Każde takie użycie logujemy,
     * bo to obejście normalnej ścieżki.
     */
    private void requireStaffOwnsOffer(UserModel staff, ReservationEntity reservation) {
        if (staff.getType() == UserType.ADMIN) {
            logger.warn("Odbiór rezerwacji {} potwierdzany przez ADMIN {} — pominięto sprawdzenie sklepu",
                    reservation.getId(), staff.getId());
            return;
        }

        if (!(staff instanceof StoreEmployeeModel employee)) {
            throw ForbiddenOperationException.noStoreAssigned();
        }

        // Logowanie nieaktywnego już blokuje CustomUserDetailsService, ale token wydany
        // przed dezaktywacją żyje do 3 h — tu zamykamy jedyną operację tej roli
        if (!employee.isActive()) {
            throw ForbiddenOperationException.employeeDeactivated();
        }

        BusinessUserModel store = employee.getStore();
        if (store == null) {
            throw ForbiddenOperationException.noStoreAssigned();
        }

        UserModel offerOwner = reservation.getOffer() != null ? reservation.getOffer().getUser() : null;
        if (offerOwner == null || !store.getId().equals(offerOwner.getId())) {
            throw ForbiddenOperationException.foreignStore();
        }
    }

    /**
     * Kod jest przepisywany ręcznie z ekranu klienta, a alfabet jest wielkoliterowy —
     * bez normalizacji pracownik dostawałby INVALID_PICKUP_CODE za małą literę lub spację.
     */
    private static String normalizePickupCode(String rawPickupCode) {
        return rawPickupCode == null ? "" : rawPickupCode.trim().toUpperCase();
    }

    // ------------------------------------------------------------------
    // Wygaszanie (scheduler)
    // ------------------------------------------------------------------

    /**
     * Przestawia przeterminowane rezerwacje RESERVED → EXPIRED.
     *
     * Dostępność liczy tylko niewygasłe rezerwacje, więc ta operacja nie jest warunkiem
     * zwolnienia towaru — towar zwalnia się sam z upływem czasu. Scheduler porządkuje
     * stan, żeby listy i statystyki pokazywały prawdę.
     *
     * @return liczba przestawionych rezerwacji
     */
    @Transactional
    public int expireOverdueReservations() {
        LocalDateTime now = nowUtc();
        List<ReservationEntity> overdue = reservationRepository
                .findByStatusAndExpiresAtLessThanEqual(ReservationStatus.RESERVED, now);

        if (overdue.isEmpty()) {
            return 0;
        }

        overdue.forEach(reservation -> reservation.setStatus(ReservationStatus.EXPIRED));
        reservationRepository.saveAll(overdue);

        logger.info("Oznaczono {} rezerwacji jako wygasłe", overdue.size());
        return overdue.size();
    }

    // ------------------------------------------------------------------
    // Dostępność
    // ------------------------------------------------------------------

    /**
     * Dostępność oferty = quantity minus sztuki zajmujące stan (sekcja 1 designu).
     * Zajmują je rezerwacje RESERVED przed terminem oraz COLLECTED; EXPIRED i CANCELLED
     * stan zwalniają. Nigdy nie schodzi poniżej zera, nawet gdyby dane były niespójne.
     */
    public int availableQuantity(OfferEntity offer, LocalDateTime now) {
        int total = offer.getQuantity() != null ? offer.getQuantity() : 0;
        int reserved = reservationRepository.sumOccupiedQuantityByOfferId(offer.getId(), now);
        return Math.max(0, total - reserved);
    }

    // ------------------------------------------------------------------
    // Pomocnicze
    // ------------------------------------------------------------------

    /**
     * Sprawdza limit tempa i przerywa żądanie z 429, gdy przekroczony.
     *
     * Limit jest liczony w pamięci procesu, więc dotyczy jednej instancji aplikacji —
     * przy skalowaniu poziomym efektywny limit rośnie liniowo z liczbą instancji
     * (patrz TokenBucketRateLimiter).
     */
    private void requireWithinRateLimit(String key, RateLimitProperties.Limit limit) {
        RateLimitResult result = rateLimiter.tryConsume(key, limit);
        if (!result.allowed()) {
            logger.warn("Przekroczono limit tempa dla klucza {} (ponów za {} s)",
                    key, result.retryAfterSeconds());
            throw TooManyRequestsException.rateLimit(result.retryAfterSeconds());
        }
    }

    private UserModel requireUser(String email) {
        if (email == null || email.isBlank()) {
            throw new ForbiddenOperationException("Operacja wymaga zalogowanego użytkownika.", Map.of());
        }
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ForbiddenOperationException(
                        "Nie znaleziono konta zalogowanego użytkownika.", Map.of()));
    }

    private ReservationEntity requireOwnedReservation(UserModel user, String reservationId) {
        ReservationEntity reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> ResourceNotFoundException.reservation(reservationId));

        if (reservation.getUser() == null || !reservation.getUser().getId().equals(user.getId())) {
            throw ResourceNotFoundException.reservation(reservationId);
        }
        return reservation;
    }

    /**
     * Losuje kod odbioru wolny w bazie.
     *
     * Przestrzeń to 32^6 (~1,07 mld), więc kolizje są skrajnie rzadkie; twardą gwarancją
     * jest indeks UNIQUE na pickup_code, a ta pętla oszczędza odrzucenia transakcji.
     */
    private String generateUniquePickupCode() {
        for (int attempt = 0; attempt < PICKUP_CODE_ATTEMPTS; attempt++) {
            String code = pickupCodeGenerator.generate();
            if (!reservationRepository.existsByPickupCode(code)) {
                return code;
            }
            logger.warn("Kolizja kodu odbioru, próba {}/{}", attempt + 1, PICKUP_CODE_ATTEMPTS);
        }
        throw new IllegalStateException(
                "Nie udało się wygenerować unikalnego kodu odbioru po " + PICKUP_CODE_ATTEMPTS + " próbach");
    }

    private static LocalDateTime nowUtc() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    ReservationDTO toDto(ReservationEntity reservation, LocalDateTime now) {
        return toDto(reservation, now, null);
    }

    ReservationDTO toDto(ReservationEntity reservation, LocalDateTime now, Integer offerAvailableQuantity) {
        OfferEntity offer = reservation.getOffer();

        String offerId = offer != null ? offer.getId() : null;
        String offerName = offer != null ? offer.getName() : null;
        String offerImageUrl = firstImageUrl(offer);

        return new ReservationDTO(
                reservation.getId(),
                offerId,
                offerName,
                offerImageUrl,
                reservation.getQuantity(),
                reservation.effectiveStatus(now),
                reservation.getPickupCode(),
                qrPayload(reservation),
                reservation.getCreatedAt(),
                reservation.getExpiresAt(),
                reservation.getCollectedAt(),
                reservation.getCancelledAt(),
                offerAvailableQuantity);
    }

    /** Treść QR: "id:pickupCode" — sekretem jest kod, id służy szybkiemu lookupowi (sekcja 8). */
    private static String qrPayload(ReservationEntity reservation) {
        if (reservation.getId() == null || reservation.getPickupCode() == null) {
            return null;
        }
        return reservation.getId() + ":" + reservation.getPickupCode();
    }

    private static String firstImageUrl(OfferEntity offer) {
        if (offer == null || offer.getImages() == null || offer.getImages().isEmpty()) {
            return null;
        }
        var image = offer.getImages().get(0).getImage();
        return image != null ? image.getFilePath() : null;
    }
}
