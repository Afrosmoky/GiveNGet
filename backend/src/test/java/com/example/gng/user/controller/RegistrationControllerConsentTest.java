package com.example.gng.user.controller;

import com.example.gng.config.GlobalExceptionHandler;
import com.example.gng.register.company.dto.RegisterCompanyDTO;
import com.example.gng.register.company.model.BusinessUserModel;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.user.consent.RegistrationConsentPolicy;
import com.example.gng.user.register.dto.RegisterUserDTO;
import com.example.gng.user.register.model.RegularUserModel;
import com.example.gng.user.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Rejestracja bez zgód musi wyjść z kontrolera jako 400 z kodem CONSENT_REQUIRED (CLAUDE.md 6.3).
 *
 * <p>Kontroler łapie każdy {@code Exception} i zamienia go na goły tekst — ten test pilnuje,
 * że błąd domenowy przechodzi obok tego catcha, oraz że flagi zgód bindują się z multipart.
 */
class RegistrationControllerConsentTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        UserService userService = mock(UserService.class);
        RegistrationConsentPolicy policy = new RegistrationConsentPolicy("1.0");
        // Serwis zastąpiony tylko w zakresie zapisu — reguła zgód działa naprawdę
        when(userService.registerUser(any(RegisterUserDTO.class), any())).thenAnswer(inv -> {
            policy.requireAndApply(inv.getArgument(0), new RegularUserModel());
            return true;
        });
        when(userService.registerCompany(any(RegisterCompanyDTO.class), any())).thenAnswer(inv -> {
            policy.requireAndApply(inv.getArgument(0), new BusinessUserModel());
            return true;
        });

        mockMvc = MockMvcBuilders
                .standaloneSetup(new RegistrationController(mock(UserRepository.class), userService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void registerUser_withoutConsent_returnsConsentRequiredInApiFormat() throws Exception {
        mockMvc.perform(userRequest())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CONSENT_REQUIRED"))
                .andExpect(jsonPath("$.details.missing[0]").value("terms"))
                .andExpect(jsonPath("$.details.missing[1]").value("privacy"));
    }

    @Test
    void registerCompany_withoutPrivacyConsent_returnsConsentRequired() throws Exception {
        mockMvc.perform(companyRequest().param("termsAccepted", "true"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CONSENT_REQUIRED"))
                .andExpect(jsonPath("$.details.missing[0]").value("privacy"));
    }

    @Test
    void registerUser_withConsent_isCreated() throws Exception {
        mockMvc.perform(userRequest().param("termsAccepted", "true").param("privacyAccepted", "true"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.activationEmailSent").value(true));
    }

    @Test
    void registerCompany_withConsent_isCreated() throws Exception {
        mockMvc.perform(companyRequest().param("termsAccepted", "true").param("privacyAccepted", "true"))
                .andExpect(status().isCreated());
    }

    private static MockMultipartHttpServletRequestBuilder userRequest() {
        return (MockMultipartHttpServletRequestBuilder) multipart("/api/registerUser")
                .param("firstName", "Jan")
                .param("lastName", "Kowalski")
                .param("email", "jan@example.com")
                .param("phoneNumber", "500600700")
                .param("password", "Haslo123!")
                .param("address", "ul. Testowa 1, Warszawa, Polska")
                .param("lat", "52.23")
                .param("lon", "21.01")
                .param("dateOfBirth", "1990-01-01");
    }

    private static MockMultipartHttpServletRequestBuilder companyRequest() {
        return (MockMultipartHttpServletRequestBuilder) multipart("/api/registerCompany")
                .param("firstName", "Anna")
                .param("lastName", "Nowak")
                .param("email", "sklep@example.com")
                .param("phoneNumber", "500600701")
                .param("password", "Haslo123!")
                .param("address", "ul. Sklepowa 2, Kraków, Polska")
                .param("lat", "50.06")
                .param("lon", "19.94")
                .param("companyName", "Piekarnia Testowa");
    }
}
