package com.example.gng.reservation.service;

import com.example.gng.common.dto.PageResponse;
import com.example.gng.common.exception.BadRequestException;
import com.example.gng.common.exception.ForbiddenOperationException;
import com.example.gng.common.ratelimit.RateLimitProperties;
import com.example.gng.common.ratelimit.TokenBucketRateLimiter;
import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.repository.OfferRepository;
import com.example.gng.register.company.model.BusinessUserModel;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.reservation.dto.StoreReservationDTO;
import com.example.gng.reservation.entity.ReservationEntity;
import com.example.gng.reservation.entity.ReservationStatus;
import com.example.gng.reservation.repository.ReservationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.context.ApplicationEventPublisher;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Lista rezerwacji sklepu (docs/08 #8): rola sprawdzona w serwisie, zakres = oferty
 * wywołującej firmy, walidacja filtra statusu, stabilny sort i DTO bez sekretów klienta.
 * Semantykę filtra po statusie efektywnym w SQL sprawdza test na żywym stacku (curl) —
 * mock repozytorium jej nie dowiedzie.
 */
class StoreReservationListTest {

    private static final String STORE_EMAIL = "sklep@example.com";
    private static final Long STORE_ID = 7L;

    private ReservationRepository reservationRepository;
    private UserRepository userRepository;
    private ReservationService service;

    @BeforeEach
    void setUp() {
        reservationRepository = mock(ReservationRepository.class);
        userRepository = mock(UserRepository.class);
        service = new ReservationService(reservationRepository, mock(OfferRepository.class), userRepository,
                mock(PickupCodeGenerator.class), new TokenBucketRateLimiter(), new RateLimitProperties(),
                mock(ApplicationEventPublisher.class), 24, 5);

        BusinessUserModel store = new BusinessUserModel();
        store.setId(STORE_ID);
        store.setEmail(STORE_EMAIL);
        store.setType(UserType.COMPANY);
        when(userRepository.findByEmail(STORE_EMAIL)).thenReturn(Optional.of(store));
        when(reservationRepository.findForStore(anyLong(), any(), any(), any()))
                .thenAnswer(inv -> new PageImpl<>(List.of(), inv.getArgument(3), 0));
    }

    @Test
    void scopesToCallerStore_withStableSortAndCappedSize() {
        service.listForStore(STORE_EMAIL, null, 2, 500);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(reservationRepository).findForStore(eq(STORE_ID), isNull(), any(), pageable.capture());
        assertEquals(2, pageable.getValue().getPageNumber());
        assertEquals(100, pageable.getValue().getPageSize());
        assertEquals(Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")), pageable.getValue().getSort());
    }

    @Test
    void parsesStatusCaseInsensitively() {
        service.listForStore(STORE_EMAIL, " collected ", null, null);

        verify(reservationRepository).findForStore(eq(STORE_ID), eq(ReservationStatus.COLLECTED), any(), any());
    }

    @Test
    void unknownStatus_isBadRequest() {
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.listForStore(STORE_EMAIL, "FOO", null, null));

        assertEquals("INVALID_RESERVATION_STATUS", ex.getCode());
        verify(reservationRepository, never()).findForStore(anyLong(), any(), any(), any());
    }

    @Test
    void nonCompanyAccount_isForbidden() {
        UserModel regular = new UserModel();
        regular.setId(10L);
        regular.setType(UserType.REGULAR);
        when(userRepository.findByEmail("jan@example.com")).thenReturn(Optional.of(regular));

        assertThrows(ForbiddenOperationException.class, () -> service.listForStore("jan@example.com", null, null, null));
        verify(reservationRepository, never()).findForStore(anyLong(), any(), any(), any());
    }

    @Test
    void mapsCustomerFirstNameOnly_andReportsOverdueAsExpired() {
        UserModel customer = new UserModel();
        customer.setFirstName("Ola");
        customer.setLastName("Nowak");
        customer.setEmail("ola@example.com");
        customer.setPhoneNumber("500600700");
        OfferEntity offer = new OfferEntity();
        offer.setId("OFFER1");
        offer.setName("Chleb");

        ReservationEntity overdue = new ReservationEntity();
        overdue.setId("RES1");
        overdue.setOffer(offer);
        overdue.setUser(customer);
        overdue.setQuantity(2);
        overdue.setStatus(ReservationStatus.RESERVED);
        overdue.setPickupCode("ABC234");
        overdue.setCreatedAt(LocalDateTime.now(ZoneOffset.UTC).minusDays(2));
        overdue.setExpiresAt(LocalDateTime.now(ZoneOffset.UTC).minusHours(1));
        Page<ReservationEntity> page = new PageImpl<>(List.of(overdue));
        doReturn(page).when(reservationRepository).findForStore(anyLong(), any(), any(), any());

        PageResponse<StoreReservationDTO> result = service.listForStore(STORE_EMAIL, null, null, null);

        StoreReservationDTO dto = result.content().get(0);
        assertEquals("Ola", dto.customerFirstName());
        assertEquals(ReservationStatus.EXPIRED, dto.status());
        assertEquals("Chleb", dto.offerName());
        assertEquals(2, dto.quantity());
        assertNull(dto.collectedAt());
        // DTO nie ma pól pickupCode/qrPayload ani nazwiska, e-maila i telefonu klienta
        assertEquals(11, StoreReservationDTO.class.getRecordComponents().length);
    }
}
