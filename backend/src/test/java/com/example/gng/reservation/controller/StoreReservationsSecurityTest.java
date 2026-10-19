package com.example.gng.reservation.controller;

import com.example.gng.auth.filter.JwtAuthenticationFilter;
import com.example.gng.auth.service.CustomUserDetailsService;
import com.example.gng.auth.service.JwtService;
import com.example.gng.common.dto.PageResponse;
import com.example.gng.common.exception.BadRequestException;
import com.example.gng.config.CorsProperties;
import com.example.gng.config.SecurityConfig;
import com.example.gng.reservation.dto.StoreReservationDTO;
import com.example.gng.reservation.entity.ReservationStatus;
import com.example.gng.reservation.service.ReservationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * GET /api/v1/reservations/for-store → tylko ROLE_COMPANY, na prawdziwym {@link SecurityConfig}
 * i {@link JwtAuthenticationFilter} (jak StoreEmployeeControllerSecurityTest). Sprawdza też, że
 * literalna ścieżka nie wpada w /{id} i że odpowiedź nie niesie kodu odbioru.
 */
@WebMvcTest(ReservationController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, CorsProperties.class})
class StoreReservationsSecurityTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private ReservationService reservationService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private CustomUserDetailsService userDetailsService;

    @Test
    void allowedForCompany_withoutPickupCode() throws Exception {
        String token = tokenFor("sklep@example.com", "ROLE_COMPANY");
        when(reservationService.listForStore(eq("sklep@example.com"), eq("RESERVED"), eq(1), eq(10)))
                .thenReturn(new PageResponse<>(List.of(sampleDto()), 1, 10, 11, 2));

        mockMvc.perform(get("/api/v1/reservations/for-store?status=RESERVED&page=1&size=10")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value("RES1"))
                .andExpect(jsonPath("$.content[0].customerFirstName").value("Ola"))
                .andExpect(jsonPath("$.content[0].pickupCode").doesNotExist())
                .andExpect(jsonPath("$.content[0].qrPayload").doesNotExist())
                .andExpect(jsonPath("$.totalElements").value(11));
        verify(reservationService, never()).getOwned(any(), any());
    }

    @Test
    void forbiddenForRegularUser() throws Exception {
        assertForbidden("ROLE_USER");
    }

    @Test
    void forbiddenForStoreEmployee() throws Exception {
        assertForbidden("ROLE_STORE_EMPLOYEE");
    }

    @Test
    void forbiddenForAdmin() throws Exception {
        assertForbidden("ROLE_ADMIN");
    }

    @Test
    void rejectsAnonymous() throws Exception {
        mockMvc.perform(get("/api/v1/reservations/for-store"))
                .andExpect(status().isForbidden());
        verify(reservationService, never()).listForStore(any(), any(), any(), any());
    }

    @Test
    void invalidStatus_returns400InApiFormat() throws Exception {
        String token = tokenFor("sklep@example.com", "ROLE_COMPANY");
        when(reservationService.listForStore(eq("sklep@example.com"), eq("FOO"), any(), any()))
                .thenThrow(BadRequestException.invalidReservationStatus("FOO"));

        mockMvc.perform(get("/api/v1/reservations/for-store?status=FOO").header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_RESERVATION_STATUS"))
                .andExpect(jsonPath("$.details.status").value("FOO"))
                .andExpect(jsonPath("$.details.allowed[0]").value("RESERVED"));
    }

    private void assertForbidden(String role) throws Exception {
        String token = tokenFor("konto@example.com", role);
        mockMvc.perform(get("/api/v1/reservations/for-store").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
        verify(reservationService, never()).listForStore(any(), any(), any(), any());
    }

    /** Token, który prawdziwy filtr przyjmie jako konto o podanej roli. */
    private String tokenFor(String email, String role) {
        String token = "token-" + role;
        when(jwtService.extractUsername(token)).thenReturn(email);
        User user = new User(email, "x", List.of(new SimpleGrantedAuthority(role)));
        when(userDetailsService.loadUserByUsername(email)).thenReturn(user);
        when(jwtService.validateToken(eq(token), any())).thenReturn(true);
        return token;
    }

    private static StoreReservationDTO sampleDto() {
        LocalDateTime created = LocalDateTime.of(2026, 10, 16, 12, 0);
        return new StoreReservationDTO("RES1", ReservationStatus.RESERVED, 2, "OFFER1", "Chleb", null, "Ola",
                created, created.plusHours(24), null, null);
    }
}
