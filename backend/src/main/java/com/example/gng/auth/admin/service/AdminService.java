package com.example.gng.auth.admin.service;

import com.example.gng.auth.admin.dto.UserListDTO;
import com.example.gng.auth.admin.dto.UserListResponseDTO;
import com.example.gng.auth.admin.dto.UserStatsDTO;
import com.example.gng.email.service.EmailSenderService;
import com.example.gng.mail_template.model.MailTemplateEntity;
import com.example.gng.mail_template.repository.MailTemplateRepository;
import com.example.gng.moderation.dto.ForbiddenPatternItemDTO;
import com.example.gng.moderation.dto.ForbiddenPatternsResponseDTO;
import com.example.gng.moderation.dto.UpsertForbiddenPatternDTO;
import com.example.gng.moderation.entity.ForbiddenPatternEntity;
import com.example.gng.moderation.entity.ForbiddenPatternType;
import com.example.gng.moderation.repository.ForbiddenPatternRepository;
import com.example.gng.moderation.service.ForbiddenPatternCacheService;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.util.TemplateProcessor;
import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.repository.OfferRepository;
import com.example.gng.offer.repository.OfferImagesRepository;
import com.example.gng.image.model.ImageEntity;
import com.example.gng.image.repository.ImageModelRepository;
import com.example.gng.file.service.FileStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private final ForbiddenPatternRepository forbiddenPatternRepository;
    private final ForbiddenPatternCacheService cacheService;
    private final UserRepository userRepository;
    private final EmailSenderService emailSenderService;
    private final MailTemplateRepository mailTemplateRepository;
    private final OfferRepository offerRepository;
    private final OfferImagesRepository offerImagesRepository;
    private final ImageModelRepository imageModelRepository;
    private final FileStorageService fileStorageService;

    @Value("${front.app.url:http://localhost:3000}")
    private String frontendUrl;

    public AdminService(ForbiddenPatternRepository forbiddenPatternRepository,
                        ForbiddenPatternCacheService cacheService,
                        UserRepository userRepository,
                        EmailSenderService emailSenderService,
                        MailTemplateRepository mailTemplateRepository,
                        OfferRepository offerRepository,
                        OfferImagesRepository offerImagesRepository,
                        ImageModelRepository imageModelRepository,
                        FileStorageService fileStorageService) {
        this.forbiddenPatternRepository = forbiddenPatternRepository;
        this.cacheService = cacheService;
        this.userRepository = userRepository;
        this.emailSenderService = emailSenderService;
        this.mailTemplateRepository = mailTemplateRepository;
        this.offerRepository = offerRepository;
        this.offerImagesRepository = offerImagesRepository;
        this.imageModelRepository = imageModelRepository;
        this.fileStorageService = fileStorageService;
    }

    public ForbiddenPatternsResponseDTO getForbiddenPatterns() {
        var words = forbiddenPatternRepository.findByTypeAndActiveTrue(ForbiddenPatternType.WORD)
                .stream()
                .map(e -> new ForbiddenPatternItemDTO(e.getId(), e.getPattern(), e.getActive(), e.getCategory()))
                .collect(Collectors.groupingBy(item -> item.getCategory() == null ? "UNCATEGORIZED" : item.getCategory()));

        var regexes = forbiddenPatternRepository.findByTypeAndActiveTrue(ForbiddenPatternType.REGEX)
                .stream()
                .map(e -> new ForbiddenPatternItemDTO(e.getId(), e.getPattern(), e.getActive(), e.getCategory()))
                .collect(Collectors.groupingBy(item -> item.getCategory() == null ? "UNCATEGORIZED" : item.getCategory()));

        return new ForbiddenPatternsResponseDTO(words, regexes);
    }

    public void upsertForbiddenPatterns(List<UpsertForbiddenPatternDTO> items) {
        for (UpsertForbiddenPatternDTO dto : items) {
            if (dto.getId() == null) {
                // Nowy wpis
                ForbiddenPatternEntity e = new ForbiddenPatternEntity();
                e.setPattern(dto.getPattern());
                e.setType(dto.getType());
                e.setCategory(dto.getCategory());
                e.setActive(dto.getActive() == null || dto.getActive());
                forbiddenPatternRepository.save(e);
            } else {
                // Edycja lub usunięcie istniejącego
                ForbiddenPatternEntity e = forbiddenPatternRepository.findById(dto.getId()).orElse(null);
                if (e != null) {
                    if (Boolean.TRUE.equals(dto.get_delete())) {
                        // Usuń wpis
                        forbiddenPatternRepository.delete(e);
                    } else {
                        // Edytuj wpis
                        if (dto.getPattern() != null) e.setPattern(dto.getPattern());
                        if (dto.getType() != null) e.setType(dto.getType());
                        if (dto.getCategory() != null) e.setCategory(dto.getCategory());
                        if (dto.getActive() != null) e.setActive(dto.getActive());
                        forbiddenPatternRepository.save(e);
                    }
                }
            }
        }

        cacheService.evictAllForbiddenPatternsCache();
    }

    public void setForbiddenPatternActive(Integer id, boolean active) {
        ForbiddenPatternEntity entity = forbiddenPatternRepository.findById(id).orElse(null);
        if (entity == null) {
            throw new IllegalArgumentException("Forbidden pattern with id=" + id + " not found");
        }
        entity.setActive(active);
        forbiddenPatternRepository.save(entity);
        cacheService.evictAllForbiddenPatternsCache();
    }

    public UserStatsDTO getUserStats() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime oneDayAgo = now.minusDays(1);
        LocalDateTime oneWeekAgo = now.minusWeeks(1);
        LocalDateTime oneMonthAgo = now.minusMonths(1);

        // Statystyki wszystkich użytkowników
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByVerifiedTrueAndBannedFalse();
        long bannedUsers = userRepository.countByBannedTrue();

        // Statystyki firm
        long totalCompanies = userRepository.countByType(UserType.COMPANY);
        long activeCompanies = userRepository.countByTypeAndVerifiedTrueAndBannedFalse(UserType.COMPANY);
        long bannedCompanies = userRepository.countByTypeAndBannedTrue(UserType.COMPANY);

        // Statystyki rejestracji
        long dailyRegistrations = userRepository.countByCreateDateAfter(oneDayAgo);
        long weeklyRegistrations = userRepository.countByCreateDateAfter(oneWeekAgo);
        long monthlyRegistrations = userRepository.countByCreateDateAfter(oneMonthAgo);

        return new UserStatsDTO(
                new UserStatsDTO.UserCountStats(totalUsers, activeUsers, bannedUsers),
                new UserStatsDTO.UserCountStats(totalCompanies, activeCompanies, bannedCompanies),
                new UserStatsDTO.RegistrationStats(dailyRegistrations, weeklyRegistrations, monthlyRegistrations)
        );
    }

    public void banUser(Long userId, boolean banned, String reason) {
        UserModel user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            throw new IllegalArgumentException("User with id=" + userId + " not found");
        }
        user.setBanned(!banned);
        userRepository.save(user);

        // Wysyłanie emaila do użytkownika
        sendBanNotificationEmail(user, banned, reason);
    }

    private void sendBanNotificationEmail(UserModel user, boolean banned, String reason) {
        try {
            String templateName = banned ? "unban-user" : "ban-user";
            MailTemplateEntity emailTemplate = mailTemplateRepository.findByName(templateName);

            if (emailTemplate == null) {
                throw new RuntimeException("Email template '" + templateName + "' not found");
            }

            Map<String, String> tags = new HashMap<>();
            tags.put("username", user.getFirstName() + " " + user.getLastName());
            tags.put("reason", reason != null ? reason : "Brak podanego powodu");

            if (banned) {
                // Dla odblokowania dodajemy link do logowania
                tags.put("loginLink", frontendUrl + "/login");
                tags.put("note", "Pamiętaj o przestrzeganiu regulaminu platformy.");
            }

            String filledTemplate = TemplateProcessor.processTemplate(emailTemplate.getTemplate(), tags);
            String subject = banned ? "Konto odblokowane - GNG" : "Konto zablokowane - GNG";

            emailSenderService.sendEmail(user.getEmail(), subject, filledTemplate, null);

        } catch (Exception e) {
            // Logujemy błąd ale nie przerywamy operacji banowania
            System.err.println("Błąd podczas wysyłania emaila do użytkownika " + user.getEmail() + ": " + e.getMessage());
        }
    }

    public UserListResponseDTO getUsers(int page, int size, String sortBy, String sortDirection, String searchTerm,
                                       String userType, Boolean verified, Boolean banned) {
        // Domyślne wartości
        if (size <= 0) size = 20;
        if (page < 0) page = 0;
        if (sortBy == null || sortBy.trim().isEmpty()) sortBy = "createDate";
        if (sortDirection == null || sortDirection.trim().isEmpty()) sortDirection = "desc";

        // Walidacja sortBy
        List<String> allowedSortFields = List.of("id", "firstName", "lastName", "email", "phoneNumber", "verified", "banned", "createDate");
        if (!allowedSortFields.contains(sortBy)) {
            sortBy = "createDate";
        }

        // Tworzenie Sort
        Sort.Direction direction = sortDirection.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Sort sort = Sort.by(direction, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        // Parsowanie userType
        UserType parsedUserType = null;
        if (userType != null && !userType.trim().isEmpty()) {
            try {
                parsedUserType = UserType.valueOf(userType.toUpperCase());
            } catch (IllegalArgumentException e) {
                // Jeśli nieprawidłowy typ, ignorujemy filtr
            }
        }

        // Wyszukiwanie z filtrami
        Page<UserModel> userPage;
        if (searchTerm != null && !searchTerm.trim().isEmpty() ||
            parsedUserType != null || verified != null || banned != null) {
            userPage = userRepository.findUsersWithFilters(
                searchTerm != null ? searchTerm.trim() : null,
                parsedUserType,
                verified,
                banned,
                pageable
            );
        } else {
            userPage = userRepository.findAll(pageable);
        }

        // Mapowanie na DTO
        List<UserListDTO> users = userPage.getContent().stream()
                .map(user -> new UserListDTO(
                        user.getId(),
                        user.getFirstName(),
                        user.getLastName(),
                        user.getEmail(),
                        user.getPhoneNumber(),
                        user.getVerified(),
                        user.getBanned(),
                        user.getCreateDate()
                ))
                .collect(Collectors.toList());

        return new UserListResponseDTO(
                users,
                userPage.getTotalElements(),
                userPage.getTotalPages(),
                userPage.getNumber(),
                userPage.getSize()
        );
    }

    @Transactional
    public void deleteOffer(String offerId, String reason) {
        OfferEntity offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new IllegalArgumentException("Oferta nie znaleziona"));

        // Sprawdź czy oferta nie została już usunięta (nie istnieje w bazie)
        if (offer == null) {
            throw new IllegalArgumentException("Oferta została już usunięta");
        }

        // Usuń powiązane obrazy
        List<com.example.gng.offer.entity.OfferImagesEntity> offerImages = offerImagesRepository.findByOffer(offer);
        for (com.example.gng.offer.entity.OfferImagesEntity offerImage : offerImages) {
            ImageEntity image = offerImage.getImage();
            
            // Usuń plik fizyczny
            try {
                fileStorageService.deleteFile(image.getFilePath());
            } catch (Exception e) {
                System.err.println("Błąd podczas usuwania pliku " + image.getFilePath() + ": " + e.getMessage());
            }
            
            // Usuń powiązanie i obraz z bazy
            offerImagesRepository.delete(offerImage);
            imageModelRepository.delete(image);
        }

        // Wyślij powiadomienie emailowe
        sendOfferDeletionEmail(offer.getUser(), offer.getName(), reason);

        // Usuń ofertę (cascade usunie pozostałe powiązania)
        offerRepository.delete(offer);
    }

    private void sendOfferDeletionEmail(UserModel user, String offerName, String reason) {
        try {
            MailTemplateEntity emailTemplate = mailTemplateRepository.findByName("delete-offer");

            if (emailTemplate == null) {
                throw new RuntimeException("Email template 'delete-offer' not found");
            }

            Map<String, String> tags = new HashMap<>();
            tags.put("username", user.getFirstName() + " " + user.getLastName());
            tags.put("reason", reason != null ? reason : "Brak podanego powodu");

            String filledTemplate = TemplateProcessor.processTemplate(emailTemplate.getTemplate(), tags);
            String subject = "Oferta usunięta - GNG";

            emailSenderService.sendEmail(user.getEmail(), subject, filledTemplate, null);

        } catch (Exception e) {
            // Logujemy błąd ale nie przerywamy operacji usuwania
            System.err.println("Błąd podczas wysyłania emaila do użytkownika " + user.getEmail() + ": " + e.getMessage());
        }
    }

    @Transactional
    public void blockOffer(String offerId, String reason) {
        OfferEntity offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new IllegalArgumentException("Oferta nie znaleziona"));

        // Sprawdź czy oferta nie jest już zablokowana
        if (offer.getStatus() == com.example.gng.offer.entity.OfferStatus.BLOCKED) {
            throw new IllegalArgumentException("Oferta jest już zablokowana");
        }

        // Ustaw status na BLOCKED
        offer.setStatus(com.example.gng.offer.entity.OfferStatus.BLOCKED);
        offerRepository.save(offer);

        // Wyślij powiadomienie emailowe
        sendOfferBlockingEmail(offer.getUser(), offer.getName(), reason);
    }

    private void sendOfferBlockingEmail(UserModel user, String offerName, String reason) {
        try {
            MailTemplateEntity emailTemplate = mailTemplateRepository.findByName("block-offer");

            if (emailTemplate == null) {
                throw new RuntimeException("Email template 'block-offer' not found");
            }

            Map<String, String> tags = new HashMap<>();
            tags.put("username", user.getFirstName() + " " + user.getLastName());
            tags.put("offerName", offerName);
            tags.put("reason", reason != null ? reason : "Brak podanego powodu");

            String filledTemplate = TemplateProcessor.processTemplate(emailTemplate.getTemplate(), tags);
            String subject = "Oferta zablokowana - GNG";

            emailSenderService.sendEmail(user.getEmail(), subject, filledTemplate, null);

        } catch (Exception e) {
            // Logujemy błąd ale nie przerywamy operacji blokowania
            System.err.println("Błąd podczas wysyłania emaila do użytkownika " + user.getEmail() + ": " + e.getMessage());
        }
    }
}


