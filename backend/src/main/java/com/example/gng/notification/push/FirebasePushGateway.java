package com.example.gng.notification.push;

import com.google.firebase.ErrorCode;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.AndroidNotification;
import com.google.firebase.messaging.ApnsConfig;
import com.google.firebase.messaging.Aps;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.Notification;
import com.google.firebase.messaging.WebpushConfig;
import com.google.firebase.messaging.WebpushFcmOptions;
import com.google.firebase.messaging.WebpushNotification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * Wysyłka przez Firebase Cloud Messaging.
 *
 * <p>Wiadomość ma <b>blok notification</b>, a nie same dane: tylko wtedy system pokaże ją, gdy
 * aplikacja jest w tle albo zamknięta, a na iOS (APNs) w ogóle. Pola danych niosą deep link
 * i typ zdarzenia dla klienta.
 */
@Component
public class FirebasePushGateway implements PushGateway {

    private static final Logger logger = LoggerFactory.getLogger(FirebasePushGateway.class);

    private final String frontAppUrl;

    public FirebasePushGateway(@Value("${front.app.url:http://localhost:3000}") String frontAppUrl) {
        this.frontAppUrl = frontAppUrl.endsWith("/") ? frontAppUrl.substring(0, frontAppUrl.length() - 1) : frontAppUrl;
    }

    @Override
    public boolean isEnabled() {
        return !FirebaseApp.getApps().isEmpty();
    }

    @Override
    public PushSendResult send(String token, PushMessage message) {
        if (!isEnabled()) {
            return PushSendResult.DISABLED;
        }
        try {
            FirebaseMessaging.getInstance().send(build(token, message));
            return PushSendResult.SENT;
        } catch (FirebaseMessagingException e) {
            PushSendResult result = classify(e);
            logger.warn("FCM odrzucił push {} ({}): {} / {} — {}", message.type(), result,
                    e.getMessagingErrorCode(), e.getErrorCode(), e.getMessage());
            return result;
        } catch (RuntimeException e) {
            logger.error("Nieoczekiwany błąd wysyłki push {}: {}", message.type(), e.getMessage(), e);
            return PushSendResult.PERMANENT_ERROR;
        }
    }

    Message build(String token, PushMessage message) {
        WebpushConfig.Builder webpush = WebpushConfig.builder()
                .setNotification(WebpushNotification.builder()
                        .setTitle(message.title())
                        .setBody(message.body())
                        .setIcon(frontAppUrl + "/icon-192.png")
                        .setTag(message.tag())
                        .build());
        // FCM przyjmuje link w fcm_options wyłącznie jako HTTPS — na http (dev) link niesie
        // pole danych „url”, które obsługuje nasz service worker
        if (message.path() != null && frontAppUrl.startsWith("https://")) {
            webpush.setFcmOptions(WebpushFcmOptions.withLink(frontAppUrl + message.path()));
        }

        return Message.builder()
                .setToken(token)
                .setNotification(Notification.builder()
                        .setTitle(message.title())
                        .setBody(message.body())
                        .build())
                .putAllData(message.dataPayload())
                .setWebpushConfig(webpush.build())
                .setAndroidConfig(AndroidConfig.builder()
                        .setPriority(AndroidConfig.Priority.HIGH)
                        .setNotification(AndroidNotification.builder().setTag(message.tag()).build())
                        .build())
                .setApnsConfig(ApnsConfig.builder()
                        .setAps(Aps.builder().setSound("default").build())
                        .build())
                .build();
    }

    /**
     * Rozstrzyga, czy token jest martwy (do usunięcia), czy błąd jest przejściowy (do ponowienia).
     *
     * <p>INVALID_ARGUMENT oznacza martwy token tylko wtedy, gdy dotyczy tokenu rejestracji —
     * ten sam kod dostajemy też za błędną budowę wiadomości, a wtedy usunięcie tokenu odcięłoby
     * zdrowe urządzenie. SDK nie rozróżnia tych przypadków kodem, więc decyduje opis błędu.
     */
    static PushSendResult classify(FirebaseMessagingException e) {
        MessagingErrorCode code = e.getMessagingErrorCode();
        if (code == MessagingErrorCode.UNREGISTERED || code == MessagingErrorCode.SENDER_ID_MISMATCH) {
            return PushSendResult.INVALID_TOKEN;
        }
        if (code == MessagingErrorCode.INVALID_ARGUMENT || e.getErrorCode() == ErrorCode.INVALID_ARGUMENT) {
            String text = e.getMessage() == null ? "" : e.getMessage().toLowerCase(Locale.ROOT);
            return text.contains("registration token") ? PushSendResult.INVALID_TOKEN : PushSendResult.PERMANENT_ERROR;
        }
        if (code == MessagingErrorCode.UNAVAILABLE || code == MessagingErrorCode.INTERNAL
                || code == MessagingErrorCode.QUOTA_EXCEEDED) {
            return PushSendResult.TRANSIENT_ERROR;
        }
        ErrorCode platform = e.getErrorCode();
        if (platform == ErrorCode.UNAVAILABLE || platform == ErrorCode.INTERNAL
                || platform == ErrorCode.DEADLINE_EXCEEDED || platform == ErrorCode.RESOURCE_EXHAUSTED) {
            return PushSendResult.TRANSIENT_ERROR;
        }
        if (platform == ErrorCode.NOT_FOUND) {
            // Część odpowiedzi „Requested entity was not found” przychodzi bez MessagingErrorCode
            return PushSendResult.INVALID_TOKEN;
        }
        return PushSendResult.PERMANENT_ERROR;
    }
}
