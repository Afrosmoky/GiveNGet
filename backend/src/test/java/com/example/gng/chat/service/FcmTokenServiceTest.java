package com.example.gng.chat.service;

import com.example.gng.chat.entity.FcmToken;
import com.example.gng.chat.repository.FcmTokenRepository;
import com.example.gng.register.model.UserModel;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Właściciel tokenu FCM.
 *
 * Przed poprawką istniejący token tylko przedłużał ważność i zostawał przy poprzednim
 * użytkowniku — po przelogowaniu na tym samym urządzeniu powiadomienia nowego konta
 * trafiały do starego.
 */
class FcmTokenServiceTest {

    private static final String TOKEN = "device-token-abc";

    @Mock private FcmTokenRepository fcmTokenRepository;

    private AutoCloseable mocks;
    private FcmTokenService fcmTokenService;

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);
        fcmTokenService = new FcmTokenService(fcmTokenRepository);
    }

    @AfterEach
    void tearDown() throws Exception {
        mocks.close();
    }

    @Test
    void existingTokenIsReassignedToNewlyLoggedInUser() {
        UserModel previousUser = user(6L);
        UserModel newUser = user(7L);
        FcmToken existing = new FcmToken();
        existing.setId(1L);
        existing.setUser(previousUser);
        existing.setToken(TOKEN);
        existing.setValidUntil(LocalDateTime.now().plusDays(1));
        when(fcmTokenRepository.findByToken(TOKEN)).thenReturn(Optional.of(existing));

        // Frontend wysyła ten sam token jako oldFcmToken (zapisany wcześniej w localStorage)
        fcmTokenService.addOrUpdateToken(newUser, TOKEN, TOKEN, "Chrome");

        FcmToken saved = captureSaved();
        assertEquals(1L, saved.getId(), "aktualizujemy istniejący wiersz, nie tworzymy duplikatu tokenu");
        assertSame(newUser, saved.getUser());
        assertEquals(TOKEN, saved.getToken());
        assertTrue(saved.getValidUntil().isAfter(LocalDateTime.now().plusDays(13)));
    }

    @Test
    void newTokenIsCreatedForCurrentUser() {
        UserModel user = user(7L);
        when(fcmTokenRepository.findByToken(TOKEN)).thenReturn(Optional.empty());

        fcmTokenService.addOrUpdateToken(user, TOKEN, null, "Chrome");

        FcmToken saved = captureSaved();
        assertSame(user, saved.getUser());
        assertEquals(TOKEN, saved.getToken());
    }

    private FcmToken captureSaved() {
        ArgumentCaptor<FcmToken> captor = ArgumentCaptor.forClass(FcmToken.class);
        verify(fcmTokenRepository).save(captor.capture());
        return captor.getValue();
    }

    private static UserModel user(Long id) {
        UserModel user = new UserModel();
        user.setId(id);
        return user;
    }
}
