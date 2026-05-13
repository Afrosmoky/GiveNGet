package com.example.gng.user.controller;

import com.example.gng.auth.service.SessionService;
import com.example.gng.offer.service.OfferService;
import com.example.gng.rates.service.RatesService;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.statistics.service.DashboardStatisticsService;
import com.example.gng.user.dto.UserData;
import com.example.gng.user.dto.UserOffersDto;
import com.example.gng.user.service.UserService;
import jakarta.validation.constraints.NotNull;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserService userService;
    private final OfferService offerService;
    private final RatesService ratesService;
    private final DashboardStatisticsService dashboardStatisticsService;
    private final UserRepository userRepository;

    @Autowired
    public ProfileController(UserService userService, OfferService offerService, RatesService ratesService,
                             DashboardStatisticsService dashboardStatisticsService, UserRepository userRepository) {
        this.userService = userService;
        this.offerService = offerService;
        this.ratesService = ratesService;
        this.dashboardStatisticsService = dashboardStatisticsService;
        this.userRepository = userRepository;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getProfileData(@PathVariable @NotNull Long userId,
                                            @RequestParam(defaultValue = "true") Boolean withOffers,
                                            @RequestParam(defaultValue = "true") Boolean withRate) {
        try {
            // Zapisz statystykę wyświetlenia profilu (tylko jeśli użytkownik jest zalogowany i nie przegląda własnego profilu)
            String currentUserEmail = SessionService.getCurrentUserEmail();
            if (currentUserEmail != null) {
                try {
                    UserModel currentUser = userRepository.findByEmail(currentUserEmail).orElse(null);
                    if (currentUser != null && !currentUser.getId().equals(userId)) {
                        dashboardStatisticsService.recordProfileView(userId, currentUser);
                    }
                } catch (Exception e) {
                    log.warn("Nie udało się zapisać statystyki wyświetlenia profilu użytkownika {}: {}", userId, e.getMessage());
                }
            }

            UserData user = userService.getUserData(userId);
            return ResponseEntity.ok(UserOffersDto.builder()
                    .userData(user)
                    .offers(withOffers ? offerService.getUserOffers(userId) : List.of())
                    .rate(withRate ? ratesService.getSimplyRate(userId) : null)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
