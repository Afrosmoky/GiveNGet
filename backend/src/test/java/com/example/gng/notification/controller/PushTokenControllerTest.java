package com.example.gng.notification.controller;

import com.example.gng.auth.filter.JwtAuthenticationFilter;
import com.example.gng.auth.service.CustomUserDetailsService;
import com.example.gng.auth.service.JwtService;
import com.example.gng.chat.entity.FcmToken;
import com.example.gng.chat.service.FcmTokenService;
import com.example.gng.config.CorsProperties;
import com.example.gng.config.SecurityConfig;
import com.example.gng.notification.push.PushGateway;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** /api/v1/push/tokens na prawdziwym SecurityConfig: konto z JWT, walidacja w formacie 6.3. */
@WebMvcTest(PushTokenController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, CorsProperties.class})
class PushTokenControllerTest {

    private static final String EMAIL = "ola@example.com";

    @Autowired private MockMvc mockMvc;

    @MockitoBean private FcmTokenService tokenService;
    @MockitoBean private UserRepository userRepository;
    @MockitoBean private PushGateway pushGateway;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private CustomUserDetailsService userDetailsService;

    @Test
    void registersTokenForAuthenticatedAccount() throws Exception {
        UserModel ola = givenUser();
        FcmToken saved = new FcmToken();
        saved.setValidUntil(LocalDateTime.of(2026, 11, 2, 12, 0));
        when(tokenService.register(eq(ola), eq("tok-123"), eq("tok-old"), eq("Chrome"))).thenReturn(saved);
        when(pushGateway.isEnabled()).thenReturn(true);

        mockMvc.perform(post("/api/v1/push/tokens")
                        .header("Authorization", "Bearer " + tokenFor("ROLE_USER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"tok-123\",\"previousToken\":\"tok-old\",\"deviceName\":\"Chrome\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deliveryEnabled").value(true))
                .andExpect(jsonPath("$.validUntil").value("2026-11-02T12:00:00"));
    }

    @Test
    void blankTokenIsRejectedInApiFormat() throws Exception {
        givenUser();

        mockMvc.perform(post("/api/v1/push/tokens")
                        .header("Authorization", "Bearer " + tokenFor("ROLE_USER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"  \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.details.fields.token").value("Token jest wymagany."));
        verify(tokenService, never()).register(any(), anyString(), any(), any());
    }

    @Test
    void anonymousCannotRegister() throws Exception {
        mockMvc.perform(post("/api/v1/push/tokens")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"tok-123\"}"))
                .andExpect(status().isForbidden());
        verify(tokenService, never()).register(any(), anyString(), any(), any());
    }

    @Test
    void unregisterIsIdempotent() throws Exception {
        UserModel ola = givenUser();
        when(tokenService.unregister(ola, "tok-123")).thenReturn(false);

        mockMvc.perform(delete("/api/v1/push/tokens")
                        .header("Authorization", "Bearer " + tokenFor("ROLE_COMPANY"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"tok-123\"}"))
                .andExpect(status().isNoContent());
        verify(tokenService).unregister(ola, "tok-123");
    }

    private UserModel givenUser() {
        UserModel user = new UserModel();
        user.setId(8L);
        user.setEmail(EMAIL);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        return user;
    }

    /** Token, który prawdziwy filtr przyjmie jako konto o podanej roli. */
    private String tokenFor(String role) {
        String token = "token-" + role;
        when(jwtService.extractUsername(token)).thenReturn(EMAIL);
        when(userDetailsService.loadUserByUsername(EMAIL))
                .thenReturn(new User(EMAIL, "x", List.of(new SimpleGrantedAuthority(role))));
        when(jwtService.validateToken(eq(token), any())).thenReturn(true);
        return token;
    }
}
