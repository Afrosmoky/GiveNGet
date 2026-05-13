package com.example.gng.consultant.scheduler;

import com.example.gng.consultant.entity.ConsultantChatEntity;
import com.example.gng.consultant.repository.ConsultantChatRepository;
import com.example.gng.consultant.service.ConsultantChatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class ConsultantChatScheduler {

    private static final Logger logger = LoggerFactory.getLogger(ConsultantChatScheduler.class);

    private final ConsultantChatRepository consultantChatRepository;
    private final ConsultantChatService consultantChatService;

    public ConsultantChatScheduler(ConsultantChatRepository consultantChatRepository,
                                  ConsultantChatService consultantChatService) {
        this.consultantChatRepository = consultantChatRepository;
        this.consultantChatService = consultantChatService;
    }

    /**
     * Scheduler uruchamiany co 10 minut
     * Automatycznie zamyka sesje czatu z konsultantem, w których nie pojawiła się
     * nowa wiadomość od 30 minut
     */
    @Scheduled(cron = "0 */10 * * * ?") // Co 10 minut
    @Transactional
    public void closeInactiveChats() {
        logger.info("Rozpoczęcie zamykania nieaktywnych sesji czatu z konsultantem");

        try {
            // Pobierz wszystkie nieaktywne czaty (ostatnia wiadomość więcej niż 30 minut temu)
            LocalDateTime threshold = LocalDateTime.now().minusMinutes(30);
            List<ConsultantChatEntity> inactiveChats = consultantChatRepository.findInactiveChats(threshold);

            int closedCount = 0;
            for (ConsultantChatEntity chat : inactiveChats) {
                try {
                    consultantChatService.closeChatAutomatically(chat.getId());
                    closedCount++;
                } catch (Exception e) {
                    logger.error("Błąd podczas zamykania czatu {}: {}", chat.getId(), e.getMessage());
                }
            }

            logger.info("Zakończono zamykanie nieaktywnych sesji. Zamknięto {} sesji", closedCount);

        } catch (Exception e) {
            logger.error("Błąd podczas zamykania nieaktywnych sesji czatu z konsultantem: {}", e.getMessage(), e);
        }
    }
}

