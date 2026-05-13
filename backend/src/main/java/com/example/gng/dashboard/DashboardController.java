package com.example.gng.dashboard;

import com.example.gng.auth.service.SessionService;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.statistics.service.DashboardStatisticsService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api")
public class DashboardController {

    private final UserRepository userRepository;
    private final DashboardStatisticsService dashboardStatisticsService;

    @Autowired
    public DashboardController(UserRepository userRepository, DashboardStatisticsService dashboardStatisticsService) {
        this.userRepository = userRepository;
        this.dashboardStatisticsService = dashboardStatisticsService;
    }
    @GetMapping("/user/dashboard")
    public ResponseEntity<?> getUserDashboardWithSessionService() {
        try {
            // Używamy SessionService zamiast SecurityContextHolder
            String userEmail = SessionService.getCurrentUserEmail();

            UserModel user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("id", user.getId());
            userInfo.put("email", user.getEmail());
            userInfo.put("firstName", user.getFirstName());
            userInfo.put("lastName", user.getLastName());
            userInfo.put("verified", user.getVerified());
            userInfo.put("userRank", user.getUserRank());
            userInfo.put("trustPoints", user.getTrustPoints());
            userInfo.put("freeOffersCount", user.getFreeOffersCount());

            // Dodaj ścieżkę do awatara jeśli użytkownik ma awatar
            if (user.getAvatar() != null) {
                userInfo.put("avatarUrl", user.getAvatar().getFilePath());
            }

            Map<String, Object> dashboardData = new HashMap<>();
            dashboardData.put("message", "Witamy w panelu użytkownika! (Używa SessionService)");
            dashboardData.put("user", userInfo);
            dashboardData.put("timestamp", System.currentTimeMillis());
            dashboardData.put("authorizationHeader", SessionService.getFullAuthorizationHeader() != null ? "Present" : "Not present");

            log.info("Company Dashboard accessed by user: {} (using SessionService)", userEmail);
            return ResponseEntity.ok(dashboardData);

        } catch (Exception e) {
            log.error("Błąd podczas dostępu do dashboardu użytkownika: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Błąd serwera");
        }
    }
    @GetMapping("/company/dashboard")
    public ResponseEntity<?> getCompanyDashboardWithSessionService() {
        try {
            // Używamy SessionService zamiast SecurityContextHolder
            String userEmail = SessionService.getCurrentUserEmail();

            if (userEmail == null || !SessionService.isUserLoggedIn()) {
                log.warn("Próba dostępu do dashboardu firm bez uwierzytelnienia");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Brak autoryzacji. Wymagane logowanie.");
            }

            UserModel user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("id", user.getId());
            userInfo.put("email", user.getEmail());
            userInfo.put("firstName", user.getFirstName());
            userInfo.put("lastName", user.getLastName());
            userInfo.put("verified", user.getVerified());
            userInfo.put("userRank", user.getUserRank());
            userInfo.put("trustPoints", user.getTrustPoints());
            userInfo.put("freeOffersCount", user.getFreeOffersCount());

            // Dodaj ścieżkę do awatara jeśli użytkownik ma awatar
            if (user.getAvatar() != null) {
                userInfo.put("avatarUrl", user.getAvatar().getFilePath());
            }

            Map<String, Object> dashboardData = new HashMap<>();
            dashboardData.put("message", "Witamy w panelu firmy! (Używa SessionService)");
            dashboardData.put("user", userInfo);
            dashboardData.put("timestamp", System.currentTimeMillis());
            dashboardData.put("authorizationHeader", SessionService.getFullAuthorizationHeader() != null ? "Present" : "Not present");

            log.info("User dashboard accessed by user: {} (using SessionService)", userEmail);
            return ResponseEntity.ok(dashboardData);

        } catch (Exception e) {
            log.error("Błąd podczas dostępu do dashboard: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Błąd serwera");
        }
    }

    @GetMapping("/company/dashboard-data")
    public ResponseEntity<?> getCompanyDashboardData() {
        try {
            String userEmail = SessionService.getCurrentUserEmail();

            if (userEmail == null || !SessionService.isUserLoggedIn()) {
                log.warn("Próba dostępu do danych dashboardu firmy bez uwierzytelnienia");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Brak autoryzacji. Wymagane logowanie.");
            }

            UserModel user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

            Map<String, Object> dashboardData = dashboardStatisticsService.getCompanyDashboardData(user.getId());

            log.info("Dashboard data accessed by user: {} (company: {})", userEmail, user.getId());
            return ResponseEntity.ok(dashboardData);

        } catch (Exception e) {
            log.error("Błąd podczas pobierania danych dashboardu firmy: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Błąd serwera");
        }
    }
}
