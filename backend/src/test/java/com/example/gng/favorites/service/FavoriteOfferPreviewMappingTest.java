package com.example.gng.favorites.service;

import com.example.gng.auth.service.SessionService;
import com.example.gng.favorites.entity.FavoriteOfferEntity;
import com.example.gng.favorites.repository.FavoriteOfferRepository;
import com.example.gng.offer.dto.OfferPreview;
import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.entity.TransactionType;
import com.example.gng.offer.repository.OfferRepository;
import com.example.gng.register.company.model.BusinessUserModel;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.reservation.repository.ReservationRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

/**
 * Kafelki w ulubionych mają te same pola sprzedawcy i ceny co listy z OfferService
 * (wspólny OfferPreviewSupport). Przed poprawką brakowało sellerId/sellerType/storeName,
 * więc badge sklepu na kafelku w ulubionych się nie pokazywał.
 */
class FavoriteOfferPreviewMappingTest {

    private static final String EMAIL = "user@test.pl";

    @Mock private FavoriteOfferRepository favoriteOfferRepository;
    @Mock private OfferRepository offerRepository;
    @Mock private UserRepository userRepository;
    @Mock private ReservationRepository reservationRepository;

    private AutoCloseable mocks;
    private MockedStatic<SessionService> session;
    private FavoriteOfferService service;
    private UserModel viewer;

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);
        service = new FavoriteOfferService(favoriteOfferRepository, offerRepository, userRepository, reservationRepository);
        session = mockStatic(SessionService.class);
        session.when(SessionService::getCurrentUserEmail).thenReturn(EMAIL);
        viewer = new UserModel();
        viewer.setId(8L);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(viewer));
        when(reservationRepository.sumOccupiedQuantityByOfferIds(anyCollection(), any())).thenReturn(List.of());
    }

    @AfterEach
    void tearDown() throws Exception {
        session.close();
        mocks.close();
    }

    @Test
    void favoriteTile_hasSellerAndDiscountLikeOtherLists() {
        BusinessUserModel company = new BusinessUserModel();
        company.setId(7L);
        company.setType(UserType.COMPANY);
        company.setCompanyName("Zielony Koszyk");

        OfferEntity offer = new OfferEntity();
        offer.setId("o1");
        offer.setName("Chleb");
        offer.setUser(company);
        offer.setTransactionType(TransactionType.sale);
        offer.setPrice(new BigDecimal("4.50"));
        offer.setOriginalPrice(new BigDecimal("7.99"));
        offer.setCurrency("PLN");
        offer.setQuantity(3);

        FavoriteOfferEntity favorite = new FavoriteOfferEntity();
        favorite.setUser(viewer);
        favorite.setOffer(offer);
        when(favoriteOfferRepository.findByUser(viewer)).thenReturn(List.of(favorite));

        OfferPreview preview = service.getFavoriteOffers().get(0);

        assertEquals(7L, preview.getSellerId());
        assertEquals(UserType.COMPANY, preview.getSellerType());
        assertEquals("Zielony Koszyk", preview.getStoreName());
        assertEquals(new BigDecimal("7.99"), preview.getOriginalPrice());
        assertEquals(44, preview.getDiscountPercent());
    }

    @Test
    void favoriteTile_privateSeller_hasNoStoreName() {
        UserModel person = new UserModel();
        person.setId(9L);
        person.setType(UserType.REGULAR);

        OfferEntity offer = new OfferEntity();
        offer.setId("o2");
        offer.setName("Zupa");
        offer.setUser(person);
        offer.setTransactionType(TransactionType.free);
        offer.setQuantity(1);

        FavoriteOfferEntity favorite = new FavoriteOfferEntity();
        favorite.setUser(viewer);
        favorite.setOffer(offer);
        when(favoriteOfferRepository.findByUser(viewer)).thenReturn(List.of(favorite));

        OfferPreview preview = service.getFavoriteOffers().get(0);

        assertEquals(9L, preview.getSellerId());
        assertNull(preview.getStoreName());
        assertNull(preview.getDiscountPercent());
    }
}
