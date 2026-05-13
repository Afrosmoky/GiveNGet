package com.example.gng.user.service;

import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.rates.repository.UserRateRepository;
import com.example.gng.user.entity.UserRank;
import com.example.gng.email.service.EmailSenderService;
import com.example.gng.mail_template.repository.MailTemplateRepository;
import com.example.gng.mail_template.model.MailTemplateEntity;
import com.example.gng.util.TemplateProcessor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class UserRankService {

    private static final Logger logger = LoggerFactory.getLogger(UserRankService.class);

    private final UserRepository userRepository;
    private final UserRateRepository userRateRepository;
    private final EmailSenderService emailSenderService;
    private final MailTemplateRepository mailTemplateRepository;

    public UserRankService(UserRepository userRepository,
                          UserRateRepository userRateRepository,
                          EmailSenderService emailSenderService,
                          MailTemplateRepository mailTemplateRepository) {
        this.userRepository = userRepository;
        this.userRateRepository = userRateRepository;
        this.emailSenderService = emailSenderService;
        this.mailTemplateRepository = mailTemplateRepository;
    }

    /**
     * Aktualizuje punkty zaufania użytkownika na podstawie oceny
     */
    @Transactional
    public void updateTrustPoints(UserModel user, int overallRating, boolean hasComment) {
        int pointsToAdd = calculateTrustPoints(overallRating, hasComment);
        user.setTrustPoints(user.getTrustPoints() + pointsToAdd);
        userRepository.save(user);

        logger.info("Zaktualizowano punkty zaufania dla użytkownika {}: {} (nowa suma: {})",
                   user.getEmail(), pointsToAdd, user.getTrustPoints());
    }

    /**
     * Oblicza punkty zaufania na podstawie oceny
     */
    private int calculateTrustPoints(int overallRating, boolean hasComment) {
        switch (overallRating) {
            case 5:
                return hasComment ? 10 : 5; // +10 PZ za 5⭐ z komentarzem, +5 za bez
            case 4:
                return 5; // +5 PZ za 4⭐
            case 3:
                return 0; // 0 PZ za 3⭐ (neutralna)
            case 2:
                return -10; // -10 PZ za 2⭐
            case 1:
                return -25; // -25 PZ za 1⭐
            default:
                return 0;
        }
    }

    /**
     * Oblicza średnią ocenę użytkownika
     */
    public double calculateAverageRating(Long userId) {
        List<Object[]> results = userRateRepository.findAverageRatingsByUserId(userId);
        if (results.isEmpty()) {
            return 0.0;
        }

        Object[] result = results.get(0);
        Double cleanliness = (Double) result[0];
        Double quality = (Double) result[1];
        Double transaction = (Double) result[2];

        if (cleanliness == null || quality == null || transaction == null) {
            return 0.0;
        }

        return (cleanliness + quality + transaction) / 3.0;
    }

    /**
     * Aktualizuje rangę użytkownika na podstawie średniej ocen i punktów zaufania
     */
    @Transactional
    public void updateUserRank(UserModel user) {
        double averageRating = calculateAverageRating(user.getId());
        int trustPoints = user.getTrustPoints();
        UserRank currentRank = user.getUserRank();

        // Znajdź najwyższą rangę, na którą użytkownik się kwalifikuje
        UserRank newRank = determineUserRank(averageRating, trustPoints);

        if (!newRank.equals(currentRank)) {
            user.setUserRank(newRank);
            user.setFreeOffersCount(newRank.getFreeOffersCount());
            userRepository.save(user);

            // Wyślij powiadomienie emailowe
            sendRankChangeNotification(user, currentRank, newRank, averageRating, trustPoints);

            logger.info("Zmieniono rangę użytkownika {} z {} na {}",
                       user.getEmail(), currentRank, newRank);
        }
    }

    /**
     * Określa rangę użytkownika na podstawie średniej ocen i punktów zaufania
     */
    private UserRank determineUserRank(double averageRating, int trustPoints) {
        // Sprawdź rangi od najwyższej do najniższej
        if (UserRank.AMBASSADOR.qualifies(averageRating, trustPoints)) {
            return UserRank.AMBASSADOR;
        } else if (UserRank.LOCAL_HERO.qualifies(averageRating, trustPoints)) {
            return UserRank.LOCAL_HERO;
        } else if (UserRank.TRUSTED_PARTNER.qualifies(averageRating, trustPoints)) {
            return UserRank.TRUSTED_PARTNER;
        } else if (UserRank.RELIABLE_SELLER.qualifies(averageRating, trustPoints)) {
            return UserRank.RELIABLE_SELLER;
        } else {
            return UserRank.STARTER;
        }
    }

    /**
     * Wysyła powiadomienie o zmianie rangi
     */
    private void sendRankChangeNotification(UserModel user, UserRank oldRank, UserRank newRank,
                                          double averageRating, int trustPoints) {
        try {
            String templateName;
            String subject;

            if (newRank.ordinal() > oldRank.ordinal()) {
                // Promocja
                templateName = "rank-promotion";
                subject = "🎉 Gratulacje! Awansowałeś!";
            } else {
                // Degradacja
                templateName = "rank-degradation";
                subject = "📉 Zmiana Rangi";
            }

            MailTemplateEntity template = mailTemplateRepository.findByName(templateName);
            if (template == null) {
                logger.error("Szablon emaila '{}' nie został znaleziony", templateName);
                return;
            }

            Map<String, String> tags = new HashMap<>();
            tags.put("username", user.getFirstName() + " " + user.getLastName());
            tags.put("newRank", newRank.getDisplayName());
            tags.put("averageRating", String.format("%.1f", averageRating));
            tags.put("trustPoints", String.valueOf(trustPoints));
            tags.put("benefits", getRankBenefits(newRank));

            String filledTemplate = TemplateProcessor.processTemplate(template.getTemplate(), tags);
            emailSenderService.sendEmail(user.getEmail(), subject, filledTemplate, null);

            logger.info("Wysłano powiadomienie o zmianie rangi do użytkownika {}", user.getEmail());

        } catch (Exception e) {
            logger.error("Błąd podczas wysyłania powiadomienia o zmianie rangi: {}", e.getMessage());
        }
    }

    /**
     * Zwraca korzyści dla danej rangi
     */
    private String getRankBenefits(UserRank rank) {
        switch (rank) {
            case STARTER:
                return "• 5 darmowych ogłoszeń";
            case RELIABLE_SELLER:
                return "• Większa widoczność ogłoszeń<br>• +5 darmowych ogłoszeń";
            case TRUSTED_PARTNER:
                return "• Odznaka profilu<br>• Promowane miejsce w wynikach<br>• Zniżka 20% na boosty";
            case LOCAL_HERO:
                return "• Priorytet w mapie i wyszukiwarce<br>• Statystyki \"ile uratowałeś jedzenia\"<br>• Darmowy boost raz w miesiącu";
            case AMBASSADOR:
                return "• Wyróżnienie na mapie jako Ambasador<br>• Zniżki 40% na wszystkie płatne funkcje<br>• Wcześniejszy dostęp do nowych opcji";
            default:
                return "";
        }
    }

    /**
     * Resetuje liczniki darmowych ofert dla wszystkich użytkowników (scheduler)
     */
    @Transactional
    public void resetFreeOffersCounters() {
        LocalDate currentDate = LocalDate.now();
        List<UserModel> users = userRepository.findAll();

        int resetCount = 0;
        for (UserModel user : users) {
            if (user.getLastOffersResetDate().isBefore(currentDate)) {
                user.setFreeOffersCount(user.getUserRank().getFreeOffersCount());
                user.setLastOffersResetDate(currentDate);
                userRepository.save(user);
                resetCount++;
            }
        }

        logger.info("Zresetowano liczniki darmowych ofert dla {} użytkowników", resetCount);
    }

    /**
     * Sprawdza czy użytkownik może utworzyć nową ofertę
     */
    public boolean canCreateOffer(UserModel user) {
        return user.getFreeOffersCount() > 0;
    }

    /**
     * Zmniejsza licznik darmowych ofert użytkownika
     */
    @Transactional
    public void decrementFreeOffersCount(UserModel user) {
        if (user.getFreeOffersCount() > 0) {
            user.setFreeOffersCount(user.getFreeOffersCount() - 1);
            userRepository.save(user);
            logger.info("Zmniejszono licznik darmowych ofert dla użytkownika {} (pozostało: {})",
                       user.getEmail(), user.getFreeOffersCount());
        }
    }
}
