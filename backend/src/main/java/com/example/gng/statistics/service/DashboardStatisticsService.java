package com.example.gng.statistics.service;

import com.example.gng.chat.entity.ChatEntity;
import com.example.gng.chat.repository.ChatRepository;
import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.entity.OfferStatus;
import com.example.gng.offer.repository.OfferRepository;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.statistics.entity.MessageStatisticsEntity;
import com.example.gng.statistics.entity.OfferStatisticsEntity;
import com.example.gng.statistics.repository.MessageStatisticsRepository;
import com.example.gng.statistics.repository.OfferStatisticsRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
public class DashboardStatisticsService {

    private final OfferRepository offerRepository;
    private final OfferStatisticsRepository offerStatisticsRepository;
    private final MessageStatisticsRepository messageStatisticsRepository;
    private final UserRepository userRepository;
    private final ChatRepository chatRepository;

    public DashboardStatisticsService(OfferRepository offerRepository,
                                      OfferStatisticsRepository offerStatisticsRepository,
                                      MessageStatisticsRepository messageStatisticsRepository,
                                      UserRepository userRepository,
                                      ChatRepository chatRepository) {
        this.offerRepository = offerRepository;
        this.offerStatisticsRepository = offerStatisticsRepository;
        this.messageStatisticsRepository = messageStatisticsRepository;
        this.userRepository = userRepository;
        this.chatRepository = chatRepository;
    }

    /**
     * Zapisuje statystykę wyświetlenia oferty
     */
    @Transactional
    public void recordOfferView(String offerId, UserModel user) {
        try {
            OfferEntity offer = offerRepository.findById(offerId).orElse(null);
            if (offer == null) {
                log.warn("Nie można zapisać statystyki wyświetlenia - oferta {} nie istnieje", offerId);
                return;
            }

            OfferStatisticsEntity stats = new OfferStatisticsEntity();
            stats.setOffer(offer);
            stats.setUser(user);
            stats.setEventType(OfferStatisticsEntity.EventType.VIEW);
            offerStatisticsRepository.save(stats);
        } catch (Exception e) {
            log.error("Błąd podczas zapisywania statystyki wyświetlenia oferty {}", offerId, e);
        }
    }

    /**
     * Zapisuje statystykę kliknięcia w ofertę
     */
    @Transactional
    public void recordOfferClick(String offerId, UserModel user) {
        try {
            OfferEntity offer = offerRepository.findById(offerId).orElse(null);
            if (offer == null) {
                log.warn("Nie można zapisać statystyki kliknięcia - oferta {} nie istnieje", offerId);
                return;
            }

            OfferStatisticsEntity stats = new OfferStatisticsEntity();
            stats.setOffer(offer);
            stats.setUser(user);
            stats.setEventType(OfferStatisticsEntity.EventType.CLICK);
            offerStatisticsRepository.save(stats);
        } catch (Exception e) {
            log.error("Błąd podczas zapisywania statystyki kliknięcia oferty {}", offerId, e);
        }
    }

    /**
     * Zapisuje statystykę wyświetlenia profilu
     */
    @Transactional
    public void recordProfileView(Long profileOwnerId, UserModel viewer) {
        try {
            // Znajdź pierwszą ofertę użytkownika (dla powiązania statystyki z ofertą)
            List<OfferEntity> offers = offerRepository.findByUser(profileOwnerId);
            if (offers.isEmpty()) {
                log.warn("Nie można zapisać statystyki wyświetlenia profilu - użytkownik {} nie ma ofert", profileOwnerId);
                return;
            }

            OfferEntity firstOffer = offers.get(0);
            OfferStatisticsEntity stats = new OfferStatisticsEntity();
            stats.setOffer(firstOffer);
            stats.setUser(viewer);
            stats.setEventType(OfferStatisticsEntity.EventType.PROFILE_VIEW);
            offerStatisticsRepository.save(stats);
        } catch (Exception e) {
            log.error("Błąd podczas zapisywania statystyki wyświetlenia profilu użytkownika {}", profileOwnerId, e);
        }
    }

