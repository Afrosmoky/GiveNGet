package com.example.gng.user.service;

import com.example.gng.auth.service.SessionService;
import org.springframework.cache.annotation.CacheEvict;
import com.example.gng.email.service.EmailSenderService;
import com.example.gng.exceptions.InvalidRequestException;
import com.example.gng.exceptions.TooManyTagsException;
import com.example.gng.exceptions.UserAlreadyExistsException;
import com.example.gng.exceptions.UserNotFoundException;
import com.example.gng.exceptions.WrongPasswordException;
import com.example.gng.file.service.FileStorageService;
import com.example.gng.image.model.ImageEntity;
import com.example.gng.mail_template.model.MailTemplateEntity;
import com.example.gng.mail_template.repository.MailTemplateRepository;
import com.example.gng.register.company.model.BusinessUserModel;
import com.example.gng.register.company.model.SocialLinkModel;
import com.example.gng.register.company.model.TagModel;
import com.example.gng.rates.repository.UserRateRepository;
import com.example.gng.register.company.repository.BusinessUserModelRepository;
import com.example.gng.register.company.repository.TagModelRepository;
import com.example.gng.register.model.Currency;
import com.example.gng.register.model.Language;
import com.example.gng.register.model.RegisterCodeModel;
import com.example.gng.register.model.ResetPasswordCodeModel;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.RegisterCodeModelRepository;
import com.example.gng.register.repository.ResetPasswordCodeModelRepository;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.user.dto.ChangeEmailDto;
import com.example.gng.user.dto.ChangePasswordDto;
import com.example.gng.user.dto.UpdateUserInfoDTO;
import com.example.gng.user.dto.UpdateAddressDto;
import com.example.gng.register.company.dto.RegisterCompanyDTO;
import com.example.gng.user.dto.UserData;
import com.example.gng.user.register.dto.RegisterUserDTO;
import com.example.gng.user.register.model.RegularUserModel;
import com.example.gng.user.register.repository.RegularUserModelRepository;
import com.example.gng.util.TemplateProcessor;
import com.example.gng.util.UniqueIdGenerator;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
public class UserService {
    private static final String ACTIVATION_LINK_URL = "/activate/";
    private static final String RESET_PASSWORD_LINK_URL = "/reset-password/";
    private final EmailSenderService emailSenderService;
    private final MailTemplateRepository mailTemplateRepository;
    private final RegularUserModelRepository regularUserModelRepository;
    private final BusinessUserModelRepository businessUserModelRepository;
    private final TagModelRepository tagModelRepository;
    private final UserRepository userRepository;
    private final RegisterCodeModelRepository registerCodeModelRepository;
    private final ResetPasswordCodeModelRepository resetPasswordCodeModelRepository;
    private final UserRateRepository userRateRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileStorageService fileStorageService;
    private final String frontAppUrl;

    @Autowired
    public UserService(EmailSenderService emailSenderService, MailTemplateRepository mailTemplateRepository,
                       RegularUserModelRepository regularUserModelRepository, BusinessUserModelRepository businessUserModelRepository,
                       TagModelRepository tagModelRepository, UserRepository userRepository,
                       RegisterCodeModelRepository registerCodeModelRepository,
                       ResetPasswordCodeModelRepository resetPasswordCodeModelRepository, UserRateRepository userRateRepository,
                       PasswordEncoder passwordEncoder, FileStorageService fileStorageService,
                       @Value("${front.app.url}") String frontAppUrl) {
        this.emailSenderService = emailSenderService;
        this.mailTemplateRepository = mailTemplateRepository;
        this.regularUserModelRepository = regularUserModelRepository;
        this.businessUserModelRepository = businessUserModelRepository;
        this.tagModelRepository = tagModelRepository;
        this.userRepository = userRepository;
        this.registerCodeModelRepository = registerCodeModelRepository;
        this.resetPasswordCodeModelRepository = resetPasswordCodeModelRepository;
        this.userRateRepository = userRateRepository;
        this.passwordEncoder = passwordEncoder;
        this.fileStorageService = fileStorageService;
        this.frontAppUrl = frontAppUrl;
    }


