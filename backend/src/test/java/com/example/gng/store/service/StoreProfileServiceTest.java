package com.example.gng.store.service;

import com.example.gng.ban.service.UserBanService;
import com.example.gng.common.dto.PageResponse;
import com.example.gng.common.exception.ApiException;
import com.example.gng.image.model.ImageEntity;
import com.example.gng.offer.dto.OfferPreview;
import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.entity.OfferStatus;
import com.example.gng.offer.repository.OfferRepository;
import com.example.gng.offer.service.OfferService;
import com.example.gng.rates.dto.SimplyRatesDto;
import com.example.gng.rates.service.RatesService;
import com.example.gng.register.company.model.BusinessUserModel;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.store.dto.StoreProfileDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Publiczny profil sklepu (docs/08, pozycja 3): tylko dane publiczne, tylko oferty ACTIVE,
 * paginacja i deterministyczny sort zgodnie z CLAUDE.md 6.4.
 */
class StoreProfileServiceTest {

    private static final Long STORE_ID = 7L;

    @Mock private UserRepository userRepository;
    @Mock private OfferRepository offerRepository;
    @Mock private OfferService offerService;
    @Mock private RatesService ratesService;
    @Mock private UserBanService userBanService;

    private AutoCloseable mocks;
    private StoreProfileService service;
    private BusinessUserModel store;

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);
        service = new StoreProfileService(userRepository, offerRepository, offerService, ratesService, userBanService);

        store = new BusinessUserModel();
        store.setId(STORE_ID);
        store.setType(UserType.COMPANY);
        store.setVerified(true);
        store.setBanned(false);
        store.setCompanyName("Piekarnia Testowa");
        store.setBio("Chleb na zakwasie");
        store.setAddress("Kraków, Rynek 1");
        store.setLat(new BigDecimal("50.064700"));
        store.setLon(new BigDecimal("19.945000"));
        // Dane wrażliwe — nie mogą trafić do odpowiedzi
        store.setEmail("wlasciciel@piekarnia.pl");
        store.setPhoneNumber("500600700");
        store.setPassword("$2a$10$hash");
        store.setFirstName("Anna");
        store.setLastName("Nowak");
        store.setFreeOffersCount(3);
        ImageEntity logo = new ImageEntity();
        logo.setFilePath("uploads/logo.png");
        store.setAvatar(logo);

        SimplyRatesDto rate = new SimplyRatesDto();
        rate.setRate(4.5);
        rate.setCount(12L);

        lenient().when(userRepository.findById(STORE_ID)).thenReturn(Optional.of(store));
        lenient().when(ratesService.getSimplyRate(STORE_ID)).thenReturn(rate);
        lenient().when(userBanService.isUserBanned(anyLong())).thenReturn(false);
        lenient().when(offerRepository.countByUser_IdAndStatus(STORE_ID, OfferStatus.ACTIVE)).thenReturn(5L);
        lenient().when(offerService.toPreviews(anyList())).thenAnswer(inv -> {
            List<OfferEntity> entities = inv.getArgument(0);
            return entities.stream().map(e -> {
                OfferPreview p = new OfferPreview();
                p.setId(e.getId());
                return p;
            }).toList();
        });
    }

    @AfterEach
    void tearDown() throws Exception {
        mocks.close();
    }

    // ------------------------------------------------------------------
    // Profil
    // ------------------------------------------------------------------

    @Test
    void profile_containsPublicStoreData() {
        StoreProfileDTO dto = service.getProfile(STORE_ID);

        assertEquals(STORE_ID, dto.id());
        assertEquals("Piekarnia Testowa", dto.name());
        assertEquals("uploads/logo.png", dto.logoUrl());
        assertEquals("Kraków, Rynek 1", dto.address());
        assertEquals("Chleb na zakwasie", dto.description());
        assertEquals(new BigDecimal("50.064700"), dto.lat());
        assertEquals(new BigDecimal("19.945000"), dto.lon());
        assertEquals(5L, dto.activeOffersCount());
        assertEquals(4.5, dto.rating().average());
        assertEquals(12L, dto.rating().count());
    }

    @Test
    void profile_doesNotExposeSensitiveFields() throws Exception {
        Set<String> fields = Arrays.stream(StoreProfileDTO.class.getRecordComponents())
                .map(c -> c.getName())
                .collect(Collectors.toSet());
        assertEquals(Set.of("id", "name", "logoUrl", "address", "description", "lat", "lon",
                "activeOffersCount", "rating"), fields, "nowe pole w publicznym DTO wymaga świadomej decyzji");

        String json = new ObjectMapper().writeValueAsString(service.getProfile(STORE_ID));
        for (String secret : List.of("wlasciciel@piekarnia.pl", "500600700", "$2a$10$hash", "Anna", "Nowak",
                "email", "phone", "password", "freeOffersCount", "trustPoints")) {
            assertFalse(json.contains(secret), () -> "odpowiedź zawiera „" + secret + "”: " + json);
        }
    }

    @Test
    void notAPublicStore_isNotFoundWithTheSameCode() {
        assertStoreNotFound(99L, s -> when(userRepository.findById(99L)).thenReturn(Optional.empty()));

        UserModel regular = new UserModel();
        regular.setId(8L);
        regular.setType(UserType.REGULAR);
        regular.setVerified(true);
        assertStoreNotFound(8L, s -> when(userRepository.findById(8L)).thenReturn(Optional.of(regular)));

        assertStoreNotFound(STORE_ID, s -> store.setVerified(false));
        assertStoreNotFound(STORE_ID, s -> { store.setVerified(true); store.setBanned(true); });
        assertStoreNotFound(STORE_ID, s -> {
            store.setBanned(false);
            when(userBanService.isUserBanned(STORE_ID)).thenReturn(true);
        });
        assertStoreNotFound(STORE_ID, s -> {
            when(userBanService.isUserBanned(STORE_ID)).thenReturn(false);
            store.setDeleteDate(LocalDateTime.now().plusWeeks(2));
        });

        verify(offerRepository, never()).findByUser_IdAndStatus(anyLong(), any(), any());
    }

    // ------------------------------------------------------------------
    // Oferty
    // ------------------------------------------------------------------

    @Test
    void offers_queryOnlyActiveWithDeterministicSort() {
        when(offerRepository.findByUser_IdAndStatus(eq(STORE_ID), eq(OfferStatus.ACTIVE), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        service.getActiveOffers(STORE_ID, null, null);

        ArgumentCaptor<OfferStatus> status = ArgumentCaptor.forClass(OfferStatus.class);
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(offerRepository).findByUser_IdAndStatus(eq(STORE_ID), status.capture(), pageable.capture());
        assertEquals(OfferStatus.ACTIVE, status.getValue());
        assertEquals(Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")), pageable.getValue().getSort(),
                "klucz sortowania + id jako tie-breaker");
        assertEquals(0, pageable.getValue().getPageNumber());
        assertEquals(20, pageable.getValue().getPageSize());
    }

    @Test
    void offers_pageAndSizeAreNormalized() {
        when(offerRepository.findByUser_IdAndStatus(eq(STORE_ID), eq(OfferStatus.ACTIVE), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 100), 0));

        service.getActiveOffers(STORE_ID, -2, 500);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(offerRepository).findByUser_IdAndStatus(eq(STORE_ID), eq(OfferStatus.ACTIVE), pageable.capture());
        assertEquals(0, pageable.getValue().getPageNumber());
        assertEquals(100, pageable.getValue().getPageSize());
    }

    @Test
    void offers_returnPageEnvelopeInRepositoryOrder() {
        List<OfferEntity> pageContent = List.of(offer("c"), offer("b"), offer("a"));
        when(offerRepository.findByUser_IdAndStatus(eq(STORE_ID), eq(OfferStatus.ACTIVE), any()))
                .thenReturn(new PageImpl<>(pageContent, PageRequest.of(1, 3), 9));

        PageResponse<OfferPreview> result = service.getActiveOffers(STORE_ID, 1, 3);

        assertEquals(List.of("c", "b", "a"), result.content().stream().map(OfferPreview::getId).toList(),
                "kolejność z zapytania (sort w bazie) nie może zostać przemieszana przy mapowaniu");
        assertEquals(1, result.page());
        assertEquals(3, result.size());
        assertEquals(9, result.totalElements());
        assertEquals(3, result.totalPages());
    }

    @Test
    void offers_ofNonStore_areNotFound() {
        store.setType(UserType.REGULAR);

        ApiException ex = assertThrows(ApiException.class, () -> service.getActiveOffers(STORE_ID, 0, 20));

        assertEquals("STORE_NOT_FOUND", ex.getCode());
        verify(offerRepository, never()).findByUser_IdAndStatus(anyLong(), any(), any());
    }

    // ------------------------------------------------------------------
    // Pomocnicze
    // ------------------------------------------------------------------

    private void assertStoreNotFound(Long id, Consumer<Void> arrange) {
        arrange.accept(null);
        ApiException ex = assertThrows(ApiException.class, () -> service.getProfile(id));
        assertEquals("STORE_NOT_FOUND", ex.getCode());
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
    }

    private static OfferEntity offer(String id) {
        OfferEntity offer = new OfferEntity();
        offer.setId(id);
        offer.setStatus(OfferStatus.ACTIVE);
        return offer;
    }
}
