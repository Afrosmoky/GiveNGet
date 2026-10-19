package com.example.gng.user.controller;

import com.example.gng.common.exception.BadRequestException;
import com.example.gng.config.GlobalExceptionHandler;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.user.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * POST /api/reset-password/{code}: nieważny kod to 400 INVALID_RESET_CODE w formacie 6.3,
 * a nie ciche 200 (front pokazywał wtedy „Hasło zmienione”, choć nic się nie zmieniło).
 */
class RegistrationControllerResetTest {

    private UserService userService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        userService = mock(UserService.class);
        mockMvc = MockMvcBuilders
                .standaloneSetup(new RegistrationController(mock(UserRepository.class), userService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void invalidCode_returns400WithInvalidResetCode() throws Exception {
        when(userService.resetPassword(eq("ZLYKOD"), anyString())).thenThrow(BadRequestException.invalidResetCode());

        mockMvc.perform(post("/api/reset-password/ZLYKOD").contentType(MediaType.APPLICATION_JSON).content("NoweHaslo1!"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_RESET_CODE"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void validCode_returns200AndPassesRawPassword() throws Exception {
        when(userService.resetPassword("DOBRYKOD", "NoweHaslo1!")).thenReturn("jan@test.pl");

        mockMvc.perform(post("/api/reset-password/DOBRYKOD").contentType(MediaType.APPLICATION_JSON).content("NoweHaslo1!"))
                .andExpect(status().isOk());

        verify(userService).resetPassword("DOBRYKOD", "NoweHaslo1!");
    }
}