    @CacheEvict(value = "users", key = "#result", condition = "#result != null")
    public String verifyUser(String code) {
        Optional<RegisterCodeModel> registerCodeModel =
                registerCodeModelRepository.findByCodeAndUsedFalseAndAddedAfter(code, LocalDateTime.now().minusDays(3));
        RegisterCodeModel model = registerCodeModel.orElseThrow(() -> new InvalidRequestException(""));
        UserModel user = model.getUser();
        user.setVerified(true);
        model.setUsed(true);
        userRepository.save(user);
        registerCodeModelRepository.delete(model);
        return user.getEmail();
    }

    public void sendVerifyEmail(UserModel user) {
        MailTemplateEntity emailTemplate = mailTemplateRepository.findByName("verifyEmail");
        String registerCode = prepareRegisterCode(user);
        Map<String, String> tags = prepareTagsForActivationMail(user, registerCode);
        String filledTemplate = TemplateProcessor.processTemplate(emailTemplate.getTemplate(), tags);
        //TODO zmiana przy dodaniu lokalizacji
        emailSenderService.sendEmail(user.getEmail(), "Potwierdzenie rejestracji", filledTemplate, null);
    }

    private void sendResetPasswordEmail(UserModel user) {
        MailTemplateEntity emailTemplate = mailTemplateRepository.findByName("reset-password");
        Map<String, String> tags = prepareTagsForResetPassword(user);
        String filledTemplate = TemplateProcessor.processTemplate(emailTemplate.getTemplate(), tags);
        //TODO zmiana przy dodaniu lokalizacji
        emailSenderService.sendEmail(user.getEmail(), "Reset hasła", filledTemplate, null);
    }

    //TODO przenieść do osobnego serwisu
    private String prepareRegisterCode(UserModel user) {
        RegisterCodeModel registerCodeModel = new RegisterCodeModel();
        registerCodeModel.setUser(user);
        registerCodeModel.setCode(UniqueIdGenerator.generateUniqueId(20));
        registerCodeModel.setAdded(LocalDateTime.now());
        try {
            List<RegisterCodeModel> userCodes = registerCodeModelRepository.findByUser(user);
            if (!userCodes.isEmpty()) {
                registerCodeModelRepository.deleteAll(userCodes);
            }
            RegisterCodeModel entity = registerCodeModelRepository.save(registerCodeModel);
            return entity.getCode();
        } catch (Exception e) {
            log.info(e.getMessage());
            throw new InvalidRequestException(e.getMessage());
        }
    }

    //TODO przenieść do osobnego serwisu
    private String prepareResetPasswordCode(UserModel user) {
        ResetPasswordCodeModel resetPasswordCodeModel = new ResetPasswordCodeModel();
        resetPasswordCodeModel.setUser(user);
        resetPasswordCodeModel.setCode(UniqueIdGenerator.generateUniqueId(20));
        resetPasswordCodeModel.setAdded(LocalDateTime.now());
        try {
            List<ResetPasswordCodeModel> resetPasswordCodes = resetPasswordCodeModelRepository.findByUser(user);
            if (!resetPasswordCodes.isEmpty()) {
                resetPasswordCodeModelRepository.deleteAll(resetPasswordCodes);
            }
            ResetPasswordCodeModel entity = resetPasswordCodeModelRepository.save(resetPasswordCodeModel);
            return entity.getCode();
        } catch (Exception e) {
            log.info(e.getMessage());
            throw new InvalidRequestException(e.getMessage());
        }
    }

    private Map<String, String> prepareTagsForActivationMail(UserModel registerUser, String registerCode) {
        Map<String, String> map = new HashMap<>();
        map.put("user", registerUser.getFirstName() + " " + registerUser.getLastName());
        map.put("activationlink", frontAppUrl + ACTIVATION_LINK_URL + registerCode);
        return map;
    }

