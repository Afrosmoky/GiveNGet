package com.example.gng.user.scheduler;

import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.user.service.UserRankService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class UserRankScheduler {

    private static final Logger logger = LoggerFactory.getLogger(UserRankScheduler.class);

    private final UserRepository userRepository;
    private final UserRankService userRankService;

    public UserRankScheduler(UserRepository userRepository, UserRankService userRankService) {
        this.userRepository = userRepository;
        this.userRankService = userRankService;
    }

    /**
     * Scheduler uruchamiany codziennie o 1:00 w nocy
     * Aktualizuje rangi wszystkich użytkowników i resetuje liczniki ofert
     */
    @Scheduled(cron = "0 0 1 * * ?") // Codziennie o 1:00
    @Transactional
    public void updateUserRanks() {
        logger.info("Rozpoczęcie aktualizacji rang użytkowników");

        try {
            // Pobierz wszystkich użytkowników
            List<UserModel> users = userRepository.findAll();
            
            int updatedCount = 0;
            for (UserModel user : users) {
                try {
                    userRankService.updateUserRank(user);
                    updatedCount++;
                } catch (Exception e) {
                    logger.error("Błąd podczas aktualizacji rangi użytkownika {}: {}", 
                               user.getEmail(), e.getMessage());
                }
            }
            
            // Resetuj liczniki darmowych ofert
            userRankService.resetFreeOffersCounters();
            
            logger.info("Zakończono aktualizację rang. Przetworzono {} użytkowników", updatedCount);
            
        } catch (Exception e) {
            logger.error("Błąd podczas aktualizacji rang użytkowników: {}", e.getMessage(), e);
        }
    }
}
