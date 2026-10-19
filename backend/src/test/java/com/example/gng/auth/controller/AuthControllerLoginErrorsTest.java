package com.example.gng.auth.controller;

import com.example.gng.auth.service.CustomUserDetailsService;
import com.example.gng.auth.service.JwtService;
import com.example.gng.ban.entity.UserBanEntity;
import com.example.gng.ban.enums.BanReason;
import com.example.gng.ban.service.UserBanService;
import com.example.gng.common.ratelimit.ClientIpResolver;
import com.example.gng.common.ratelimit.RateLimitProperties;
import com.example.gng.common.ratelimit.RateLimitResult;
import com.example.gng.common.ratelimit.TokenBucketRateLimiter;
import com.example.gng.config.GlobalExceptionHandler;
import com.example.gng.file.service.FileStorageService;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.user.register.model.RegularUserModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Błędy logowania w formacie 6.3 ({code, message, details}) przy niezmienionych statusach HTTP.
 * Klient (web i mobile) rozgałęzia się po {@code code}; stary klient po statusie działa dalej.
 */
class AuthControllerLoginErrorsTest {

    private static final String EMAIL = "jan@test.pl";

    private AuthenticationManager authenticationManager;
    private UserRepository userRepository;
    private UserBanService userBanService;
    private TokenBucketRateLimiter rateLimiter;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        authenticationManager = mock(AuthenticationManager.class);
        userRepository = mock(UserRepository.class);
        userBanService = mock(UserBanService.class);
        rateLimiter = mock(TokenBucketRateLimiter.class);
        when(rateLimiter.tryConsume(anyString(), any())).thenReturn(RateLimitResult.allow());

        AuthController controller = new AuthController(
                authenticationManager,
                mock(CustomUserDetailsService.class),
                mock(JwtService.class),
                userRepository,
                mock(FileStorageService.class),
                userBanService,
                rateLimiter,
                new RateLimitProperties(),
                mock(ClientIpResolver.class));

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void badCredentials_returns400WithInvalidCredentials() throws Exception {
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("x"));

        mockMvc.perform(login())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void notConfirmed_returns401WithAccountNotConfirmed() throws Exception {
        when(authenticationManager.authenticate(any())).thenThrow(new DisabledException("x"));

        mockMvc.perform(login())
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_NOT_CONFIRMED"));
    }

    @Test
    void temporaryBan_returns403WithUntilAndReason() throws Exception {
        LocalDateTime until = LocalDateTime.of(2026, 12, 1, 12, 0);
        givenActiveBan(BanReason.SPAM, null, until);

        mockMvc.perform(login())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_BANNED"))
                .andExpect(jsonPath("$.message").value("Twoje konto zostało zablokowane do 2026-12-01T12:00. Powód: Spam"))
                .andExpect(jsonPath("$.details.until").value("2026-12-01T12:00"))
                .andExpect(jsonPath("$.details.reason").value("Spam"));
    }

    @Test
    void permanentBan_hasNoUntilAndUsesCustomReasonForOther() throws Exception {
        givenActiveBan(BanReason.OTHER, "Oszustwa przy odbiorze", null);

        mockMvc.perform(login())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_BANNED"))
                .andExpect(jsonPath("$.details.until").doesNotExist())
                .andExpect(jsonPath("$.details.reason").value("Oszustwa przy odbiorze"));
    }

    @Test
    void unexpectedError_returns500WithoutInternalMessage() throws Exception {
        when(authenticationManager.authenticate(any())).thenThrow(new IllegalStateException("stack secret"));

        mockMvc.perform(login())
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.message").value("Błąd serwera podczas logowania."));
    }

    @Test
    void rateLimited_returns429WithRetryAfter() throws Exception {
        when(rateLimiter.tryConsume(anyString(), any())).thenReturn(RateLimitResult.deny(30));

        mockMvc.perform(login())
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "30"))
                .andExpect(jsonPath("$.code").value("RATE_LIMIT_EXCEEDED"))
                .andExpect(jsonPath("$.details.retryAfterSeconds").value(30));
    }

    private void givenActiveBan(BanReason reasonCode, String reason, LocalDateTime endDate) {
        RegularUserModel user = new RegularUserModel();
        user.setId(5L);
        user.setEmail(EMAIL);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        UserBanEntity ban = new UserBanEntity();
        ban.setReasonCode(reasonCode);
        ban.setReason(reason);
        ban.setEndDate(endDate);
        when(userBanService.getActiveBan(5L)).thenReturn(Optional.of(ban));
    }

    private static MockHttpServletRequestBuilder login() {
        return post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + EMAIL + "\",\"password\":\"Haslo123!\"}");
    }
}