    public void registerUser(RegisterUserDTO registerUserDTO, MultipartFile profilePhoto) {
        RegularUserModel regularUserModel = new RegularUserModel();
        regularUserModel.setEmail(registerUserDTO.getEmail());
        regularUserModel.setPassword(passwordEncoder.encode(registerUserDTO.getPassword()));
        regularUserModel.setVerified(false);
        regularUserModel.setType(UserType.REGULAR);
        regularUserModel.setAddress(registerUserDTO.getAddress());
        regularUserModel.setDateOfBirth(registerUserDTO.getDateOfBirth());
        regularUserModel.setFirstName(registerUserDTO.getFirstName());
        regularUserModel.setLastName(registerUserDTO.getLastName());
        regularUserModel.setPhoneNumber(registerUserDTO.getPhoneNumber());
        regularUserModel.setBio(registerUserDTO.getBio());
        fillDefaultValuesByLocation(regularUserModel, registerUserDTO.getAddress());
        regularUserModel.setLat(registerUserDTO.getLat());
        regularUserModel.setLon(registerUserDTO.getLon());

        RegularUserModel savedUser = null;
        try {
            savedUser = regularUserModelRepository.save(regularUserModel);
            setAvatar(profilePhoto, savedUser);
            sendVerifyEmail(savedUser);
        } catch (DataIntegrityViolationException e) {
            if (e.getMessage().contains("Duplicate entry")) {
                log.error(e.getMessage());
                throw new UserAlreadyExistsException("Konto o podanym adresie email już istnieje w naszej bazie danych. Spróbuj się zalogować lub użyj opcji przypomnienia hasła");
            }
            throw new RuntimeException("Wystąpił nieznany błąd. Spróbuj ponownie później lub skontaktuj się z administratorem");
        } catch (Exception e) {
            log.error(e.getMessage());
            throw new RuntimeException("Wystąpił nieznany błąd. Spróbuj ponownie później lub skontaktuj się z administratorem");
        }
    }

    private void fillDefaultValuesByLocation(RegularUserModel regularUserModel, String address) {

        //TODO baza danych krajów z ich domyślnymi językami i walutami
        String[] addressSplitted = address.split(",");
        String country = addressSplitted[addressSplitted.length - 1].trim();
        if (country.equalsIgnoreCase("Polska") || country.equalsIgnoreCase("Poland")) {
            regularUserModel.setLang(Language.pl.name());
            regularUserModel.setCurrency(Currency.PLN.name());
        } else if (country.equalsIgnoreCase("Wielka Brytania") || country.equalsIgnoreCase("United Kingdom")) {
            regularUserModel.setLang(Language.en.name());
            regularUserModel.setCurrency(Currency.GBP.name());
        } else  {
            regularUserModel.setLang(Language.en.name());
            regularUserModel.setCurrency(Currency.EUR.name());
        }

    }

    @Transactional
    public void registerCompany(RegisterCompanyDTO registerCompanyDTO, MultipartFile companyLogo) {
        BusinessUserModel businessUserModel = new BusinessUserModel();
        businessUserModel.setEmail(registerCompanyDTO.getEmail());
        businessUserModel.setPassword(passwordEncoder.encode(registerCompanyDTO.getPassword()));
        businessUserModel.setVerified(false);
        businessUserModel.setType(UserType.COMPANY);
        businessUserModel.setAddress(registerCompanyDTO.getAddress());
        businessUserModel.setFirstName(registerCompanyDTO.getFirstName());
        businessUserModel.setLastName(registerCompanyDTO.getLastName());
        businessUserModel.setPhoneNumber(registerCompanyDTO.getPhoneNumber());

        businessUserModel.setCompanyName(registerCompanyDTO.getCompanyName());
        businessUserModel.setBio(registerCompanyDTO.getCompanyDescription());
        businessUserModel.setCurrency(Currency.PLN.name());
        businessUserModel.setLang(Language.pl.name());
        businessUserModel.setLat(registerCompanyDTO.getLat());
        businessUserModel.setLon(registerCompanyDTO.getLon());

        BusinessUserModel savedUser = null;
        try {
            savedUser = businessUserModelRepository.save(businessUserModel);
        } catch (DataIntegrityViolationException e) {
            if (e.getMessage().contains("Duplicate entry")) {
                log.error(e.getMessage());
                throw new UserAlreadyExistsException("Konto o podanym adresie email już istnieje w naszej bazie danych. Spróbuj się zalogować lub użyj opcji przypomnienia hasła");
            }
            throw new RuntimeException("Wystąpił nieznany błąd. Spróbuj ponownie później lub skontaktuj się z administratorem");
        } catch (Exception e) {
            log.error(e.getMessage());
            throw new RuntimeException("Wystąpił nieznany błąd. Spróbuj ponownie później lub skontaktuj się z administratorem");
        }

        if (registerCompanyDTO.getTags() != null && !registerCompanyDTO.getTags().trim().isEmpty()) {
            Set<TagModel> tags = processTags(registerCompanyDTO.getTags());
            savedUser.setTags(tags);
        }

        String socialLinksString = registerCompanyDTO.getSocialLinks();
        List<SocialLinkModel> socialLinks = processSocialLinksFromString(socialLinksString, savedUser);
        if (!socialLinks.isEmpty()) {
            savedUser.setSocialLinks(socialLinks);
        }

        setAvatar(companyLogo, savedUser);

        savedUser = businessUserModelRepository.save(savedUser);

        sendVerifyEmail(savedUser);
    }

