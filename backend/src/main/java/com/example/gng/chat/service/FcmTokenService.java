package com.example.gng.chat.service;

import com.example.gng.chat.entity.FcmToken;
import com.example.gng.chat.repository.FcmTokenRepository;
import com.example.gng.register.model.UserModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/**
 * Tokeny FCM urządzeń. Token identyfikuje <b>urządzenie</b> (przeglądarkę / instalację aplikacji),
 * nie konto — w danej chwili należy do tego, kto jest na nim zalogowany.
 */
@Service
public class FcmTokenService {

    private static final Logger logger = LoggerFactory.getLogger(FcmTokenService.class);

    /** Ważność wpisu; klient odświeża token przy każdym starcie aplikacji, więc to tylko bezpiecznik. */
    static final int VALIDITY_WEEKS = 2;
    private static final int DEVICE_NAME_MAX = 255;

    private final FcmTokenRepository fcmTokenRepository;

    public FcmTokenService(FcmTokenRepository fcmTokenRepository) {
        this.fcmTokenRepository = fcmTokenRepository;
    }

    /**
     * Wiąże token z zalogowanym kontem.
     *
     * <ul>
     *   <li>Token już znany — przepinamy go na bieżące konto. Tak wygląda zmiana użytkownika na
     *       tym samym urządzeniu; bez przepięcia push poprzedniego konta trafiałby do nowego.</li>
     *   <li>Nowy token, a klient podał poprzedni ({@code previousToken}) — to rotacja tokenu tego
     *       samego urządzenia: podmieniamy wartość w istniejącym wpisie zamiast dokładać drugi.</li>
     * </ul>
     * Poprzedni token ruszamy tylko, gdy należy do tego samego konta — inaczej znajomość cudzego
     * tokenu pozwalałaby odpiąć komuś powiadomienia.
     */
    @Transactional
    public FcmToken register(UserModel user, String token, String previousToken, String deviceName) {
        FcmToken entry = fcmTokenRepository.findByToken(token).orElse(null);
        boolean rotated = previousToken != null && !previousToken.isBlank() && !previousToken.equals(token);

        if (rotated) {
            FcmToken previous = fcmTokenRepository.findByToken(previousToken)
                    .filter(p -> p.getUser() != null && Objects.equals(p.getUser().getId(), user.getId()))
                    .orElse(null);
            if (previous != null) {
                if (entry == null) {
                    entry = previous;
                } else {
                    // Nowy token jest już zapisany — stary wpis tego urządzenia jest zbędny
                    fcmTokenRepository.delete(previous);
                }
            }
        }

        if (entry == null) {
            entry = new FcmToken();
        } else if (entry.getUser() != null && !Objects.equals(entry.getUser().getId(), user.getId())) {
            logger.info("Token FCM urządzenia przepięty z konta {} na {}", entry.getUser().getId(), user.getId());
        }

        entry.setUser(user);
        entry.setToken(token);
        entry.setDeviceName(truncate(deviceName));
        entry.setValidUntil(LocalDateTime.now().plusWeeks(VALIDITY_WEEKS));
        return fcmTokenRepository.save(entry);
    }

    /** Zgodność ze starym endpointem /api/chats/fcm-token. */
    public void addOrUpdateToken(UserModel user, String token, String oldFcmToken, String deviceName) {
        register(user, token, oldFcmToken, deviceName);
    }

    /**
     * Odpina token od konta (wylogowanie). Cudzy albo nieznany token pomijamy bez błędu —
     * odpowiedź nie może zdradzać, czy dany token istnieje.
     *
     * @return czy coś usunięto
     */
    @Transactional
    public boolean unregister(UserModel user, String token) {
        return fcmTokenRepository.findByToken(token)
                .filter(t -> t.getUser() != null && Objects.equals(t.getUser().getId(), user.getId()))
                .map(t -> {
                    fcmTokenRepository.delete(t);
                    return true;
                })
                .orElse(false);
    }

    /** Usuwa token odrzucony przez FCM jako martwy (wyrejestrowany / nieprawidłowy). */
    @Transactional
    public void removeInvalidToken(String token) {
        fcmTokenRepository.deleteByToken(token);
    }

    public List<FcmToken> getValidTokensForUser(UserModel user) {
        return fcmTokenRepository.findByUserAndValidUntilAfter(user, LocalDateTime.now());
    }

    public List<FcmToken> getValidTokensForUserId(Long userId) {
        return fcmTokenRepository.findByUser_IdAndValidUntilAfter(userId, LocalDateTime.now());
    }

    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void removeExpiredTokens() {
        fcmTokenRepository.deleteByValidUntilBefore(LocalDateTime.now());
    }

    private static String truncate(String deviceName) {
        if (deviceName == null) {
            return null;
        }
        return deviceName.length() <= DEVICE_NAME_MAX ? deviceName : deviceName.substring(0, DEVICE_NAME_MAX);
    }
}