    /**
     * Zapisuje statystykę wiadomości
     */
    @Transactional
    public void recordMessage(Long senderId, Long recipientId, Long chatId) {
        try {
            UserModel sender = userRepository.findById(senderId).orElse(null);
            UserModel recipient = userRepository.findById(recipientId).orElse(null);
            ChatEntity chat = chatId != null ? chatRepository.findById(chatId).orElse(null) : null;

            if (sender == null || recipient == null) {
                log.warn("Nie można zapisać statystyki wiadomości - nadawca lub odbiorca nie istnieje (senderId: {}, recipientId: {})", senderId, recipientId);
                return;
            }

            MessageStatisticsEntity stats = new MessageStatisticsEntity();
            stats.setSender(sender);
            stats.setRecipient(recipient);
            stats.setChat(chat);
            messageStatisticsRepository.save(stats);
        } catch (Exception e) {
            log.error("Błąd podczas zapisywania statystyki wiadomości od {} do {}", senderId, recipientId, e);
        }
    }

    /**
     * Pobiera dane statystyczne dla dashboardu firmy
     */
    public Map<String, Object> getCompanyDashboardData(Long userId) {
        Map<String, Object> result = new HashMap<>();

        // 1. Podsumowanie aktywności
        List<OfferEntity> allOffers = offerRepository.findByUser(userId);
        
        Map<String, Object> activitySummary = new HashMap<>();
        activitySummary.put("totalOffers", allOffers.size());
        activitySummary.put("activeOffers", (int) allOffers.stream()
                .filter(o -> o.getStatus() == OfferStatus.ACTIVE)
                .count());
        activitySummary.put("pendingOffers", (int) allOffers.stream()
                .filter(o -> o.getStatus() == OfferStatus.PENDING)
                .count());
        activitySummary.put("expiredOffers", (int) allOffers.stream()
                .filter(o -> o.getStatus() == OfferStatus.INACTIVE)
                .count());
        
        // Liczba wiadomości od użytkowników
        Long messageCount = messageStatisticsRepository.countByRecipientId(userId);
        activitySummary.put("messagesFromUsers", messageCount != null ? messageCount : 0L);
        
        // Liczba wyświetleń profilu i ogłoszeń
        Long profileViews = offerStatisticsRepository.countByUserIdAndEventType(userId, OfferStatisticsEntity.EventType.PROFILE_VIEW);
        Long offerViews = offerStatisticsRepository.countByUserIdAndEventType(userId, OfferStatisticsEntity.EventType.VIEW);
        Long totalViews = (profileViews != null ? profileViews : 0L) + (offerViews != null ? offerViews : 0L);
        activitySummary.put("totalViews", totalViews);
        
        result.put("activitySummary", activitySummary);

        // 2. Statystyki popularności ofert w czasie (ostatnie 30 dni)
        LocalDateTime startDate = LocalDateTime.now().minusDays(30);
        LocalDateTime endDate = LocalDateTime.now();
        
        List<OfferStatisticsEntity> recentStats = offerStatisticsRepository.findByUserIdAndDateRange(userId, startDate, endDate);
        
        // Grupuj po dniach
        Map<String, Long> popularityOverTime = new TreeMap<>();
        for (OfferStatisticsEntity stat : recentStats) {
            String dateKey = stat.getCreatedAt().toLocalDate().toString();
            popularityOverTime.put(dateKey, popularityOverTime.getOrDefault(dateKey, 0L) + 1);
        }
        result.put("popularityOverTime", popularityOverTime);

        // 3. CTR (Click-Through Rate) - kliknięcia vs wyświetlenia dla każdej oferty
        Map<String, Map<String, Object>> ctrData = new HashMap<>();
        for (OfferEntity offer : allOffers) {
            Long views = offerStatisticsRepository.countByOfferIdAndEventType(offer.getId(), OfferStatisticsEntity.EventType.VIEW);
            Long clicks = offerStatisticsRepository.countByOfferIdAndEventType(offer.getId(), OfferStatisticsEntity.EventType.CLICK);
            
            views = views != null ? views : 0L;
            clicks = clicks != null ? clicks : 0L;
            
            double ctr = views > 0 ? (clicks * 100.0 / views) : 0.0;
            
            Map<String, Object> offerCtr = new HashMap<>();
            offerCtr.put("offerId", offer.getId());
            offerCtr.put("offerName", offer.getName());
            offerCtr.put("views", views);
            offerCtr.put("clicks", clicks);
            offerCtr.put("ctr", Math.round(ctr * 100.0) / 100.0); // Zaokrąglenie do 2 miejsc po przecinku
            
            ctrData.put(offer.getId(), offerCtr);
        }
        result.put("ctrData", ctrData);

        return result;
    }
}
