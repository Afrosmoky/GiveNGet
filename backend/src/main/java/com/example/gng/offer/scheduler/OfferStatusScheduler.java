package com.example.gng.offer.scheduler;

import com.example.gng.offer.service.OfferService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class OfferStatusScheduler {

    private static final Logger logger = LoggerFactory.getLogger(OfferStatusScheduler.class);

    private final OfferService offerService;

    public OfferStatusScheduler(OfferService offerService) {
        this.offerService = offerService;
    }

    /**
     * Uruchamia się codziennie o 1:00 w nocy
     * Automatycznie dezaktywuje oferty z przekroczoną datą wygaśnięcia
     * i wysyła powiadomienia emailowe do autorów
     */
    @Scheduled(cron = "0 0 1 * * ?")
    public void deactivateExpiredOffers() {
        logger.info("Rozpoczęcie automatycznego dezaktywowania wygasłych ofert");

        try {
            offerService.deactivateExpiredOffers();
            logger.info("Zakończono automatyczne dezaktywowanie wygasłych ofert");
        } catch (Exception e) {
            logger.error("Błąd podczas automatycznego dezaktywowania wygasłych ofert: {}", e.getMessage(), e);
        }
    }
}
