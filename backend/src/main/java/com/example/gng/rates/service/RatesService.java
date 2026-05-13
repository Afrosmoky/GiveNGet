package com.example.gng.rates.service;

import com.example.gng.rates.dto.AddRateDto;
import com.example.gng.rates.dto.FullRatesData;
import com.example.gng.rates.dto.RatesDto;
import com.example.gng.rates.dto.SimplyRatesDto;
import com.example.gng.rates.model.UserRateEntity;
import com.example.gng.rates.repository.UserRateRepository;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.user.service.UserRankService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@Service
public class RatesService {
    private final UserRateRepository userRateRepository;
    private final UserRepository userRepository;
    private final UserRankService userRankService;

    @Autowired
    public RatesService(UserRateRepository userRateRepository, UserRepository userRepository, UserRankService userRankService) {
        this.userRateRepository = userRateRepository;
        this.userRepository = userRepository;
        this.userRankService = userRankService;
    }

    public SimplyRatesDto getSimplyRate(Long userId) {
        long count = userRateRepository.countByUserId(userId);
        Double averageCleanliness = userRateRepository.findAverageCleanlinessByUserId(userId);
        Double averageQuality = userRateRepository.findAverageQualityByUserId(userId);
        Double averageTransactionRating = userRateRepository.findAverageTransactionRatingByUserId(userId);
        
        SimplyRatesDto dto = new SimplyRatesDto();
        dto.setCount(count);
        
        // Oblicz średnią ze wszystkich ocen z każdej kategorii
        if (Objects.nonNull(averageCleanliness) && Objects.nonNull(averageQuality) && Objects.nonNull(averageTransactionRating)) {
            double overallAverage = (averageCleanliness + averageQuality + averageTransactionRating) / 3.0;
            BigDecimal bd = BigDecimal.valueOf(overallAverage);
            bd = bd.setScale(2, RoundingMode.HALF_UP);
            dto.setRate(bd.doubleValue());
        }
        
        return dto;
    }

    public FullRatesData getFullRates(Long userId, Integer stars, Integer page) {
        if (Objects.nonNull(stars) && (stars < 1 || stars > 5)) {
            throw new IllegalArgumentException("Liczba gwiazdek musi być w zakresie od 1 do 5");
        }
        if (Objects.nonNull(page) && page < 0) {
            throw new IllegalArgumentException("Numer strony nie może być ujemny");
        }

        // Pobierz wszystkie oceny do liczenia statystyk
        List<UserRateEntity> allRates = userRateRepository.findByUserIdOrderByCreatedAtDesc(userId);
        FullRatesData fullRatesData = new FullRatesData();
        fillRates(allRates, fullRatesData);

        // Konfiguracja paginacji
        int pageSize = 10; // 10 obiektów na stronę
        int pageNumber = Objects.nonNull(page) ? page : 0;
        Pageable pageable = PageRequest.of(pageNumber, pageSize);

        // Pobierz oceny z paginacją
        Page<UserRateEntity> ratesPage;
        if (Objects.nonNull(stars)) {
            // Dla kompatybilności wstecznej, filtrujemy po czystości
            ratesPage = userRateRepository.findByUserIdAndCleanlinessOrderByCreatedAtDesc(userId, stars, pageable);
        } else {
            ratesPage = userRateRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        }

        List<RatesDto> rates = ratesPage.getContent()
                .stream()
                .map(rate -> {
                    RatesDto dto = new RatesDto();
                    dto.setCleanliness(rate.getCleanliness());
                    dto.setQuality(rate.getQuality());
                    dto.setTransactionRating(rate.getTransactionRating());
                    
                    // Oblicz średnią ocen z dokładnością do 2 miejsc po przecinku
                    double average = (rate.getCleanliness() + rate.getQuality() + rate.getTransactionRating()) / 3.0;
                    BigDecimal bd = BigDecimal.valueOf(average);
                    bd = bd.setScale(2, RoundingMode.HALF_UP);
                    dto.setAverageRating(bd.doubleValue());
                    
                    dto.setComment(rate.getComment());
                    dto.setCreatedAt(rate.getCreatedAt());
                    return dto;
                })
                .toList();
        fullRatesData.setRatesList(rates);

        // Uzupełnij informacje o paginacji
        fullRatesData.setCurrentPage(pageNumber);
        fullRatesData.setPageSize(pageSize);
        fullRatesData.setTotalPages(ratesPage.getTotalPages());
        fullRatesData.setTotalElements(ratesPage.getTotalElements());

        return fullRatesData;
    }

