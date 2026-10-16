package com.example.gng.store.controller;

import com.example.gng.auth.filter.JwtAuthenticationFilter;
import com.example.gng.auth.service.CustomUserDetailsService;
import com.example.gng.auth.service.JwtService;
import com.example.gng.common.dto.PageResponse;
import com.example.gng.config.CorsProperties;
import com.example.gng.config.SecurityConfig;
import com.example.gng.store.dto.StoreEmployeeDTO;
import com.example.gng.store.service.StoreEmployeeService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Reguła {@code /api/v1/store-employees/**} → ROLE_COMPANY sprawdzana na prawdziwym
 * {@link SecurityConfig} i prawdziwym {@link JwtAuthenticationFilter}. Zamockowane są
 * tylko parsowanie tokenu i ładowanie konta, więc test sprawdza kolejność dopasowań
 * w łańcuchu, a nie założenia mocka o roli.
 */
@WebMvcTest(StoreEmployeeController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, CorsProperties.class})
class StoreEmployeeControllerSecurityTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private StoreEmployeeService storeEmployeeService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private CustomUserDetailsService userDetailsService;

    @Test
    void list_allowedForCompany() throws Exception {
        String token = tokenFor("sklep@example.com", "ROLE_COMPANY");
        when(storeEmployeeService.listForCurrentCompany(eq("sklep@example.com"), any(), any()))
                .thenReturn(new PageResponse<>(List.of(sampleDto()), 0, 20, 1, 1));

        mockMvc.perform(get("/api/v1/store-employees").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].email").value("anna@example.com"))
                .andExpect(jsonPath("$.content[0].active").value(true))
                .andExpect(jsonPath("$.content[0].password").doesNotExist())
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void list_forbiddenForRegularUser() throws Exception {
        assertListForbidden("ROLE_USER");
    }

    @Test
    void list_forbiddenForStoreEmployee() throws Exception {
        assertListForbidden("ROLE_STORE_EMPLOYEE");
    }

    @Test
    void list_forbiddenForAdmin() throws Exception {
        // ADMIN nie ma sklepu — reguła celowo go nie dopuszcza
        assertListForbidden("ROLE_ADMIN");
    }

    @Test
    void list_rejectsAnonymous() throws Exception {
        mockMvc.perform(get("/api/v1/store-employees"))
                .andExpect(status().isForbidden());
        verify(storeEmployeeService, never()).listForCurrentCompany(any(), any(), any());
    }

    @Test
    void patch_forbiddenForNonCompany() throws Exception {
        String token = tokenFor("pracownik@example.com", "ROLE_STORE_EMPLOYEE");

        mockMvc.perform(patch("/api/v1/store-employees/201")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":true}"))
                .andExpect(status().isForbidden());
        verify(storeEmployeeService, never()).setActiveForCurrentCompany(anyString(), anyLong(), anyBoolean());
    }

    @Test
    void patch_allowedForCompany() throws Exception {
        String token = tokenFor("sklep@example.com", "ROLE_COMPANY");
        when(storeEmployeeService.setActiveForCurrentCompany("sklep@example.com", 201L, false))
                .thenReturn(sampleDto());

        mockMvc.perform(patch("/api/v1/store-employees/201")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false}"))
                .andExpect(status().isOk());
        verify(storeEmployeeService).setActiveForCurrentCompany("sklep@example.com", 201L, false);
    }

    @Test
    void patch_missingActiveIsValidationError() throws Exception {
        String token = tokenFor("sklep@example.com", "ROLE_COMPANY");

        mockMvc.perform(patch("/api/v1/store-employees/201")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void create_forbiddenForRegularUser() throws Exception {
        // POST był wcześniej jedyną chronioną metodą — reguła na całą ścieżkę nie może go zgubić
        String token = tokenFor("zwykly@example.com", "ROLE_USER");

        mockMvc.perform(post("/api/v1/store-employees")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"A\",\"lastName\":\"B\",\"email\":\"a@b.pl\",\"password\":\"Haslo1234\"}"))
                .andExpect(status().isForbidden());
        verify(storeEmployeeService, never()).createForCurrentCompany(any(), any());
    }

    private void assertListForbidden(String role) throws Exception {
        String token = tokenFor("konto@example.com", role);

        mockMvc.perform(get("/api/v1/store-employees").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
        verify(storeEmployeeService, never()).listForCurrentCompany(any(), any(), any());
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

    private static StoreEmployeeDTO sampleDto() {
        return new StoreEmployeeDTO(201L, "Anna", "Kowalska", "anna@example.com", null,
                7L, "Piekarnia", LocalDateTime.of(2026, 10, 1, 12, 0), true);
    }
}