    Set<TagModel> processTags(String tagsString) { // package-private dla testów
        Set<TagModel> tags = new HashSet<>();

        if (tagsString == null || tagsString.trim().isEmpty()) {
            return tags;
        }

        String[] tagNames = tagsString.split(",");

        // Walidacja liczby tagów (maksymalnie 5)
        if (tagNames.length > 5) {
            throw new TooManyTagsException("Maksymalna liczba tagów to 5. Podano: " + tagNames.length);
        }

        for (String tagName : tagNames) {
            String trimmedTagName = tagName.trim();
            if (!trimmedTagName.isEmpty()) {
                // Walidacja długości nazwy tagu
                if (trimmedTagName.length() > 50) {
                    throw new TooManyTagsException("Tag '" + trimmedTagName + "' jest za długi. Maksymalna długość to 50 znaków.");
                }

                TagModel tag = tagModelRepository.findByTagName(trimmedTagName)
                        .orElseGet(() -> {
                            TagModel newTag = new TagModel();
                            newTag.setTagName(trimmedTagName);
                            return tagModelRepository.save(newTag);
                        });
                tags.add(tag);
            }
        }

        // Ostateczna walidacja liczby unikalnych tagów
        if (tags.size() > 5) {
            throw new TooManyTagsException("Maksymalna liczba unikalnych tagów to 5. Podano: " + tags.size());
        }

        return tags;
    }

