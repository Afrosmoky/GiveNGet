package com.example.gng.notification.controller;

import com.example.gng.chat.entity.FcmToken;
import com.example.gng.chat.service.FcmTokenService;
import com.example.gng.common.exception.ForbiddenOperationException;
import com.example.gng.notification.dto.PushTokenDTO;
import com.example.gng.notification.dto.RegisterPushTokenRequest;
import com.example.gng.notification.dto.UnregisterPushTokenRequest;
import com.example.gng.notification.push.PushGateway;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Tokeny push urządzeń zalogowanego użytkownika (web i mobile). Konto zawsze z
 * {@link Authentication} — klient nie wskazuje, do kogo token przypiąć.
 */
@RestController
@RequestMapping("/api/v1/push/tokens")
public class PushTokenController {

    private final FcmTokenService tokenService;
    private final UserRepository userRepository;
    private final PushGateway pushGateway;

    public PushTokenController(FcmTokenService tokenService, UserRepository userRepository, PushGateway pushGateway) {
        this.tokenService = tokenService;
        this.userRepository = userRepository;
        this.pushGateway = pushGateway;
    }

    @PostMapping
    public ResponseEntity<PushTokenDTO> register(Authentication authentication,
                                                 @Valid @RequestBody RegisterPushTokenRequest request) {
        UserModel user = currentUser(authentication);
        FcmToken saved = tokenService.register(user, request.token(), request.previousToken(), request.deviceName());
        return ResponseEntity.ok(new PushTokenDTO(saved.getValidUntil(), pushGateway.isEnabled()));
    }

    /** Idempotentne: nieznany albo cudzy token też daje 204, żeby nie zdradzać, czy istnieje. */
    @DeleteMapping
    public ResponseEntity<Void> unregister(Authentication authentication,
                                           @Valid @RequestBody UnregisterPushTokenRequest request) {
        tokenService.unregister(currentUser(authentication), request.token());
        return ResponseEntity.noContent().build();
    }

    private UserModel currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ForbiddenOperationException(
                        "Nie znaleziono konta zalogowanego użytkownika.", Map.of()));
    }
}