    private static void fillRates(List<UserRateEntity> allRates, FullRatesData fullRatesData) {
        for (UserRateEntity rate : allRates) {
            // Liczniki dla czystości
            switch (rate.getCleanliness()) {
                case 1:
                    fullRatesData.setCleanlinessOneStarCount(fullRatesData.getCleanlinessOneStarCount() + 1);
                    break;
                case 2:
                    fullRatesData.setCleanlinessTwoStarCount(fullRatesData.getCleanlinessTwoStarCount() + 1);
                    break;
                case 3:
                    fullRatesData.setCleanlinessThreeStarCount(fullRatesData.getCleanlinessThreeStarCount() + 1);
                    break;
                case 4:
                    fullRatesData.setCleanlinessFourStarCount(fullRatesData.getCleanlinessFourStarCount() + 1);
                    break;
                case 5:
                    fullRatesData.setCleanlinessFiveStarCount(fullRatesData.getCleanlinessFiveStarCount() + 1);
                    break;
            }
            
            // Liczniki dla jakości
            switch (rate.getQuality()) {
                case 1:
                    fullRatesData.setQualityOneStarCount(fullRatesData.getQualityOneStarCount() + 1);
                    break;
                case 2:
                    fullRatesData.setQualityTwoStarCount(fullRatesData.getQualityTwoStarCount() + 1);
                    break;
                case 3:
                    fullRatesData.setQualityThreeStarCount(fullRatesData.getQualityThreeStarCount() + 1);
                    break;
                case 4:
                    fullRatesData.setQualityFourStarCount(fullRatesData.getQualityFourStarCount() + 1);
                    break;
                case 5:
                    fullRatesData.setQualityFiveStarCount(fullRatesData.getQualityFiveStarCount() + 1);
                    break;
            }
            
            // Liczniki dla oceny transakcji
            switch (rate.getTransactionRating()) {
                case 1:
                    fullRatesData.setTransactionOneStarCount(fullRatesData.getTransactionOneStarCount() + 1);
                    break;
                case 2:
                    fullRatesData.setTransactionTwoStarCount(fullRatesData.getTransactionTwoStarCount() + 1);
                    break;
                case 3:
                    fullRatesData.setTransactionThreeStarCount(fullRatesData.getTransactionThreeStarCount() + 1);
                    break;
                case 4:
                    fullRatesData.setTransactionFourStarCount(fullRatesData.getTransactionFourStarCount() + 1);
                    break;
                case 5:
                    fullRatesData.setTransactionFiveStarCount(fullRatesData.getTransactionFiveStarCount() + 1);
                    break;
            }
        }
    }

    public void addRate(AddRateDto rate) {
        UserModel user = userRepository.findById(rate.getUserId())
                .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

        UserRateEntity userRateEntity = new UserRateEntity();
        userRateEntity.setCleanliness(rate.getCleanliness());
        userRateEntity.setQuality(rate.getQuality());
        userRateEntity.setTransactionRating(rate.getTransactionRating());
        userRateEntity.setComment(rate.getComment());
        userRateEntity.setCreatedAt(LocalDateTime.now());
        userRateEntity.setUser(user);
        userRateRepository.save(userRateEntity);

        // Oblicz średnią ocenę i zaktualizuj punkty zaufania
        double overallRating = (rate.getCleanliness() + rate.getQuality() + rate.getTransactionRating()) / 3.0;
        boolean hasComment = rate.getComment() != null && !rate.getComment().trim().isEmpty();
        userRankService.updateTrustPoints(user, (int) Math.round(overallRating), hasComment);
    }
}