    private List<SocialLinkModel> processSocialLinksFromString(String socialLinksString, BusinessUserModel businessUser) {
        List<SocialLinkModel> socialLinks = new ArrayList<>();

        if (socialLinksString == null || socialLinksString.trim().isEmpty()) {
            return socialLinks;
        }

        try {
            // Podział na poszczególne linki (oddzielone średnikiem)
            String[] linkPairs = socialLinksString.split(";");

            for (String linkPair : linkPairs) {
                String trimmedPair = linkPair.trim();
                if (!trimmedPair.isEmpty()) {
                    // Podział każdej pary na etykietę i URL (oddzielone przecinkiem)
                    String[] parts = trimmedPair.split(",", 2); // limit=2 żeby obsłużyć przecinki w URL

                    if (parts.length == 2) {
                        String label = parts[0].trim();
                        String url = parts[1].trim();

                        // Sprawdzenie czy oba pola nie są puste
                        if (!label.isEmpty() && !url.isEmpty()) {
                            SocialLinkModel socialLink = new SocialLinkModel();
                            socialLink.setPlatform(label);
                            socialLink.setUrl(url);
                            socialLink.setBusinessUser(businessUser);
                            socialLinks.add(socialLink);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Błąd podczas parsowania linków społecznościowych: {}", e.getMessage());
        }

        return socialLinks;
    }

    public String setAvatar(MultipartFile avatarPhoto) {
        String currentUserEmail = SessionService.getCurrentUserEmail();
        if (currentUserEmail != null) {
            Optional<UserModel> optUser = userRepository.findByEmail(currentUserEmail);
            if (optUser.isPresent()) {
                return setAvatar(avatarPhoto, optUser.get());
            }
        }
        throw new UserNotFoundException("User not found");
    }

    public String setAvatar(MultipartFile avatarPhoto, UserModel userModel) {
        if (avatarPhoto == null || avatarPhoto.isEmpty()) {
            log.info("Brak awatara dla użytkownika {}", userModel.getId());
            return null;
        }

        try {
            // Usuwamy stary awatar jeśli istnieje
            if (userModel.getAvatar() != null && userModel.getAvatar().getFilePath() != null) {
                fileStorageService.deleteFile(userModel.getAvatar().getFilePath());
            }

            // Zapisujemy plik używając FileStorageService
            String filePath = fileStorageService.saveProfilePicture(
                    userModel.getId(),
                    avatarPhoto
            );

            // Tworzymy model obrazu z ścieżką do pliku
            ImageEntity imageEntity = new ImageEntity();
            imageEntity.setFilePath(filePath);
            imageEntity.setAdded(LocalDateTime.now());
            imageEntity.setFileName(avatarPhoto.getOriginalFilename());
            imageEntity.setTypMime(avatarPhoto.getContentType());

            userModel.setAvatar(imageEntity);

            // Zapisujemy aktualizację użytkownika z nowym awatarem
            userRepository.save(userModel);

            log.info("Ustawiono awatar dla użytkownika {}: {}", userModel.getId(), filePath);
            return imageEntity.getFilePath();
        } catch (Exception e) {
            log.error("Błąd podczas zapisywania awatara dla użytkownika {}", userModel.getId(), e);
            // Nie przerywamy procesu z powodu błędu zdjęcia
        }
        return null;
    }

    // Metoda dla kompatybilności wstecznej z RegularUserModel (deprecated)
    @Deprecated
    public void setProfilePhoto(MultipartFile profilePhoto, RegularUserModel regularUserModel) {
        setAvatar(profilePhoto, regularUserModel);
    }

    public void removeAvatar() {
        String currentUserEmail = SessionService.getCurrentUserEmail();
        if (currentUserEmail != null) {
            Optional<UserModel> optUser = userRepository.findByEmail(currentUserEmail);
            optUser.ifPresent(this::removeAvatar);
        }
    }

    public void removeAvatar(UserModel userModel) {
        try {
            // Usuń plik awatara jeśli istnieje
            if (userModel.getAvatar() != null && userModel.getAvatar().getFilePath() != null) {
                fileStorageService.deleteFile(userModel.getAvatar().getFilePath());
            }

            // Ustaw avatar na null
            userModel.setAvatar(null);
            userRepository.save(userModel);

            log.info("Usunięto awatar dla użytkownika {}", userModel.getId());

        } catch (Exception e) {
            log.error("Błąd podczas usuwania awatara dla użytkownika {}", userModel.getId(), e);
            throw new RuntimeException("Nie można usunąć awatara", e);
        }
    }

    public Map<String, Object> getAvatarInfo() {
        String currentUserEmail = SessionService.getCurrentUserEmail();
        if (currentUserEmail != null) {
            Optional<UserModel> optUser = userRepository.findByEmail(currentUserEmail);
            if (optUser.isPresent()) {
                return getAvatarInfo(optUser.get());
            }
        }
        return new HashMap<>();
    }

    public Map<String, Object> getAvatarInfo(UserModel userModel) {
        Map<String, Object> avatarInfo = new HashMap<>();

        avatarInfo.put("userId", userModel.getId());
        avatarInfo.put("userEmail", userModel.getEmail());

        if (userModel.getAvatar() != null) {
            avatarInfo.put("hasAvatar", true);
            avatarInfo.put("avatarUrl", userModel.getAvatar().getFilePath());
            avatarInfo.put("fileName", userModel.getAvatar().getFileName());
            avatarInfo.put("mimeType", userModel.getAvatar().getTypMime());
            avatarInfo.put("uploadDate", userModel.getAvatar().getAdded());
        } else {
            avatarInfo.put("hasAvatar", false);
            avatarInfo.put("avatarUrl", null);
        }

        return avatarInfo;
    }

    @Scheduled(cron = "0 0 0 ? * SUN")
    public void removeOldCodes() {
        LocalDateTime date = LocalDateTime.now().minusWeeks(1);
        List<RegisterCodeModel> registerCodes = registerCodeModelRepository.findByAddedBefore(date);
        if (!registerCodes.isEmpty()) {
            registerCodeModelRepository.deleteAll(registerCodes);
        }
        List<ResetPasswordCodeModel> resetPasswordCodes = resetPasswordCodeModelRepository.findByAddedBefore(date);
        if (!resetPasswordCodes.isEmpty()) {
            resetPasswordCodeModelRepository.deleteAll(resetPasswordCodes);
        }
    }

    public void resetPassword(UserModel user) {
        sendResetPasswordEmail(user);
    }

    private Map<String, String> prepareTagsForResetPassword(UserModel user) {
        Map<String, String> tags = new HashMap<>();
        String code = prepareResetPasswordCode(user);
        tags.put("userName", user.getFirstName() + " " + user.getLastName());
        tags.put("resetLink", frontAppUrl + RESET_PASSWORD_LINK_URL + code);
        return tags;
    }

    public void resetPassword(String code, String password) {
        resetPasswordCodeModelRepository.findByCodeAndUsedFalseAndAddedAfter(code, LocalDateTime.now().minusDays(3))
                .ifPresent(resetPasswordCodeModel -> {
                    resetPasswordCodeModel.setUsed(true);
                    UserModel user = resetPasswordCodeModel.getUser();
                    user.setPassword(passwordEncoder.encode(password));
                    userRepository.save(user);
                    resetPasswordCodeModelRepository.delete(resetPasswordCodeModel);
                });
    }

    public void updateUserInfo(UpdateUserInfoDTO updateUserInfo) {
        String currentUserEmail = SessionService.getCurrentUserEmail();
        if (currentUserEmail != null) {
            Optional<UserModel> optUser = userRepository.findByEmail(currentUserEmail);
            if (optUser.isPresent()) {
                UserModel userModel = optUser.get();
                if (Objects.nonNull(updateUserInfo.firstName())) {
                    userModel.setFirstName(updateUserInfo.firstName());
                }
                if (Objects.nonNull(updateUserInfo.lastName())) {
                    userModel.setLastName(updateUserInfo.lastName());
                }
                if (Objects.nonNull(updateUserInfo.phoneNumber())) {
                    userModel.setPhoneNumber(updateUserInfo.phoneNumber());
                }
                if (Objects.nonNull(updateUserInfo.bio())) {
                    userModel.setBio(updateUserInfo.bio());
                }
                userRepository.save(userModel);
                return;
            }
        }
        throw new UserNotFoundException();
    }

    public void changePassword(ChangePasswordDto changePasswordDto) {
        String currentUserEmail = SessionService.getCurrentUserEmail();
        if (currentUserEmail != null) {
            Optional<UserModel> optUser = userRepository.findByEmail(currentUserEmail);
            if (optUser.isPresent()) {
                UserModel userModel = optUser.get();
                String currentPasswordFromDb = userModel.getPassword();
                if (passwordEncoder.matches(changePasswordDto.currentPassword(), currentPasswordFromDb)) {
                    userModel.setPassword(passwordEncoder.encode(changePasswordDto.newPassword()));
                    userRepository.save(userModel);
                    log.info("Hasło użytkownika {} zostało zmienione", userModel.getEmail());
                    sendResetPasswordNotificationEmail(userModel);
                } else {
                    throw new WrongPasswordException();
                }
                return;
            }
        }
        throw new UserNotFoundException();
    }

    public void changeEmail(ChangeEmailDto changeEmailDto) {
        String currentUserEmail = SessionService.getCurrentUserEmail();
        Optional<UserModel> optUser = userRepository.findByEmail(currentUserEmail);
        if (optUser.isPresent()) {
            UserModel userModel = optUser.get();
            String currentPasswordFromDb = userModel.getPassword();
            if (passwordEncoder.matches(changeEmailDto.currentPassword(), currentPasswordFromDb)) {
                userModel.setEmail(changeEmailDto.newEmail());
                userRepository.save(userModel);
                log.info("Email użytkownika {} został zmieniony na: {}", currentPasswordFromDb, userModel.getEmail());
                sendChangeEmailNotificationEmail(userModel, currentUserEmail);
            } else {
                throw new WrongPasswordException();
            }
        } else {
            throw new UserNotFoundException();
        }

    }

    private void sendResetPasswordNotificationEmail(UserModel user) {
        MailTemplateEntity template = mailTemplateRepository.findByName("change-password-notification");
        emailSenderService.sendEmail(user.getEmail(), "Twoje hasło zostało zmienione", template.getTemplate(), null);
    }

    private void sendChangeEmailNotificationEmail(UserModel user, String oldEmail) {
        try {
            MailTemplateEntity template = mailTemplateRepository.findByName("change-email-notification");
            if (template == null) {
                log.error("Szablon emaila 'change-email-notification' nie został znaleziony");
                return;
            }

            Map<String, String> tags = new HashMap<>();
            tags.put("username", user.getFirstName() + " " + user.getLastName());
            tags.put("oldEmail", oldEmail);
            tags.put("newEmail", user.getEmail());
            tags.put("changeDate", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm")));

            String filledTemplate = TemplateProcessor.processTemplate(template.getTemplate(), tags);
            String subject = "Zmiana adresu email - GNG";

            emailSenderService.sendEmail(oldEmail, subject, filledTemplate, null);
            log.info("Wysłano powiadomienie o zmianie emaila na stary adres: {}", oldEmail);
        } catch (Exception e) {
            log.error("Błąd podczas wysyłania powiadomienia o zmianie emaila na adres: {}", oldEmail, e);
        }
    }

    public UserData getUserData(Long userId) {
        UserData userData = new UserData();
        UserModel userModel = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("Użytkownik o podanym ID nie został znaleziony"));
        if (userModel.getType().equals(UserType.COMPANY)) {
            BusinessUserModel businessUserModel = businessUserModelRepository.findById(userModel.getId()).get();
            userData.setName(businessUserModel.getCompanyName());
            userData.setDescription(businessUserModel.getBio());
        } else {
            userData.setName(userModel.getFirstName() + " " + userModel.getLastName());
            userData.setDescription(userModel.getBio());
        }
        userData.setLogoUrl(userModel.getAvatar() != null ? userModel.getAvatar().getFilePath() : null);
        userData.setLocation(userModel.getAddress());
        userData.setLat(userModel.getLat());
        userData.setLon(userModel.getLon());
        userData.setUserType(userModel.getType());
        userData.setId(userModel.getId());
        userData.setUserRank(userModel.getUserRank());
        userData.setTrustPoints(userModel.getTrustPoints());
        userData.setFreeOffersCount(userModel.getFreeOffersCount());
        return userData;
    }

    /**
     * Zgłasza chęć usunięcia konta użytkownika
     * Ustawia deleteDate na 2 tygodnie od teraz
     */
    public void requestAccountDeletion() {
        String currentUserEmail = SessionService.getCurrentUserEmail();
        if (currentUserEmail != null) {
            Optional<UserModel> optUser = userRepository.findByEmail(currentUserEmail);
            if (optUser.isPresent()) {
                UserModel userModel = optUser.get();
                userModel.setDeleteDate(LocalDateTime.now().plusWeeks(2));
                userRepository.save(userModel);

                // Wysyłamy email z potwierdzeniem
                sendAccountDeletionEmail(userModel);

                log.info("Zgłoszono usunięcie konta dla użytkownika: {}", userModel.getEmail());
            }
        }
    }



    /**
     * Wysyła email z potwierdzeniem zgłoszenia usunięcia konta
     */
    private void sendAccountDeletionEmail(UserModel user) {
        try {
            MailTemplateEntity emailTemplate = mailTemplateRepository.findByName("delete-user");
            if (emailTemplate != null) {
                Map<String, String> tags = new HashMap<>();
                tags.put("userName", user.getFirstName() + " " + user.getLastName());
                tags.put("frontendAppUrl", frontAppUrl);

                String filledTemplate = TemplateProcessor.processTemplate(emailTemplate.getTemplate(), tags);
                emailSenderService.sendEmail(user.getEmail(), "Potwierdzenie zgłoszenia usunięcia konta", filledTemplate, null);
            }
        } catch (Exception e) {
            log.error("Błąd podczas wysyłania emaila o usunięciu konta dla użytkownika: {}", user.getEmail(), e);
        }
    }

    /**
     * Scheduler usuwający konta użytkowników o 1 w nocy
     * Usuwa wszystkie dane powiązane z użytkownikiem prócz czatów
     */
    @Scheduled(cron = "0 0 1 * * ?") // Codziennie o 1:00
    @Transactional
    public void deleteExpiredAccounts() {
        log.info("Rozpoczęto proces usuwania wygasłych kont użytkowników");

        LocalDateTime now = LocalDateTime.now();
        List<UserModel> usersToDelete = userRepository.findByDeleteDateBefore(now);

        for (UserModel user : usersToDelete) {
            try {
                deleteUserAccount(user);
                log.info("Usunięto konto użytkownika: {}", user.getEmail());
            } catch (Exception e) {
                log.error("Błąd podczas usuwania konta użytkownika: {}", user.getEmail(), e);
            }
        }

        log.info("Zakończono proces usuwania wygasłych kont. Usunięto {} kont.", usersToDelete.size());
    }

    /**
     * Usuwa konto użytkownika i wszystkie powiązane dane (prócz czatów)
     */
    @Transactional
    public void deleteUserAccount(UserModel user) {
        try {
            // Usuń awatar
            if (user.getAvatar() != null && user.getAvatar().getFilePath() != null) {
                fileStorageService.deleteFile(user.getAvatar().getFilePath());
            }

            // Usuń kody rejestracji i resetu hasła
            List<RegisterCodeModel> registerCodes = registerCodeModelRepository.findByUser(user);
            if (!registerCodes.isEmpty()) {
                registerCodeModelRepository.deleteAll(registerCodes);
            }

            List<ResetPasswordCodeModel> resetCodes = resetPasswordCodeModelRepository.findByUser(user);
            if (!resetCodes.isEmpty()) {
                resetPasswordCodeModelRepository.deleteAll(resetCodes);
            }

            // Usuń oceny użytkownika
            userRateRepository.deleteByUserId(user.getId());

            // Usuń oferty użytkownika
            // TODO: Dodać repozytorium dla ofert i usunąć oferty użytkownika

            // Usuń pliki użytkownika
            // TODO: Dodać repozytorium dla plików i usunąć pliki użytkownika

            // Usuń użytkownika (cascade powinno usunąć powiązane encje)
            userRepository.delete(user);

        } catch (Exception e) {
            log.error("Błąd podczas usuwania konta użytkownika: {}", user.getEmail(), e);
            throw new RuntimeException("Nie można usunąć konta użytkownika", e);
        }
    }

    /**
     * Aktualizuje adres aktualnie zalogowanego użytkownika
     */
    public void updateUserAddress(UpdateAddressDto updateAddressDto) {
        String currentUserEmail = SessionService.getCurrentUserEmail();
        if (currentUserEmail == null) {
            throw new UserNotFoundException("Użytkownik musi być zalogowany, aby zaktualizować adres");
        }

        Optional<UserModel> optUser = userRepository.findByEmail(currentUserEmail);
        if (optUser.isEmpty()) {
            throw new UserNotFoundException("Użytkownik nie znaleziony");
        }

        UserModel user = optUser.get();
        user.setAddress(updateAddressDto.getAddress());
        user.setLat(updateAddressDto.getLat());
        user.setLon(updateAddressDto.getLon());
        
        userRepository.save(user);
        
        log.info("Adres użytkownika {} został zaktualizowany: {} (lat: {}, lon: {})", 
                user.getEmail(), updateAddressDto.getAddress(), 
                updateAddressDto.getLat(), updateAddressDto.getLon());
    }
}
