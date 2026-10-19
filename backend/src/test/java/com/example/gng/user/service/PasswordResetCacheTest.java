package com.example.gng.user.service;

import com.example.gng.common.exception.BadRequestException;
import com.example.gng.email.service.EmailSenderService;
import com.example.gng.file.service.FileStorageService;
import com.example.gng.mail_template.repository.MailTemplateRepository;
import com.example.gng.rates.repository.UserRateRepository;
import com.example.gng.register.company.repository.BusinessUserModelRepository;
import com.example.gng.register.company.repository.TagModelRepository;
import com.example.gng.register.model.ResetPasswordCodeModel;
import com.example.gng.register.repository.RegisterCodeModelRepository;
import com.example.gng.register.repository.ResetPasswordCodeModelRepository;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.user.consent.RegistrationConsentPolicy;
import com.example.gng.user.register.model.RegularUserModel;
import com.example.gng.user.register.repository.RegularUserModelRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;

/**
 * Reset hasła musi zdjąć użytkownika z cache "users" (UserRepository.findByEmail, bez TTL).
 * Inaczej logowanie czyta zapamiętaną encję ze STARYM hashem: stare hasło działa dalej,
 * nowe nie — aż do restartu backendu. Test na prawdziwym proxy cache Springa, bo mock
 * nie sprawdziłby, że adnotacja w ogóle zadziała.
 */
@SpringJUnitConfig(PasswordResetCacheTest.Config.class)
class PasswordResetCacheTest {

    private static final String EMAIL = "jan@test.pl";

    @Configuration
    @EnableCaching
    static class Config {
        static final ResetPasswordCodeModelRepository RESET_CODES = mock(ResetPasswordCodeModelRepository.class);
        static final PasswordEncoder ENCODER = mock(PasswordEncoder.class);

        @Bean
        CacheManager cacheManager() {
            return new ConcurrentMapCacheManager("users");
        }

        @Bean
        UserService userService() {
            return new UserService(
                    mock(EmailSenderService.class), mock(MailTemplateRepository.class),
                    mock(RegularUserModelRepository.class), mock(BusinessUserModelRepository.class),
                    mock(TagModelRepository.class), mock(UserRepository.class),
                    mock(RegisterCodeModelRepository.class), RESET_CODES, mock(UserRateRepository.class),
                    ENCODER, mock(FileStorageService.class), new RegistrationConsentPolicy("1.0"),
                    "http://localhost:3000");
        }
    }

    @Autowired private UserService userService;
    @Autowired private CacheManager cacheManager;

    private Cache users;

    @BeforeEach
    void setUp() {
        reset(Config.RESET_CODES, Config.ENCODER);
        when(Config.ENCODER.encode(any())).thenReturn("nowy-hash");
        users = cacheManager.getCache("users");
        users.clear();
        users.put(EMAIL, Optional.of(new RegularUserModel()));
    }

    @Test
    void validCode_changesPasswordAndEvictsCachedUser() {
        RegularUserModel user = new RegularUserModel();
        user.setEmail(EMAIL);
        ResetPasswordCodeModel code = new ResetPasswordCodeModel();
        code.setUser(user);
        when(Config.RESET_CODES.findByCodeAndUsedFalseAndAddedAfter(eq("KOD"), any())).thenReturn(Optional.of(code));

        String result = userService.resetPassword("KOD", "NoweHaslo1!");

        assertEquals(EMAIL, result);
        assertEquals("nowy-hash", user.getPassword());
        assertNull(users.get(EMAIL), "po resecie logowanie musi przeczytać użytkownika z bazy");
    }

    @Test
    void invalidCode_throwsInvalidResetCodeAndLeavesCacheUntouched() {
        when(Config.RESET_CODES.findByCodeAndUsedFalseAndAddedAfter(eq("ZLY"), any())).thenReturn(Optional.empty());

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> userService.resetPassword("ZLY", "NoweHaslo1!"));

        assertEquals("INVALID_RESET_CODE", ex.getCode());
        assertNotNull(users.get(EMAIL));
        verify(Config.ENCODER, never()).encode(any());
    }
}
