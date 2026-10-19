package com.example.gng.notification.push;

import com.google.firebase.ErrorCode;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.MessagingErrorCode;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Które odpowiedzi FCM kasują token. Pomyłka w jedną stronę zostawia martwe tokeny w bazie,
 * w drugą — odcina zdrowe urządzenie od powiadomień.
 */
class FirebasePushGatewayTest {

    @Test
    void unregisteredTokenIsDead() {
        assertEquals(PushSendResult.INVALID_TOKEN, classify(MessagingErrorCode.UNREGISTERED, ErrorCode.NOT_FOUND, "Requested entity was not found."));
    }

    @Test
    void tokenFromOtherFirebaseProjectIsDead() {
        assertEquals(PushSendResult.INVALID_TOKEN, classify(MessagingErrorCode.SENDER_ID_MISMATCH, ErrorCode.PERMISSION_DENIED, "SenderId mismatch"));
    }

    @Test
    void invalidArgumentAboutRegistrationTokenIsDead() {
        assertEquals(PushSendResult.INVALID_TOKEN, classify(MessagingErrorCode.INVALID_ARGUMENT, ErrorCode.INVALID_ARGUMENT,
                "The registration token is not a valid FCM registration token"));
    }

    @Test
    void invalidArgumentAboutMessageKeepsToken() {
        // Ten sam kod za złą budowę wiadomości — token jest zdrowy, nie wolno go usunąć
        assertEquals(PushSendResult.PERMANENT_ERROR, classify(MessagingErrorCode.INVALID_ARGUMENT, ErrorCode.INVALID_ARGUMENT,
                "Invalid value at 'message.webpush.fcm_options.link' (TYPE_STRING), must be HTTPS"));
    }

    @Test
    void unavailableAndInternalAreTransient() {
        assertEquals(PushSendResult.TRANSIENT_ERROR, classify(MessagingErrorCode.UNAVAILABLE, ErrorCode.UNAVAILABLE, "Service unavailable"));
        assertEquals(PushSendResult.TRANSIENT_ERROR, classify(MessagingErrorCode.INTERNAL, ErrorCode.INTERNAL, "Internal error"));
        assertEquals(PushSendResult.TRANSIENT_ERROR, classify(MessagingErrorCode.QUOTA_EXCEEDED, ErrorCode.RESOURCE_EXHAUSTED, "Quota"));
    }

    @Test
    void timeoutWithoutMessagingCodeIsTransient() {
        assertEquals(PushSendResult.TRANSIENT_ERROR, classify(null, ErrorCode.DEADLINE_EXCEEDED, "timeout"));
    }

    @Test
    void apnsAuthErrorIsPermanent() {
        assertEquals(PushSendResult.PERMANENT_ERROR, classify(MessagingErrorCode.THIRD_PARTY_AUTH_ERROR, ErrorCode.UNAUTHENTICATED, "APNs auth"));
    }

    private static PushSendResult classify(MessagingErrorCode messagingCode, ErrorCode platformCode, String message) {
        FirebaseMessagingException e = mock(FirebaseMessagingException.class);
        when(e.getMessagingErrorCode()).thenReturn(messagingCode);
        when(e.getErrorCode()).thenReturn(platformCode);
        when(e.getMessage()).thenReturn(message);
        return FirebasePushGateway.classify(e);
    }
}
