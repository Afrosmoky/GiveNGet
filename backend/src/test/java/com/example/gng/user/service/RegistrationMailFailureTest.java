package com.example.gng.user.service;

import com.example.gng.email.service.EmailSenderService;
import com.example.gng.file.service.FileStorageService;
import com.example.gng.mail_template.model.MailTemplateEntity;
import com.example.gng.mail_template.repository.MailTemplateRepository;
import com.example.gng.rates.repository.UserRateRepository;
import com.example.gng.register.company.dto.RegisterCompanyDTO;
import com.example.gng.register.company.model.BusinessUserModel;
import com.example.gng.register.company.repository.BusinessUserModelRepository;
import com.example.gng.register.company.repository.TagModelRepository;
import com.example.gng.register.model.RegisterCodeModel;
import com.example.gng.register.model.UserType;
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
import org.springframework.mail.MailAuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Wysyłka maila aktywacyjnego nie może przerwać rejestracji — błąd SMTP kończy się
 * utworzonym, niezweryfikowanym kontem i {@code activationEmailSent=false}.
 */
class RegistrationMailFailureTest {

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
                new RegistrationConsentPolicy("1.0"), "http://localhost:3000");

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

    private void smtpFails() {
        doThrow(new MailAuthenticationException("authentication failed"))
                .when(emailSenderService).sendEmail(anyString(), anyString(), anyString(), isNull());
    }

    @Test
    void registerUser_smtpFails_accountCreatedUnverified_andReportsMailNotSent() {
        smtpFails();

        boolean activationEmailSent = userService.registerUser(regularUserDto(), null);

        assertFalse(activationEmailSent);
        ArgumentCaptor<RegularUserModel> saved = ArgumentCaptor.forClass(RegularUserModel.class);
        verify(regularUserModelRepository).save(saved.capture());
        assertFalse(saved.getValue().getVerified());
        assertEquals(UserType.REGULAR, saved.getValue().getType());
        // Kod aktywacyjny zapisany przed wysyłką — ponowna wysyłka / aktywacja nadal możliwe
        verify(registerCodeModelRepository).save(any(RegisterCodeModel.class));
    }

    @Test
    void registerCompany_smtpFails_accountCreatedUnverified_andReportsMailNotSent() {
        smtpFails();

        boolean activationEmailSent = userService.registerCompany(companyDto(), null);

        assertFalse(activationEmailSent);
        ArgumentCaptor<BusinessUserModel> saved = ArgumentCaptor.forClass(BusinessUserModel.class);
        verify(businessUserModelRepository, atLeastOnce()).save(saved.capture());
        assertFalse(saved.getValue().getVerified());
        assertEquals(UserType.COMPANY, saved.getValue().getType());
        verify(registerCodeModelRepository).save(any(RegisterCodeModel.class));
    }

    @Test
    void registerUser_smtpWorks_reportsMailSent() {
        boolean activationEmailSent = userService.registerUser(regularUserDto(), null);

        assertTrue(activationEmailSent);
        verify(emailSenderService).sendEmail(eq("jan@example.com"), eq("Potwierdzenie rejestracji"), anyString(), isNull());
    }

    private RegisterUserDTO regularUserDto() {
        RegisterUserDTO dto = new RegisterUserDTO();
        dto.setEmail("jan@example.com");
        dto.setPassword("Haslo123!");
        dto.setFirstName("Jan");
        dto.setLastName("Kowalski");
        dto.setPhoneNumber("500600700");
        dto.setAddress("ul. Testowa 1, Warszawa, Polska");
        dto.setLat(new BigDecimal("52.23"));
        dto.setLon(new BigDecimal("21.01"));
        dto.setTermsAccepted(true);
        dto.setPrivacyAccepted(true);
        return dto;
    }

    private RegisterCompanyDTO companyDto() {
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
        dto.setTermsAccepted(true);
        dto.setPrivacyAccepted(true);
        return dto;
    }
}
