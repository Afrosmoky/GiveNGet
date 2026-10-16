package com.example.gng.store.service;

import com.example.gng.ban.service.UserBanService;
import com.example.gng.common.dto.PageParams;
import com.example.gng.common.dto.PageResponse;
import com.example.gng.common.exception.ResourceNotFoundException;
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
import org.hibernate.Hibernate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Publiczny profil sklepu i jego aktywne oferty (docs/08, pozycja 3).
 *
 * <p>Profil istnieje tylko dla zweryfikowanego, niezbanowanego konta COMPANY. Każdy inny
 * przypadek to ten sam 404 {@code STORE_NOT_FOUND}, żeby po kodach odpowiedzi nie dało się
 * odróżnić konta prywatnego od nieistniejącego.
 */
@Service
public class StoreProfileService {

    /**
     * Najnowsze najpierw, id jako tie-breaker — oferty z importu z Excela mają często
     * ten sam createdAt, a bez drugiego klucza strony by się nakładały (CLAUDE.md 6.4).
     */
    static final Sort OFFERS_SORT = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

    private final UserRepository userRepository;
    private final OfferRepository offerRepository;
    private final OfferService offerService;
    private final RatesService ratesService;
    private final UserBanService userBanService;

    public StoreProfileService(UserRepository userRepository,
                               OfferRepository offerRepository,
                               OfferService offerService,
                               RatesService ratesService,
                               UserBanService userBanService) {
        this.userRepository = userRepository;
        this.offerRepository = offerRepository;
        this.offerService = offerService;
        this.ratesService = ratesService;
        this.userBanService = userBanService;
    }

    @Transactional(readOnly = true)
    public StoreProfileDTO getProfile(Long companyId) {
        BusinessUserModel store = requirePublicStore(companyId);
        SimplyRatesDto rate = ratesService.getSimplyRate(store.getId());

        return new StoreProfileDTO(
                store.getId(),
                store.getCompanyName(),
                store.getAvatar() != null ? store.getAvatar().getFilePath() : null,
                store.getAddress(),
                store.getBio(),
                store.getLat(),
                store.getLon(),
                offerRepository.countByUser_IdAndStatus(store.getId(), OfferStatus.ACTIVE),
                new StoreProfileDTO.StoreRating(
                        rate.getRate() != null ? rate.getRate() : 0.0,
                        rate.getCount() != null ? rate.getCount() : 0L));
    }

    /** Wyłącznie oferty ACTIVE sklepu, paginowane i stabilnie posortowane. */
    @Transactional(readOnly = true)
    public PageResponse<OfferPreview> getActiveOffers(Long companyId, Integer page, Integer size) {
        BusinessUserModel store = requirePublicStore(companyId);
        Pageable pageable = PageParams.of(page, size, OFFERS_SORT);
        Page<OfferEntity> offers = offerRepository.findByUser_IdAndStatus(store.getId(), OfferStatus.ACTIVE, pageable);

        // Mapowanie wsadowe (ulubione, zajęte sztuki) — ta sama ścieżka co reszta list ofert
        return new PageResponse<>(
                offerService.toPreviews(offers.getContent()),
                offers.getNumber(),
                offers.getSize(),
                offers.getTotalElements(),
                offers.getTotalPages());
    }

    private BusinessUserModel requirePublicStore(Long companyId) {
        UserModel user = userRepository.findById(companyId)
                .orElseThrow(() -> ResourceNotFoundException.store(companyId));
        boolean publicStore = user.getType() == UserType.COMPANY
                && Boolean.TRUE.equals(user.getVerified())
                && !Boolean.TRUE.equals(user.getBanned())
                && user.getDeleteDate() == null
                && !userBanService.isUserBanned(user.getId());
        if (!publicStore || !(Hibernate.unproxy(user) instanceof BusinessUserModel store)) {
            throw ResourceNotFoundException.store(companyId);
        }
        return store;
    }
}
