package com.example.gng.ban.service;

import com.example.gng.ban.entity.UserBanEntity;
import com.example.gng.ban.enums.BanReason;
import com.example.gng.ban.repository.UserBanRepository;
import com.example.gng.email.service.EmailSenderService;
import com.example.gng.mail_template.model.MailTemplateEntity;
import com.example.gng.mail_template.repository.MailTemplateRepository;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.util.TemplateProcessor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class UserBanService {

    private final UserBanRepository userBanRepository;
    private final UserRepository userRepository;
    private final EmailSenderService emailSenderService;
    private final MailTemplateRepository mailTemplateRepository;

    @Value("${front.app.url:http://localhost:3000}")
    private String frontendUrl;

    public UserBanService(UserBanRepository userBanRepository,
                         UserRepository userRepository,
                         EmailSenderService emailSenderService,
                         MailTemplateRepository mailTemplateRepository) {
        this.userBanRepository = userBanRepository;
        this.userRepository = userRepository;
        this.emailSenderService = emailSenderService;
        this.mailTemplateRepository = mailTemplateRepository;
    }

    /**
     * Banuje użytkownika na określony czas
     * @param userId ID użytkownika do zbanowania
     * @param bannedById ID użytkownika (moderator/admin) który banuje
     * @param reasonCode Kod powodu bana (enum BanReason)
     * @param reason Opcjonalny dodatkowy opis (wymagany tylko dla BanReason.OTHER)
     * @param durationDays Czas trwania bana w dniach (null = ban permanentny)
     * @return Utworzony ban
     */
    @Transactional
    public UserBanEntity banUser(Long userId, Long bannedById, BanReason reasonCode, String reason, Integer durationDays) {
        UserModel user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User with id=" + userId + " not found"));

        UserModel bannedBy = userRepository.findById(bannedById)
                .orElseThrow(() -> new IllegalArgumentException("User with id=" + bannedById + " not found"));

        // Walidacja: jeśli powód wymaga opisu (OTHER), reason musi być podany
        if (reasonCode.requiresDescription() && (reason == null || reason.trim().isEmpty())) {
            throw new IllegalArgumentException("Powód 'Inne' wymaga dodatkowego opisu");
        }

        // Sprawdź czy użytkownik nie ma już aktywnego bana
        Optional<UserBanEntity> existingBan = userBanRepository.findActiveBanByUserId(userId, LocalDateTime.now());
        if (existingBan.isPresent()) {
            throw new IllegalStateException("Użytkownik ma już aktywny ban");
        }

        // Określ datę zakończenia bana
        LocalDateTime endDate = null;
        if (durationDays != null && durationDays > 0) {
            endDate = LocalDateTime.now().plusDays(durationDays);
        }
        // Jeśli endDate jest null (ban permanentny), sprawdź czy osoba banująca jest administratorem
        if (endDate == null && bannedBy.getType() != UserType.ADMIN) {
            throw new IllegalStateException("Tylko administrator może zbanować użytkownika permanentnie");
        }

        // Utwórz nowy ban
        UserBanEntity ban = new UserBanEntity();
        ban.setUser(user);
        ban.setBannedBy(bannedBy);
        ban.setReasonCode(reasonCode);
        ban.setReason(reasonCode == BanReason.OTHER ? reason : reasonCode.getDescription()); // Tylko dla OTHER zapisujemy reason
        ban.setStartDate(LocalDateTime.now());
        ban.setEndDate(endDate);

        UserBanEntity savedBan = userBanRepository.save(ban);

        // Wyślij email do użytkownika
        sendBanNotificationEmail(user, reasonCode, reason, savedBan.getEndDate());

        return savedBan;
    }

    /**
     * Sprawdza czy użytkownik ma aktywny ban
     * @param userId ID użytkownika
     * @return Optional z aktywnym banem lub pusty jeśli brak bana
     */
    public Optional<UserBanEntity> getActiveBan(Long userId) {
        return userBanRepository.findActiveBanByUserId(userId, LocalDateTime.now());
    }

    /**
     * Sprawdza czy użytkownik ma aktywny ban (prosta metoda boolean)
     * @param userId ID użytkownika
     * @return true jeśli użytkownik ma aktywny ban
     */
    public boolean isUserBanned(Long userId) {
        return getActiveBan(userId).isPresent();
    }

    /**
     * Odbanowuje użytkownika (usuwa aktywny ban)
     * @param userId ID użytkownika
     * @param unbannedById ID użytkownika który odbanowuje
     * @param reason Powód odbanowania
     */
    @Transactional
    public void unbanUser(Long userId, Long unbannedById, String reason) {
        Optional<UserBanEntity> activeBan = getActiveBan(userId);
        if (activeBan.isEmpty()) {
            throw new IllegalStateException("Użytkownik nie ma aktywnego bana");
        }

        // Ustaw endDate na teraz, aby zakończyć ban
        UserBanEntity ban = activeBan.get();
        ban.setEndDate(LocalDateTime.now());
        userBanRepository.save(ban);

        // Wyślij email do użytkownika
        UserModel user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User with id=" + userId + " not found"));
        sendUnbanNotificationEmail(user, reason != null ? reason : "Brak podanego powodu");
    }

    private void sendBanNotificationEmail(UserModel user, BanReason reasonCode, String reason, LocalDateTime endDate) {
        try {
            // Wybierz odpowiedni szablon w zależności od typu bana
            String templateName = (endDate != null) ? "ban-user-temporary" : "ban-user";
            MailTemplateEntity emailTemplate = mailTemplateRepository.findByName(templateName);
            if (emailTemplate == null) {
                throw new RuntimeException("Email template '" + templateName + "' not found");
            }

            // Przygotuj tekst powodu - użyj opisu z enum, a jeśli OTHER to użyj reason
            String reasonText = reasonCode.getDescription();
            if (reasonCode == BanReason.OTHER && reason != null && !reason.trim().isEmpty()) {
                reasonText = reason;
            }

            Map<String, String> tags = new HashMap<>();
            tags.put("username", user.getFirstName() + " " + user.getLastName());
            tags.put("reason", reasonText);
            
            if (endDate != null) {
                // Formatuj datę w czytelny sposób
                java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");
                tags.put("endDate", endDate.format(formatter));
                tags.put("duration", calculateDuration(LocalDateTime.now(), endDate));
            } else {
                tags.put("endDate", "permanentny");
                tags.put("duration", "permanentny");
            }

            String filledTemplate = TemplateProcessor.processTemplate(emailTemplate.getTemplate(), tags);
            String subject = "Konto zablokowane - GNG";

            emailSenderService.sendEmail(user.getEmail(), subject, filledTemplate, null);

        } catch (Exception e) {
            // Logujemy błąd ale nie przerywamy operacji banowania
            System.err.println("Błąd podczas wysyłania emaila do użytkownika " + user.getEmail() + ": " + e.getMessage());
        }
    }

    private void sendUnbanNotificationEmail(UserModel user, String reason) {
        try {
            MailTemplateEntity emailTemplate = mailTemplateRepository.findByName("unban-user");
            if (emailTemplate == null) {
                throw new RuntimeException("Email template 'unban-user' not found");
            }

            Map<String, String> tags = new HashMap<>();
            tags.put("username", user.getFirstName() + " " + user.getLastName());
            tags.put("reason", reason != null ? reason : "Brak podanego powodu");
            tags.put("loginLink", frontendUrl + "/login");
            tags.put("note", "Pamiętaj o przestrzeganiu regulaminu platformy.");

            String filledTemplate = TemplateProcessor.processTemplate(emailTemplate.getTemplate(), tags);
            String subject = "Konto odblokowane - GNG";

            emailSenderService.sendEmail(user.getEmail(), subject, filledTemplate, null);

        } catch (Exception e) {
            // Logujemy błąd ale nie przerywamy operacji odbanowania
            System.err.println("Błąd podczas wysyłania emaila do użytkownika " + user.getEmail() + ": " + e.getMessage());
        }
    }

    private String calculateDuration(LocalDateTime start, LocalDateTime end) {
        long days = java.time.temporal.ChronoUnit.DAYS.between(start, end);
        if (days == 1) {
            return "1 dzień";
        } else if (days < 7) {
            return days + " dni";
        } else if (days < 30) {
            long weeks = days / 7;
            return weeks + (weeks == 1 ? " tydzień" : " tygodni");
        } else {
            long months = days / 30;
            return months + (months == 1 ? " miesiąc" : " miesięcy");
        }
    }
}

