package com.example.gng.user.service;

import com.example.gng.common.exception.ApiException;
import com.example.gng.email.service.EmailSenderService;
import com.example.gng.file.service.FileStorageService;
import com.example.gng.mail_template.model.MailTemplateEntity;
import com.example.gng.mail_template.repository.MailTemplateRepository;
import com.example.gng.rates.repository.UserRateRepository;
import com.example.gng.register.company.dto.RegisterCompanyDTO;
import com.example.gng.register.company.model.BusinessUserModel;
import com.example.gng.register.company.repository.BusinessUserModelRepository;
import com.example.gng.register.company.repository.TagModelRepository;
import com.example.gng.register.dto.RegisterDTO;
import com.example.gng.register.model.RegisterCodeModel;
import com.example.gng.register.repository.RegisterCodeModelRepository;
import com.example.gng.register.repository.ResetPasswordCodeModelRepository;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.user.consent.RegistrationConsentPolicy;
import com.example.gng.user.register.dto.RegisterUserDTO;
import com.example.gng.user.register.model.RegularUserModel;
import com.example.gng.user.register.repository.RegularUserModelRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Obowiązkowe zgody przy rejestracji (docs/08, pozycja 2): bez kompletu zgód konto nie
 * powstaje, z kompletem — zapisuje wersję regulaminu i moment akceptacji w UTC.
 */
class RegistrationConsentTest {

    private static final String TERMS_VERSION = "1.0";

    /** 12:30 czasu warszawskiego (CEST) = 10:30 UTC — zegar w innej strefie niż zapis. */
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-09T10:30:00Z"), ZoneId.of("Europe/Warsaw"));
    private static final LocalDateTime NOW_UTC = LocalDateTime.of(2026, 10, 9, 10, 30);

    @Mock private EmailSenderService emailSenderService;
    @Mock private MailTemplateRepository mailTemplateRepository;
    @Mock private RegularUserModelRepository regularUserModelRepository;
    @Mock private BusinessUserModelRepository businessUserModelRepository;
    @Mock private TagModelRepository tagModelRepository;
    @Mock private UserRepository userRepository;
    @Mock private RegisterCodeModelRepository registerCodeModelRepository;
    @Mock private ResetPasswordCodeModelRepository resetPasswordCodeModelRepository;
    @Mock private UserRateRepository userRateRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private FileStorageService fileStorageService;

