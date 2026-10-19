package com.example.gng.reservation.notification;

import com.example.gng.notification.push.PushMessage;
import com.example.gng.notification.push.PushNotificationService;
import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.register.model.UserModel;
import com.example.gng.reservation.entity.ReservationEntity;
import com.example.gng.reservation.entity.ReservationStatus;
import com.example.gng.reservation.repository.ReservationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Scheduler wysyła push tylko po przejęciu claimu. Sama gwarancja „co najwyżej raz” wynika z
 * warunkowego UPDATE w bazie — sprawdza ją ReservationPushClaimIT na prawdziwym MySQL.
 */
class ReservationReminderServiceTest {

    // 19.10.2026 14:00 UTC = 16:00 w Warszawie
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 19, 14, 0);

    private ReservationRepository repository;
    private PushNotificationService pushService;
    private ReservationReminderService service;

    @BeforeEach
    void setUp() {
        repository = mock(ReservationRepository.class);
        pushService = mock(PushNotificationService.class);
        Clock clock = Clock.fixed(Instant.from(NOW.atOffset(ZoneOffset.UTC)), ZoneOffset.UTC);
        service = new ReservationReminderService(repository, pushService, 120, 30, clock);
    }

    @Test
    void expiryWarningLooksTwoHoursAheadAndSendsAfterClaim() {
        ReservationEntity reservation = reservation("R1", NOW.plusMinutes(90), "15:00", "20:00");
        when(repository.findExpiryWarningCandidates(NOW, NOW.plusMinutes(120))).thenReturn(List.of(reservation));
        when(repository.claimExpiryWarning("R1", NOW)).thenReturn(1);

        assertEquals(1, service.sendExpiryWarnings());

        ArgumentCaptor<PushMessage> message = ArgumentCaptor.forClass(PushMessage.class);
        verify(pushService).sendToUserAsync(eq(8L), message.capture());
        assertEquals("RESERVATION_EXPIRY_WARNING", message.getValue().type());
        assertEquals("Chleb: odbierz do 17:30, inaczej sztuki wrócą do sprzedaży.", message.getValue().body());
    }

    @Test
    void lostClaimMeansNoPush() {
        ReservationEntity reservation = reservation("R1", NOW.plusMinutes(90), "15:00", "20:00");
        when(repository.findExpiryWarningCandidates(any(), any())).thenReturn(List.of(reservation));
        // Inny przebieg / instancja przejęła wysyłkę pierwsza
        when(repository.claimExpiryWarning("R1", NOW)).thenReturn(0);

        assertEquals(0, service.sendExpiryWarnings());

        verify(pushService, never()).sendToUserAsync(anyLong(), any());
    }

    @Test
    void pickupReminderOnlyWhenWindowIsOpenAndClaimed() {
        ReservationEntity open = reservation("OPEN", NOW.plusHours(20), "15:00", "20:00");   // 16:00 — otwarte
        ReservationEntity closed = reservation("LATER", NOW.plusHours(20), "18:00", "21:00"); // jeszcze nie
        when(repository.findPickupReminderCandidates(NOW, NOW.minusMinutes(30))).thenReturn(List.of(open, closed));
        when(repository.claimPickupReminder("OPEN", NOW)).thenReturn(1);

        assertEquals(1, service.sendPickupReminders());

        verify(repository, never()).claimPickupReminder(eq("LATER"), any());
        ArgumentCaptor<PushMessage> message = ArgumentCaptor.forClass(PushMessage.class);
        verify(pushService).sendToUserAsync(eq(8L), message.capture());
        assertEquals("RESERVATION_PICKUP_REMINDER", message.getValue().type());
        assertEquals("/reservations?reservationId=OPEN", message.getValue().path());
    }

    @Test
    void closedWindowIsNotClaimedSoReminderCanFireLater() {
        ReservationEntity later = reservation("LATER", NOW.plusHours(20), "18:00", "21:00");
        when(repository.findPickupReminderCandidates(any(), any())).thenReturn(List.of(later));

        service.sendPickupReminders();

        // Bez claimu znacznik zostaje NULL — przypomnienie wyjdzie w kolejnym przebiegu po 18:00
        verify(repository, never()).claimPickupReminder(anyString(), any());
    }

    private static ReservationEntity reservation(String id, LocalDateTime expiresAt, String from, String to) {
        UserModel customer = new UserModel();
        customer.setId(8L);
        OfferEntity offer = new OfferEntity();
        offer.setName("Chleb");
        offer.setPickupDateFrom(from);
        offer.setPickupDateTo(to);
        ReservationEntity reservation = new ReservationEntity();
        reservation.setId(id);
        reservation.setUser(customer);
        reservation.setOffer(offer);
        reservation.setStatus(ReservationStatus.RESERVED);
        reservation.setQuantity(1);
        reservation.setCreatedAt(NOW.minusHours(2));
        reservation.setExpiresAt(expiresAt);
        return reservation;
    }
}
