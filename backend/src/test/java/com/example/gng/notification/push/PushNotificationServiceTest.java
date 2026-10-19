package com.example.gng.notification.push;

import com.example.gng.chat.entity.FcmToken;
import com.example.gng.chat.service.FcmTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Ponowienia na błędach przejściowych i sprzątanie martwych tokenów. */
class PushNotificationServiceTest {

    private static final PushMessage MESSAGE = PushMessage.of("TEST", "Tytuł", "Treść", "/reservations");

    private PushGateway gateway;
    private FcmTokenService tokenService;
    private List<Long> pauses;
    private PushNotificationService service;

    @BeforeEach
    void setUp() {
        gateway = mock(PushGateway.class);
        tokenService = mock(FcmTokenService.class);
        pauses = new ArrayList<>();
        when(gateway.isEnabled()).thenReturn(true);
        // Executor synchroniczny i „sen” zapisywany zamiast prawdziwego czekania
        service = new PushNotificationService(gateway, tokenService, pauses::add, Runnable::run);
    }

    @Test
    void sentOnFirstAttemptDoesNotRetryNorTouchToken() {
        when(gateway.send("t1", MESSAGE)).thenReturn(PushSendResult.SENT);

        assertEquals(PushSendResult.SENT, service.sendToToken("t1", MESSAGE));

        verify(gateway, times(1)).send("t1", MESSAGE);
        verify(tokenService, never()).removeInvalidToken(anyString());
        assertEquals(List.of(), pauses);
    }

    @Test
    void transientErrorIsRetriedWithGrowingBackoff() {
        when(gateway.send("t1", MESSAGE))
                .thenReturn(PushSendResult.TRANSIENT_ERROR)
                .thenReturn(PushSendResult.TRANSIENT_ERROR)
                .thenReturn(PushSendResult.SENT);

        assertEquals(PushSendResult.SENT, service.sendToToken("t1", MESSAGE));

        verify(gateway, times(3)).send("t1", MESSAGE);
        assertEquals(List.of(300L, 1200L), pauses);
    }

    @Test
    void transientErrorGivesUpAfterMaxAttemptsAndKeepsToken() {
        when(gateway.send("t1", MESSAGE)).thenReturn(PushSendResult.TRANSIENT_ERROR);

        assertEquals(PushSendResult.TRANSIENT_ERROR, service.sendToToken("t1", MESSAGE));

        verify(gateway, times(PushNotificationService.MAX_ATTEMPTS)).send("t1", MESSAGE);
        verify(tokenService, never()).removeInvalidToken(anyString());
    }

    @Test
    void invalidTokenIsRemovedWithoutRetry() {
        when(gateway.send("dead", MESSAGE)).thenReturn(PushSendResult.INVALID_TOKEN);

        assertEquals(PushSendResult.INVALID_TOKEN, service.sendToToken("dead", MESSAGE));

        verify(gateway, times(1)).send("dead", MESSAGE);
        verify(tokenService).removeInvalidToken("dead");
    }

    @Test
    void permanentErrorNeitherRetriesNorRemovesToken() {
        when(gateway.send("t1", MESSAGE)).thenReturn(PushSendResult.PERMANENT_ERROR);

        service.sendToToken("t1", MESSAGE);

        verify(gateway, times(1)).send("t1", MESSAGE);
        verify(tokenService, never()).removeInvalidToken(anyString());
    }

    @Test
    void sendToUserCoversAllDevicesAndCleansOnlyDeadOnes() {
        when(tokenService.getValidTokensForUserId(8L)).thenReturn(List.of(token("phone"), token("dead"), token("laptop")));
        when(gateway.send("phone", MESSAGE)).thenReturn(PushSendResult.SENT);
        when(gateway.send("dead", MESSAGE)).thenReturn(PushSendResult.INVALID_TOKEN);
        when(gateway.send("laptop", MESSAGE)).thenReturn(PushSendResult.SENT);

        assertEquals(2, service.sendToUser(8L, MESSAGE));

        verify(tokenService).removeInvalidToken("dead");
        verify(tokenService, never()).removeInvalidToken("phone");
    }

    @Test
    void disabledGatewaySkipsWithoutLookingUpTokens() {
        when(gateway.isEnabled()).thenReturn(false);

        assertEquals(0, service.sendToUser(8L, MESSAGE));

        verify(tokenService, never()).getValidTokensForUserId(anyLong());
        verify(gateway, never()).send(anyString(), any());
    }

    @Test
    void asyncFailureIsContainedAndDoesNotPropagate() {
        when(tokenService.getValidTokensForUserId(eq(8L))).thenThrow(new IllegalStateException("baza niedostępna"));

        // Wyjątek w tle nie może wyjść do wywołującego (tu: executor synchroniczny)
        service.sendToUserAsync(8L, MESSAGE);
    }

    private static FcmToken token(String value) {
        FcmToken token = new FcmToken();
        token.setToken(value);
        return token;
    }
}
