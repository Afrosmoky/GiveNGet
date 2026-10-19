package com.example.gng.reservation.service;

import com.example.gng.common.dto.PageResponse;
import com.example.gng.common.exception.ForbiddenOperationException;
import com.example.gng.common.exception.InvalidPickupCodeException;
import com.example.gng.common.exception.InvalidStateException;
import com.example.gng.common.exception.OfferNotAvailableException;
import com.example.gng.common.exception.ResourceNotFoundException;
import com.example.gng.common.exception.TooManyRequestsException;
import com.example.gng.common.ratelimit.RateLimitProperties;
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
import com.example.gng.reservation.entity.ReservationEntity;
import com.example.gng.reservation.entity.ReservationStatus;
import com.example.gng.reservation.notification.ReservationNotificationEvent;
import com.example.gng.reservation.repository.ReservationRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Logika rezerwacji na zamockowanych zależnościach: przejścia statusów, uprawnienia,
 * kształt błędów domenowych i paginacja.
 *
 * Współbieżność i faktyczne zwalnianie dostępności w bazie sprawdza
 * {@code ReservationConcurrencyTest} na prawdziwym MySQL — mock nie dowiódłby
 * działania blokady wiersza.
 */
class ReservationServiceTest {

    private static final String BUYER_EMAIL = "kupujacy@example.com";
    private static final Long BUYER_ID = 10L;
    private static final Long SELLER_ID = 20L;
    private static final String OFFER_ID = "OFFER0000001";
    private static final String RESERVATION_ID = "RESERV000001";
    private static final String STAFF_EMAIL = "pracownik@example.com";
    private static final String ADMIN_EMAIL = "admin@example.com";
    private static final long TTL_HOURS = 24L;

    @Mock private ReservationRepository reservationRepository;
    @Mock private OfferRepository offerRepository;
    @Mock private UserRepository userRepository;
    @Mock private PickupCodeGenerator pickupCodeGenerator;

    private static final int MAX_ACTIVE = 5;