    private AutoCloseable mocks;
    private UserService userService;

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);
        userService = new UserService(emailSenderService, mailTemplateRepository, regularUserModelRepository,
                businessUserModelRepository, tagModelRepository, userRepository, registerCodeModelRepository,
                resetPasswordCodeModelRepository, userRateRepository, passwordEncoder, fileStorageService,
                new RegistrationConsentPolicy(TERMS_VERSION, CLOCK), "http://localhost:3000");

        MailTemplateEntity template = new MailTemplateEntity();
        template.setName("verifyEmail");
        template.setTemplate("Witaj ${user}, aktywuj konto: ${activationlink}");
        when(mailTemplateRepository.findByName("verifyEmail")).thenReturn(template);
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(registerCodeModelRepository.findByUser(any())).thenReturn(List.of());
        when(registerCodeModelRepository.save(any(RegisterCodeModel.class))).thenAnswer(inv -> inv.getArgument(0));
        when(regularUserModelRepository.save(any(RegularUserModel.class))).thenAnswer(inv -> inv.getArgument(0));
        when(businessUserModelRepository.save(any(BusinessUserModel.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @AfterEach
    void tearDown() throws Exception {
        mocks.close();
    }

    // ------------------------------------------------------------------
    // Bez zgody
    // ------------------------------------------------------------------

    @Test
    void registerUser_withoutConsent_isRejectedAndNothingIsSaved() {
        RegisterUserDTO dto = withConsents(regularUserDto(), null, null);

        ApiException ex = assertThrows(ApiException.class, () -> userService.registerUser(dto, null));

        assertEquals("CONSENT_REQUIRED", ex.getCode());
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals(List.of("terms", "privacy"), ex.getDetails().get("missing"));
        verify(regularUserModelRepository, never()).save(any());
        verifyNoInteractions(emailSenderService);
    }

    @Test
    void registerCompany_withoutConsent_isRejectedAndNothingIsSaved() {
        RegisterCompanyDTO dto = withConsents(companyDto(), false, false);

        ApiException ex = assertThrows(ApiException.class, () -> userService.registerCompany(dto, null));

        assertEquals("CONSENT_REQUIRED", ex.getCode());
        assertEquals(List.of("terms", "privacy"), ex.getDetails().get("missing"));
        verify(businessUserModelRepository, never()).save(any());
        verifyNoInteractions(emailSenderService);
    }

    @Test
    void partialConsent_isRejectedAndNamesTheMissingOne() {
        ApiException termsOnly = assertThrows(ApiException.class,
                () -> userService.registerUser(withConsents(regularUserDto(), true, false), null));
        assertEquals("CONSENT_REQUIRED", termsOnly.getCode());
        assertEquals(List.of("privacy"), termsOnly.getDetails().get("missing"));

        ApiException privacyOnly = assertThrows(ApiException.class,
                () -> userService.registerCompany(withConsents(companyDto(), null, true), null));
        assertEquals("CONSENT_REQUIRED", privacyOnly.getCode());
        assertEquals(List.of("terms"), privacyOnly.getDetails().get("missing"));

        verify(regularUserModelRepository, never()).save(any());
        verify(businessUserModelRepository, never()).save(any());
    }

    // ------------------------------------------------------------------
    // Ze zgodą
    // ------------------------------------------------------------------

    @Test
    void registerUser_withConsent_savesTermsVersionAndUtcTimestamps() {
        userService.registerUser(withConsents(regularUserDto(), true, true), null);

        ArgumentCaptor<RegularUserModel> saved = ArgumentCaptor.forClass(RegularUserModel.class);
        verify(regularUserModelRepository).save(saved.capture());
        assertEquals(TERMS_VERSION, saved.getValue().getTermsAcceptedVersion());
        assertEquals(NOW_UTC, saved.getValue().getTermsAcceptedAt());
        assertEquals(NOW_UTC, saved.getValue().getPrivacyAcceptedAt());
    }

    @Test
    void registerCompany_withConsent_savesTermsVersionAndUtcTimestamps() {
        userService.registerCompany(withConsents(companyDto(), true, true), null);

        ArgumentCaptor<BusinessUserModel> saved = ArgumentCaptor.forClass(BusinessUserModel.class);
        verify(businessUserModelRepository, atLeastOnce()).save(saved.capture());
        BusinessUserModel company = saved.getValue();
        assertEquals(TERMS_VERSION, company.getTermsAcceptedVersion());
        assertEquals(NOW_UTC, company.getTermsAcceptedAt());
        assertEquals(NOW_UTC, company.getPrivacyAcceptedAt());
    }

    @Test
    void termsVersionComesFromConfiguration() {
        userService = new UserService(emailSenderService, mailTemplateRepository, regularUserModelRepository,
                businessUserModelRepository, tagModelRepository, userRepository, registerCodeModelRepository,
                resetPasswordCodeModelRepository, userRateRepository, passwordEncoder, fileStorageService,
                new RegistrationConsentPolicy("2.1", CLOCK), "http://localhost:3000");

        userService.registerUser(withConsents(regularUserDto(), true, true), null);

        ArgumentCaptor<RegularUserModel> saved = ArgumentCaptor.forClass(RegularUserModel.class);
        verify(regularUserModelRepository).save(saved.capture());
        assertEquals("2.1", saved.getValue().getTermsAcceptedVersion());
    }

    // ------------------------------------------------------------------
    // Pomocnicze
    // ------------------------------------------------------------------

    private static <T extends RegisterDTO> T withConsents(T dto, Boolean terms, Boolean privacy) {
        dto.setTermsAccepted(terms);
        dto.setPrivacyAccepted(privacy);
        return dto;
    }

    private static RegisterUserDTO regularUserDto() {
        RegisterUserDTO dto = new RegisterUserDTO();
        dto.setEmail("jan@example.com");
        dto.setPassword("Haslo123!");
        dto.setFirstName("Jan");
        dto.setLastName("Kowalski");
        dto.setPhoneNumber("500600700");
        dto.setAddress("ul. Testowa 1, Warszawa, Polska");
        dto.setLat(new BigDecimal("52.23"));
        dto.setLon(new BigDecimal("21.01"));
        return dto;
    }

    private static RegisterCompanyDTO companyDto() {
        RegisterCompanyDTO dto = new RegisterCompanyDTO();
        dto.setEmail("sklep@example.com");
        dto.setPassword("Haslo123!");
        dto.setFirstName("Anna");
        dto.setLastName("Nowak");
        dto.setPhoneNumber("500600701");
        dto.setAddress("ul. Sklepowa 2, Kraków, Polska");
        dto.setLat(new BigDecimal("50.06"));
        dto.setLon(new BigDecimal("19.94"));
        dto.setCompanyName("Piekarnia Testowa");
        return dto;
    }
}
