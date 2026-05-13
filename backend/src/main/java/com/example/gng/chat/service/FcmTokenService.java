package com.example.gng.chat.service;

import com.example.gng.register.model.UserModel;
import com.example.gng.chat.entity.FcmToken;
import com.example.gng.chat.repository.FcmTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class FcmTokenService {
    private final FcmTokenRepository fcmTokenRepository;

    @Autowired
    public FcmTokenService(FcmTokenRepository fcmTokenRepository) {
        this.fcmTokenRepository = fcmTokenRepository;
    }

    public void addOrUpdateToken(UserModel user, String token, String oldFcmToken, String deviceName) {
        FcmToken fcmToken = fcmTokenRepository.findByToken(oldFcmToken != null ? oldFcmToken : token).orElse(null);
        if (fcmToken == null) {
            fcmToken = new FcmToken();
            fcmToken.setUser(user);
            fcmToken.setToken(token);
            fcmToken.setDeviceName(deviceName);
        } else {
            // Update existing token
            fcmToken.setToken(token);
            fcmToken.setDeviceName(deviceName);
        }
        fcmToken.setValidUntil(LocalDateTime.now().plusWeeks(2));
        fcmTokenRepository.save(fcmToken);
    }

    public List<FcmToken> getValidTokensForUser(UserModel user) {
        return fcmTokenRepository.findByUserAndValidUntilAfter(user, LocalDateTime.now());
    }

    @Scheduled(cron = "0 0 2 * * *")
    public void removeExpiredTokens() {
        fcmTokenRepository.deleteByValidUntilBefore(LocalDateTime.now());
    }
}