    private AutoCloseable mocks;
    private ReservationService service;
    private ApplicationEventPublisher eventPublisher;
    private RateLimitProperties rateLimitProperties;
    private TokenBucketRateLimiter rateLimiter;
    private AtomicLong clock;
    private UserModel buyer;
    private UserModel seller;

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);
        rateLimitProperties = new RateLimitProperties();
        rateLimitProperties.setReservationCreate(new RateLimitProperties.Limit(3, Duration.ofMinutes(1)));
        rateLimitProperties.setReservationCollect(new RateLimitProperties.Limit(3, Duration.ofMinutes(1)));
        clock = new AtomicLong(0);
        rateLimiter = new TokenBucketRateLimiter(clock::get);

        eventPublisher = mock(ApplicationEventPublisher.class);
        service = new ReservationService(reservationRepository, offerRepository, userRepository,
                pickupCodeGenerator, rateLimiter, rateLimitProperties, eventPublisher, TTL_HOURS, MAX_ACTIVE);

        buyer = user(BUYER_ID, BUYER_EMAIL);
        seller = user(SELLER_ID, "sprzedawca@example.com");

        lenient().when(userRepository.findByEmail(BUYER_EMAIL)).thenReturn(Optional.of(buyer));
        lenient().when(userRepository.findByIdForUpdate(BUYER_ID)).thenReturn(Optional.of(buyer));
        lenient().when(reservationRepository.countActiveByUserId(eq(BUYER_ID), any())).thenReturn(0);
        lenient().when(pickupCodeGenerator.generate()).thenReturn("ABC234");
        lenient().when(reservationRepository.existsByPickupCode(anyString())).thenReturn(false);
        lenient().when(reservationRepository.save(any(ReservationEntity.class)))
                .thenAnswer(invocation -> {
                    ReservationEntity r = invocation.getArgument(0);
                    if (r.getId() == null) {
                        r.setId(RESERVATION_ID);
                    }
                    return r;
                });
    }

    @AfterEach
    void tearDown() throws Exception {
        mocks.close();
    }

    // ------------------------------------------------------------------
    // Tworzenie
    // ------------------------------------------------------------------

    @Test
    void create_reservesRequestedQuantityAndReturnsPickupData() {
        givenOfferForUpdate(offer(5, OfferStatus.ACTIVE));
        givenActiveReservedQuantity(0);

        ReservationDTO dto = service.create(BUYER_EMAIL, new CreateReservationRequest(OFFER_ID, 2));

        ReservationEntity saved = capturedReservation();
        assertEquals(2, saved.getQuantity());
        assertEquals(ReservationStatus.RESERVED, saved.getStatus());
        assertEquals("ABC234", saved.getPickupCode());
        assertEquals(BUYER_ID, saved.getUser().getId());
        assertNotNull(saved.getExpiresAt());

        // expiresAt = createdAt + TTL z konfiguracji
        assertEquals(saved.getCreatedAt().plusHours(TTL_HOURS), saved.getExpiresAt());

        assertEquals("ABC234", dto.pickupCode());
        assertEquals(RESERVATION_ID + ":ABC234", dto.qrPayload());
        assertEquals(ReservationStatus.RESERVED, dto.status());
        assertEquals(OFFER_ID, dto.offerId());
        // Klient odświeża licznik dostępności bez dodatkowego zapytania: 5 - 2
        assertEquals(3, dto.offerAvailableQuantity());

        // Push „rezerwacja potwierdzona” — zdarzenie z gotowymi wartościami, bez kodu odbioru
        ReservationNotificationEvent event = capturedEvent();
        assertEquals(ReservationNotificationEvent.Type.CONFIRMED, event.type());
        assertEquals(BUYER_ID, event.userId());
        assertEquals(dto.id(), event.reservationId());
        assertEquals(2, event.quantity());
        assertEquals(saved.getExpiresAt(), event.expiresAt());
    }

    @Test
    void create_doesNotPublishNotificationWhenRejected() {
        givenOfferForUpdate(offer(1, OfferStatus.ACTIVE));
        givenActiveReservedQuantity(1); // nic nie zostało

        assertThrows(OfferNotAvailableException.class,
                () -> service.create(BUYER_EMAIL, new CreateReservationRequest(OFFER_ID, 1)));

        verify(eventPublisher, never()).publishEvent(any(Object.class));
    }

    @Test
    void create_reportsZeroAvailabilityWhenLastUnitsTaken() {
        givenOfferForUpdate(offer(5, OfferStatus.ACTIVE));
        givenActiveReservedQuantity(3); // dostępne 2

        ReservationDTO dto = service.create(BUYER_EMAIL, new CreateReservationRequest(OFFER_ID, 2));

        assertEquals(0, dto.offerAvailableQuantity());
    }

    @Test
    void listAndGet_leaveOfferAvailabilityUnset() {
        // Dostępność oferty nie jest częścią stanu rezerwacji; liczenie jej per pozycja
        // listy dałoby N+1 na ekranie, który tej wartości nie używa
        ReservationEntity reservation = activeReservation(1);
        when(reservationRepository.findById(RESERVATION_ID)).thenReturn(Optional.of(reservation));
        when(reservationRepository.findByUserId(eq(BUYER_ID), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(reservation), PageRequest.of(0, 20), 1));

        assertNull(service.getOwned(BUYER_EMAIL, RESERVATION_ID).offerAvailableQuantity());
        assertNull(service.listForCurrentUser(BUYER_EMAIL, 0, 20)
                .content().get(0).offerAvailableQuantity());
    }

    @Test
    void create_allowsReservingExactlyWhatIsLeft() {
        givenOfferForUpdate(offer(5, OfferStatus.ACTIVE));
        givenActiveReservedQuantity(3); // dostępne 2

        service.create(BUYER_EMAIL, new CreateReservationRequest(OFFER_ID, 2));

        assertEquals(2, capturedReservation().getQuantity());
    }

    @Test
    void create_rejectsWhenRequestedExceedsAvailability() {
        givenOfferForUpdate(offer(5, OfferStatus.ACTIVE));
        givenActiveReservedQuantity(4); // dostępne 1

        OfferNotAvailableException ex = assertThrows(OfferNotAvailableException.class,
                () -> service.create(BUYER_EMAIL, new CreateReservationRequest(OFFER_ID, 2)));

        assertEquals("OFFER_NOT_AVAILABLE", ex.getCode());
        assertEquals(2, ex.getDetails().get("requested"));
        assertEquals(1, ex.getDetails().get("available"));
        verify(reservationRepository, never()).save(any());
    }

    @Test
    void create_rejectsWhenOfferSoldOut() {
        givenOfferForUpdate(offer(3, OfferStatus.ACTIVE));
        givenActiveReservedQuantity(3); // dostępne 0

        OfferNotAvailableException ex = assertThrows(OfferNotAvailableException.class,
                () -> service.create(BUYER_EMAIL, new CreateReservationRequest(OFFER_ID, 1)));

        assertEquals(0, ex.getDetails().get("available"));
    }

    @Test
    void create_rejectsInactiveOffer() {
        givenOfferForUpdate(offer(5, OfferStatus.BLOCKED));

        OfferNotAvailableException ex = assertThrows(OfferNotAvailableException.class,
                () -> service.create(BUYER_EMAIL, new CreateReservationRequest(OFFER_ID, 1)));

        assertEquals("OFFER_NOT_AVAILABLE", ex.getCode());
        assertEquals("BLOCKED", ex.getDetails().get("offerStatus"));
        // Nie ma sensu liczyć dostępności oferty, której i tak nie można zarezerwować
        verify(reservationRepository, never()).sumOccupiedQuantityByOfferId(anyString(), any());
    }

    @Test
    void create_rejectsOwnOffer() {
        OfferEntity own = offer(5, OfferStatus.ACTIVE);
        own.setUser(buyer);
        givenOfferForUpdate(own);

        ForbiddenOperationException ex = assertThrows(ForbiddenOperationException.class,
                () -> service.create(BUYER_EMAIL, new CreateReservationRequest(OFFER_ID, 1)));

        assertEquals("FORBIDDEN", ex.getCode());
        verify(reservationRepository, never()).save(any());
    }

    @Test
    void create_failsWhenOfferDoesNotExist() {
        when(offerRepository.findByIdForUpdate(OFFER_ID)).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> service.create(BUYER_EMAIL, new CreateReservationRequest(OFFER_ID, 1)));

        assertEquals("OFFER_NOT_FOUND", ex.getCode());
    }

    @Test
    void create_retriesOnPickupCodeCollision() {
        givenOfferForUpdate(offer(5, OfferStatus.ACTIVE));
        givenActiveReservedQuantity(0);
        when(pickupCodeGenerator.generate()).thenReturn("TAKEN1", "TAKEN2", "FREE99");
        when(reservationRepository.existsByPickupCode("TAKEN1")).thenReturn(true);
        when(reservationRepository.existsByPickupCode("TAKEN2")).thenReturn(true);
        when(reservationRepository.existsByPickupCode("FREE99")).thenReturn(false);

        service.create(BUYER_EMAIL, new CreateReservationRequest(OFFER_ID, 1));

        assertEquals("FREE99", capturedReservation().getPickupCode());
    }

    // ------------------------------------------------------------------
    // Limity (anty-abuse)
    // ------------------------------------------------------------------

    @Test
    void create_allowsRequestsUpToRateLimit() {
        givenOfferForUpdate(offer(50, OfferStatus.ACTIVE));
        givenActiveReservedQuantity(0);

        for (int i = 0; i < 3; i++) {
            service.create(BUYER_EMAIL, new CreateReservationRequest(OFFER_ID, 1));
        }

        verify(reservationRepository, times(3)).save(any(ReservationEntity.class));
    }

    @Test
    void create_rejectsRequestOverRateLimit() {
        givenOfferForUpdate(offer(50, OfferStatus.ACTIVE));
        givenActiveReservedQuantity(0);

        for (int i = 0; i < 3; i++) {
            service.create(BUYER_EMAIL, new CreateReservationRequest(OFFER_ID, 1));
        }

        TooManyRequestsException ex = assertThrows(TooManyRequestsException.class,
                () -> service.create(BUYER_EMAIL, new CreateReservationRequest(OFFER_ID, 1)));

        assertEquals("RATE_LIMIT_EXCEEDED", ex.getCode());
        assertTrue(ex.getRetryAfterSeconds() >= 1, "429 musi nieść Retry-After");
        // Limit sprawdzany PRZED pracą — żaden wiersz nie jest blokowany na darmo
        verify(offerRepository, times(3)).findByIdForUpdate(OFFER_ID);
    }

    @Test
    void create_rateLimitRecoversAfterTime() {
        givenOfferForUpdate(offer(50, OfferStatus.ACTIVE));
        givenActiveReservedQuantity(0);

        for (int i = 0; i < 3; i++) {
            service.create(BUYER_EMAIL, new CreateReservationRequest(OFFER_ID, 1));
        }
        assertThrows(TooManyRequestsException.class,
                () -> service.create(BUYER_EMAIL, new CreateReservationRequest(OFFER_ID, 1)));

        // 3 na minutę = jeden token na 20 sekund
        clock.addAndGet(Duration.ofSeconds(20).toNanos());

        service.create(BUYER_EMAIL, new CreateReservationRequest(OFFER_ID, 1));
        verify(reservationRepository, times(4)).save(any(ReservationEntity.class));
    }

    @Test
    void create_rejectsWhenUserHasMaxActiveReservations() {
        givenOfferForUpdate(offer(50, OfferStatus.ACTIVE));
        when(reservationRepository.countActiveByUserId(eq(BUYER_ID), any())).thenReturn(MAX_ACTIVE);

        TooManyRequestsException ex = assertThrows(TooManyRequestsException.class,
                () -> service.create(BUYER_EMAIL, new CreateReservationRequest(OFFER_ID, 1)));

        assertEquals("TOO_MANY_ACTIVE_RESERVATIONS", ex.getCode());
        assertEquals(MAX_ACTIVE, ex.getDetails().get("activeReservations"));
        assertEquals(MAX_ACTIVE, ex.getDetails().get("maxActiveReservations"));
        // Ten limit nie mija sam w przewidywalnym momencie — Retry-After byłoby zmyśleniem
        assertEquals(0, ex.getRetryAfterSeconds());
        verify(reservationRepository, never()).save(any());
    }

    @Test
    void create_allowsWhenJustBelowActiveLimit() {
        givenOfferForUpdate(offer(50, OfferStatus.ACTIVE));
        givenActiveReservedQuantity(0);
        when(reservationRepository.countActiveByUserId(eq(BUYER_ID), any())).thenReturn(MAX_ACTIVE - 1);

        service.create(BUYER_EMAIL, new CreateReservationRequest(OFFER_ID, 1));

        verify(reservationRepository).save(any(ReservationEntity.class));
    }

    @Test
    void create_locksUserRowBeforeOfferRow() {
        // Kolejność blokad user -> offer jest warunkiem braku deadlocku i twardości limitu
        givenOfferForUpdate(offer(50, OfferStatus.ACTIVE));
        givenActiveReservedQuantity(0);

        service.create(BUYER_EMAIL, new CreateReservationRequest(OFFER_ID, 1));

        org.mockito.InOrder inOrder = org.mockito.Mockito.inOrder(userRepository, offerRepository);
        inOrder.verify(userRepository).findByIdForUpdate(BUYER_ID);
        inOrder.verify(offerRepository).findByIdForUpdate(OFFER_ID);
    }

    @Test
    void collect_rejectsOverRateLimit() {
        ReservationEntity reservation = activeReservation(1);
        givenStoreEmployee(STAFF_EMAIL, SELLER_ID);
        when(reservationRepository.findByPickupCodeForUpdate(anyString()))
                .thenReturn(Optional.empty());

        // Trzy chybione próby zużywają limit, czwarta jest odrzucona zamiast szukać kodu
        for (int i = 0; i < 3; i++) {
            assertThrows(com.example.gng.common.exception.InvalidPickupCodeException.class,
                    () -> service.collect(STAFF_EMAIL, "AAA234"));
        }

        TooManyRequestsException ex = assertThrows(TooManyRequestsException.class,
                () -> service.collect(STAFF_EMAIL, "AAA234"));
        assertEquals("RATE_LIMIT_EXCEEDED", ex.getCode());
        assertTrue(ex.getRetryAfterSeconds() >= 1);
        assertNotNull(reservation);
    }

    @Test
    void collect_rateLimitIsPerStaffAccount() {
        givenStoreEmployee(STAFF_EMAIL, SELLER_ID, 501L);
        givenStoreEmployee("pracownik2@example.com", SELLER_ID, 502L);
        when(reservationRepository.findByPickupCodeForUpdate(anyString())).thenReturn(Optional.empty());

        for (int i = 0; i < 3; i++) {
            assertThrows(com.example.gng.common.exception.InvalidPickupCodeException.class,
                    () -> service.collect(STAFF_EMAIL, "AAA234"));
        }
        assertThrows(TooManyRequestsException.class, () -> service.collect(STAFF_EMAIL, "AAA234"));

        // Drugi pracownik ma własny kubełek — zablokowanie kasy nr 1 nie blokuje kasy nr 2
        assertThrows(com.example.gng.common.exception.InvalidPickupCodeException.class,
                () -> service.collect("pracownik2@example.com", "AAA234"));
    }

    // ------------------------------------------------------------------
    // Anulowanie
    // ------------------------------------------------------------------

    @Test
    void cancel_setsCancelledStatusAndTimestamp() {
        ReservationEntity reservation = activeReservation(2);
        when(reservationRepository.findById(RESERVATION_ID)).thenReturn(Optional.of(reservation));

        ReservationDTO dto = service.cancel(BUYER_EMAIL, RESERVATION_ID);

        assertEquals(ReservationStatus.CANCELLED, reservation.getStatus());
        assertNotNull(reservation.getCancelledAt());
        assertEquals(ReservationStatus.CANCELLED, dto.status());
        assertNull(dto.collectedAt());
    }

    @Test
    void cancel_rejectsAlreadyCancelledReservation() {
        ReservationEntity reservation = activeReservation(2);
        reservation.setStatus(ReservationStatus.CANCELLED);
        when(reservationRepository.findById(RESERVATION_ID)).thenReturn(Optional.of(reservation));

        InvalidStateException ex = assertThrows(InvalidStateException.class,
                () -> service.cancel(BUYER_EMAIL, RESERVATION_ID));

        assertEquals("RESERVATION_NOT_CANCELLABLE", ex.getCode());
        assertEquals("CANCELLED", ex.getDetails().get("status"));
    }

    @Test
    void cancel_rejectsCollectedReservation() {
        ReservationEntity reservation = activeReservation(2);
        reservation.setStatus(ReservationStatus.COLLECTED);
        reservation.setCollectedAt(nowUtc());
        when(reservationRepository.findById(RESERVATION_ID)).thenReturn(Optional.of(reservation));

        InvalidStateException ex = assertThrows(InvalidStateException.class,
                () -> service.cancel(BUYER_EMAIL, RESERVATION_ID));

        assertEquals("COLLECTED", ex.getDetails().get("status"));
    }

    @Test
    void cancel_rejectsReservationPastExpiryEvenIfSchedulerHasNotRun() {
        // Status w bazie wciąż RESERVED, ale termin minął — efektywnie wygasła
        ReservationEntity reservation = activeReservation(2);
        reservation.setExpiresAt(nowUtc().minusMinutes(1));
        when(reservationRepository.findById(RESERVATION_ID)).thenReturn(Optional.of(reservation));

        InvalidStateException ex = assertThrows(InvalidStateException.class,
                () -> service.cancel(BUYER_EMAIL, RESERVATION_ID));

        assertEquals("EXPIRED", ex.getDetails().get("status"));
    }

    @Test
    void cancel_failsForSomeoneElsesReservation() {
        ReservationEntity reservation = activeReservation(2);
        reservation.setUser(seller);
        when(reservationRepository.findById(RESERVATION_ID)).thenReturn(Optional.of(reservation));

        // 404, nie 403 — inaczej dałoby się sprawdzać, które identyfikatory istnieją
        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> service.cancel(BUYER_EMAIL, RESERVATION_ID));

        assertEquals("RESERVATION_NOT_FOUND", ex.getCode());
        verify(reservationRepository, never()).save(any());
    }

    @Test
    void cancel_failsWhenReservationDoesNotExist() {
        when(reservationRepository.findById(RESERVATION_ID)).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> service.cancel(BUYER_EMAIL, RESERVATION_ID));

        assertEquals("RESERVATION_NOT_FOUND", ex.getCode());
    }

    // ------------------------------------------------------------------
    // Potwierdzenie odbioru
    // ------------------------------------------------------------------

    @Test
    void collect_marksReservationCollectedForOwnStore() {
        ReservationEntity reservation = activeReservation(2);
        givenStoreEmployee(STAFF_EMAIL, SELLER_ID); // pracownik sklepu, który wystawił ofertę
        when(reservationRepository.findByPickupCodeForUpdate("ABC234")).thenReturn(Optional.of(reservation));

        ReservationDTO dto = service.collect(STAFF_EMAIL, "ABC234");

        assertEquals(ReservationStatus.COLLECTED, reservation.getStatus());
        assertNotNull(reservation.getCollectedAt(), "collectedAt musi zostać ustawione");
        assertNull(reservation.getCancelledAt());
        assertEquals(ReservationStatus.COLLECTED, dto.status());
        assertNotNull(dto.collectedAt());

        ReservationNotificationEvent event = capturedEvent();
        assertEquals(ReservationNotificationEvent.Type.COLLECTED, event.type());
        assertEquals(BUYER_ID, event.userId());
    }

    @Test
    void collect_normalizesPickupCodeBeforeLookup() {
        // Pracownik przepisuje kod z ekranu klienta — małe litery i spacje nie mogą go blokować
        ReservationEntity reservation = activeReservation(1);
        givenStoreEmployee(STAFF_EMAIL, SELLER_ID);
        when(reservationRepository.findByPickupCodeForUpdate("ABC234")).thenReturn(Optional.of(reservation));

        service.collect(STAFF_EMAIL, "  abc234 ");

        verify(reservationRepository).findByPickupCodeForUpdate("ABC234");
        assertEquals(ReservationStatus.COLLECTED, reservation.getStatus());
    }

    @Test
    void collect_rejectsUnknownPickupCode() {
        givenStoreEmployee(STAFF_EMAIL, SELLER_ID);
        when(reservationRepository.findByPickupCodeForUpdate("ZZZZZZ")).thenReturn(Optional.empty());

        InvalidPickupCodeException ex = assertThrows(InvalidPickupCodeException.class,
                () -> service.collect(STAFF_EMAIL, "ZZZZZZ"));

        assertEquals("INVALID_PICKUP_CODE", ex.getCode());
        // Sekret nie może wracać w odpowiedzi
        assertTrue(ex.getDetails().isEmpty());
        verify(reservationRepository, never()).save(any());
    }

    @Test
    void collect_rejectsBlankPickupCodeWithoutHittingDatabase() {
        givenStoreEmployee(STAFF_EMAIL, SELLER_ID);

        assertThrows(InvalidPickupCodeException.class, () -> service.collect(STAFF_EMAIL, "   "));

        verify(reservationRepository, never()).findByPickupCodeForUpdate(anyString());
    }

    @Test
    void collect_rejectsExpiredReservation() {
        ReservationEntity reservation = activeReservation(1);
        reservation.setExpiresAt(nowUtc().minusMinutes(5)); // termin minął, status wciąż RESERVED
        givenStoreEmployee(STAFF_EMAIL, SELLER_ID);
        when(reservationRepository.findByPickupCodeForUpdate("ABC234")).thenReturn(Optional.of(reservation));

        InvalidStateException ex = assertThrows(InvalidStateException.class,
                () -> service.collect(STAFF_EMAIL, "ABC234"));

        assertEquals("RESERVATION_NOT_COLLECTABLE", ex.getCode());
        assertEquals("EXPIRED", ex.getDetails().get("status"));
        verify(reservationRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any(Object.class));
    }

    @Test
    void collect_rejectsAlreadyCollectedReservation() {
        ReservationEntity reservation = activeReservation(1);
        reservation.setStatus(ReservationStatus.COLLECTED);
        reservation.setCollectedAt(nowUtc().minusMinutes(10));
        givenStoreEmployee(STAFF_EMAIL, SELLER_ID);
        when(reservationRepository.findByPickupCodeForUpdate("ABC234")).thenReturn(Optional.of(reservation));

        InvalidStateException ex = assertThrows(InvalidStateException.class,
                () -> service.collect(STAFF_EMAIL, "ABC234"));

        assertEquals("RESERVATION_NOT_COLLECTABLE", ex.getCode());
        assertEquals("COLLECTED", ex.getDetails().get("status"));
    }

    @Test
    void collect_rejectsCancelledReservation() {
        ReservationEntity reservation = activeReservation(1);
        reservation.setStatus(ReservationStatus.CANCELLED);
        givenStoreEmployee(STAFF_EMAIL, SELLER_ID);
        when(reservationRepository.findByPickupCodeForUpdate("ABC234")).thenReturn(Optional.of(reservation));

        InvalidStateException ex = assertThrows(InvalidStateException.class,
                () -> service.collect(STAFF_EMAIL, "ABC234"));

        assertEquals("CANCELLED", ex.getDetails().get("status"));
    }

    @Test
    void collect_rejectsEmployeeFromAnotherStore() {
        ReservationEntity reservation = activeReservation(1);
        givenStoreEmployee(STAFF_EMAIL, 999L); // pracownik zupełnie innego sklepu
        when(reservationRepository.findByPickupCodeForUpdate("ABC234")).thenReturn(Optional.of(reservation));

        ForbiddenOperationException ex = assertThrows(ForbiddenOperationException.class,
                () -> service.collect(STAFF_EMAIL, "ABC234"));

        assertEquals("FORBIDDEN", ex.getCode());
        assertEquals(ReservationStatus.RESERVED, reservation.getStatus(), "Status nie może się zmienić");
        verify(reservationRepository, never()).save(any());
    }

    @Test
    void collect_rejectsDeactivatedEmployeeWithStillValidToken() {
        // Dezaktywacja blokuje logowanie, ale token wydany wcześniej żyje do 3 h —
        // własny sklep nie może tego obejść
        ReservationEntity reservation = activeReservation(1);
        givenStoreEmployee(STAFF_EMAIL, SELLER_ID);
        ((StoreEmployeeModel) userRepository.findByEmail(STAFF_EMAIL).orElseThrow()).setActive(false);
        when(reservationRepository.findByPickupCodeForUpdate("ABC234")).thenReturn(Optional.of(reservation));

        ForbiddenOperationException ex = assertThrows(ForbiddenOperationException.class,
                () -> service.collect(STAFF_EMAIL, "ABC234"));

        assertEquals("EMPLOYEE_DEACTIVATED", ex.getCode());
        assertEquals(ReservationStatus.RESERVED, reservation.getStatus(), "Status nie może się zmienić");
        verify(reservationRepository, never()).save(any());
    }

    @Test
    void collect_rejectsStoreEmployeeWithoutStore() {
        ReservationEntity reservation = activeReservation(1);
        StoreEmployeeModel orphan = new StoreEmployeeModel();
        orphan.setId(77L);
        orphan.setEmail(STAFF_EMAIL);
        orphan.setType(UserType.STORE_EMPLOYEE);
        orphan.setStore(null);
        when(userRepository.findByEmail(STAFF_EMAIL)).thenReturn(Optional.of(orphan));
        when(reservationRepository.findByPickupCodeForUpdate("ABC234")).thenReturn(Optional.of(reservation));

        ForbiddenOperationException ex = assertThrows(ForbiddenOperationException.class,
                () -> service.collect(STAFF_EMAIL, "ABC234"));

        assertEquals("FORBIDDEN", ex.getCode());
    }

    @Test
    void collect_rejectsPlainUserEvenIfSecurityLetThemThrough() {
        // Obrona w głębi: gdyby reguła w SecurityConfig kiedyś się rozjechała,
        // konto bez powiązania ze sklepem nadal nie wyda towaru
        ReservationEntity reservation = activeReservation(1);
        when(reservationRepository.findByPickupCodeForUpdate("ABC234")).thenReturn(Optional.of(reservation));

        assertThrows(ForbiddenOperationException.class, () -> service.collect(BUYER_EMAIL, "ABC234"));
    }

    @Test
    void collect_allowsPlatformAdminWithoutStoreCheck() {
        ReservationEntity reservation = activeReservation(1);
        UserModel admin = user(500L, ADMIN_EMAIL);
        admin.setType(UserType.ADMIN);
        when(userRepository.findByEmail(ADMIN_EMAIL)).thenReturn(Optional.of(admin));
        when(reservationRepository.findByPickupCodeForUpdate("ABC234")).thenReturn(Optional.of(reservation));

        ReservationDTO dto = service.collect(ADMIN_EMAIL, "ABC234");

        assertEquals(ReservationStatus.COLLECTED, dto.status());
    }

    // ------------------------------------------------------------------
    // Odczyt
    // ------------------------------------------------------------------

    @Test
    void getOwned_reportsExpiredStatusForOverdueReservation() {
        ReservationEntity reservation = activeReservation(1);
        reservation.setExpiresAt(nowUtc().minusHours(1));
        when(reservationRepository.findById(RESERVATION_ID)).thenReturn(Optional.of(reservation));

        ReservationDTO dto = service.getOwned(BUYER_EMAIL, RESERVATION_ID);

        assertEquals(ReservationStatus.EXPIRED, dto.status());
        // W bazie status zostaje niezmieniony do przebiegu schedulera
        assertEquals(ReservationStatus.RESERVED, reservation.getStatus());
    }

    @Test
    void getOwned_failsForSomeoneElsesReservation() {
        ReservationEntity reservation = activeReservation(1);
        reservation.setUser(seller);
        when(reservationRepository.findById(RESERVATION_ID)).thenReturn(Optional.of(reservation));

        assertThrows(ResourceNotFoundException.class, () -> service.getOwned(BUYER_EMAIL, RESERVATION_ID));
    }

    // ------------------------------------------------------------------
    // Paginacja
    // ------------------------------------------------------------------

    @Test
    void list_usesStableSortCreatedAtDescThenId() {
        givenEmptyPage();

        service.listForCurrentUser(BUYER_EMAIL, 0, 20);

        Sort sort = capturedPageable().getSort();
        List<Sort.Order> orders = sort.toList();
        assertEquals(2, orders.size(), "Sortowanie musi mieć tie-breaker");
        assertEquals("createdAt", orders.get(0).getProperty());
        assertEquals(Sort.Direction.DESC, orders.get(0).getDirection());
        assertEquals("id", orders.get(1).getProperty());
        assertEquals(Sort.Direction.ASC, orders.get(1).getDirection());
    }

    @Test
    void list_appliesDefaultsForMissingParameters() {
        givenEmptyPage();

        service.listForCurrentUser(BUYER_EMAIL, null, null);

        Pageable pageable = capturedPageable();
        assertEquals(0, pageable.getPageNumber());
        assertEquals(20, pageable.getPageSize());
    }

    @Test
    void list_clampsOversizedPageRequests() {
        givenEmptyPage();

        service.listForCurrentUser(BUYER_EMAIL, -5, 5000);

        Pageable pageable = capturedPageable();
        assertEquals(0, pageable.getPageNumber(), "Ujemna strona sprowadzana do 0");
        assertEquals(100, pageable.getPageSize(), "Rozmiar strony ograniczony do MAX_PAGE_SIZE");
    }

    @Test
    void list_returnsEnvelopeWithPagingMetadata() {
        ReservationEntity reservation = activeReservation(1);
        when(reservationRepository.findByUserId(eq(BUYER_ID), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(reservation), PageRequest.of(0, 20), 1));

        PageResponse<ReservationDTO> response = service.listForCurrentUser(BUYER_EMAIL, 0, 20);

        assertEquals(1, response.content().size());
        assertEquals(0, response.page());
        assertEquals(20, response.size());
        assertEquals(1, response.totalElements());
        assertEquals(1, response.totalPages());
        assertEquals(RESERVATION_ID, response.content().get(0).id());
    }

    // ------------------------------------------------------------------
    // Wygasanie
    // ------------------------------------------------------------------

    @Test
    void expireOverdueReservations_flipsReservedToExpired() {
        ReservationEntity overdueOne = activeReservation(1);
        overdueOne.setExpiresAt(nowUtc().minusHours(2));
        ReservationEntity overdueTwo = activeReservation(3);
        overdueTwo.setId("RESERV000002");
        overdueTwo.setExpiresAt(nowUtc().minusMinutes(30));

        when(reservationRepository.findByStatusAndExpiresAtLessThanEqual(eq(ReservationStatus.RESERVED), any()))
                .thenReturn(List.of(overdueOne, overdueTwo));

        int expired = service.expireOverdueReservations();

        assertEquals(2, expired);
        assertEquals(ReservationStatus.EXPIRED, overdueOne.getStatus());
        assertEquals(ReservationStatus.EXPIRED, overdueTwo.getStatus());
        verify(reservationRepository).saveAll(List.of(overdueOne, overdueTwo));
    }

    @Test
    void expireOverdueReservations_doesNothingWhenNoneOverdue() {
        when(reservationRepository.findByStatusAndExpiresAtLessThanEqual(eq(ReservationStatus.RESERVED), any()))
                .thenReturn(List.of());

        assertEquals(0, service.expireOverdueReservations());
        verify(reservationRepository, never()).saveAll(any());
    }

    // ------------------------------------------------------------------
    // Dostępność
    // ------------------------------------------------------------------

    @Test
    void availableQuantity_subtractsOccupiedStock() {
        OfferEntity offer = offer(10, OfferStatus.ACTIVE);
        LocalDateTime now = nowUtc();
        when(reservationRepository.sumOccupiedQuantityByOfferId(OFFER_ID, now)).thenReturn(4);

        assertEquals(6, service.availableQuantity(offer, now));
    }

    @Test
    void availableQuantity_neverGoesNegative() {
        OfferEntity offer = offer(2, OfferStatus.ACTIVE);
        LocalDateTime now = nowUtc();
        when(reservationRepository.sumOccupiedQuantityByOfferId(OFFER_ID, now)).thenReturn(5);

        assertTrue(service.availableQuantity(offer, now) == 0);
    }

    // ------------------------------------------------------------------
    // Uwierzytelnienie
    // ------------------------------------------------------------------

    @Test
    void create_requiresKnownUser() {
        when(userRepository.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

        ForbiddenOperationException ex = assertThrows(ForbiddenOperationException.class,
                () -> service.create("ghost@example.com", new CreateReservationRequest(OFFER_ID, 1)));

        assertEquals("FORBIDDEN", ex.getCode());
    }

    // ------------------------------------------------------------------
    // Pomocnicze
    // ------------------------------------------------------------------

    private static LocalDateTime nowUtc() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    private static UserModel user(Long id, String email) {
        UserModel user = new UserModel();
        user.setId(id);
        user.setEmail(email);
        return user;
    }

    private OfferEntity offer(int quantity, OfferStatus status) {
        OfferEntity offer = new OfferEntity();
        offer.setId(OFFER_ID);
        offer.setName("Chleb");
        offer.setQuantity(quantity);
        offer.setStatus(status);
        offer.setUser(seller);
        return offer;
    }

    private ReservationEntity activeReservation(int quantity) {
        ReservationEntity reservation = new ReservationEntity();
        reservation.setId(RESERVATION_ID);
        reservation.setOffer(offer(10, OfferStatus.ACTIVE));
        reservation.setUser(buyer);
        reservation.setQuantity(quantity);
        reservation.setStatus(ReservationStatus.RESERVED);
        reservation.setPickupCode("ABC234");
        reservation.setCreatedAt(nowUtc().minusHours(1));
        reservation.setExpiresAt(nowUtc().plusHours(23));
        return reservation;
    }

    /**
     * Rejestruje konto pracownika sklepu o podanym identyfikatorze firmy.
     * Ofertę wystawia sklep o id {@code SELLER_ID}, więc podanie innego id daje pracownika
     * obcego sklepu.
     */
    private void givenStoreEmployee(String email, Long storeId) {
        // Identyfikator pracownika wyprowadzony z e-maila, nie ze sklepu: dwóch pracowników
        // tego samego sklepu musi mieć różne id, bo klucz limitu tempa jest per konto
        givenStoreEmployee(email, storeId, 1000L + Math.abs(email.hashCode() % 1000));
    }

    private void givenStoreEmployee(String email, Long storeId, Long employeeId) {
        BusinessUserModel store = new BusinessUserModel();
        store.setId(storeId);
        store.setCompanyName("Sklep " + storeId);
        store.setType(UserType.COMPANY);

        StoreEmployeeModel employee = new StoreEmployeeModel();
        employee.setId(employeeId);
        employee.setEmail(email);
        employee.setType(UserType.STORE_EMPLOYEE);
        employee.setStore(store);

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(employee));
    }

    private void givenOfferForUpdate(OfferEntity offer) {
        when(offerRepository.findByIdForUpdate(OFFER_ID)).thenReturn(Optional.of(offer));
    }

    private void givenActiveReservedQuantity(int reserved) {
        when(reservationRepository.sumOccupiedQuantityByOfferId(eq(OFFER_ID), any())).thenReturn(reserved);
    }

    private void givenEmptyPage() {
        when(reservationRepository.findByUserId(eq(BUYER_ID), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));
    }

    private ReservationEntity capturedReservation() {
        ArgumentCaptor<ReservationEntity> captor = ArgumentCaptor.forClass(ReservationEntity.class);
        verify(reservationRepository).save(captor.capture());
        return captor.getValue();
    }

    private Pageable capturedPageable() {
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(reservationRepository).findByUserId(eq(BUYER_ID), captor.capture());
        return captor.getValue();
    }

    private ReservationNotificationEvent capturedEvent() {
        ArgumentCaptor<ReservationNotificationEvent> captor = ArgumentCaptor.forClass(ReservationNotificationEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        return captor.getValue();
    }
}
