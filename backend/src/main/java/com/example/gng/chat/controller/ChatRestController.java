package com.example.gng.chat.controller;

import com.example.gng.auth.service.SessionService;
import com.example.gng.chat.dto.*;
import com.example.gng.chat.service.ChatService;
import com.example.gng.chat.service.FcmTokenService;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.register.model.UserModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.ZonedDateTime;
import java.util.List;
import org.springframework.data.domain.Page;

@RestController
@RequestMapping("/api/chats")
public class ChatRestController {

    private final ChatService chatService;
    private final UserRepository userRepository;
    private final FcmTokenService fcmTokenService;

    @Autowired
    public ChatRestController(ChatService chatService, UserRepository userRepository, FcmTokenService fcmTokenService) {
        this.chatService = chatService;
        this.userRepository = userRepository;
        this.fcmTokenService = fcmTokenService;
    }

    /**
     * Pobierz wszystkie czaty zalogowanego użytkownika
     */
    @GetMapping("/me")
    public ResponseEntity<List<ChatDto>> getMyChats() {
        try {
            String currentUserEmail = SessionService.getCurrentUserEmail();
            UserModel userModel = userRepository.findByEmail(currentUserEmail).orElseThrow();
            Long userId = userModel.getId();
            List<ChatDto> chats = chatService.getUserChats(userId);
            return ResponseEntity.ok(chats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Pobierz wiadomości czatu z paginacją
     */
    @GetMapping("/{chatId}/messages")
    public ResponseEntity<Page<MessageDto>> getChatMessages(@PathVariable Long chatId,
                                                           @RequestParam(defaultValue = "0") int page,
                                                           @RequestParam(defaultValue = "20") int size) {
        try {
            Page<MessageDto> messages = chatService.getChatMessages(chatId, page, size);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Pobierz informacje o niewyświetlonych wiadomościach
     */
    @GetMapping("/unread")
    public ResponseEntity<List<UnreadMessageInfo>> getUnreadMessages() {
        try {
            String currentUserEmail = SessionService.getCurrentUserEmail();
            UserModel currentUser = userRepository.findByEmail(currentUserEmail)
                    .orElseThrow(() -> new RuntimeException("Zalogowany użytkownik nie znaleziony"));

            List<UnreadMessageInfo> unreadInfo = chatService.getUnreadMessageInfo(currentUser.getId());
            return ResponseEntity.ok(unreadInfo);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Oznacz wiadomości jako przeczytane w czacie
     */
    @PostMapping("/{chatId}/mark-read")
    public ResponseEntity<Void> markMessagesAsRead(@PathVariable Long chatId) {
        try {
            String currentUserEmail = SessionService.getCurrentUserEmail();
            UserModel currentUser = userRepository.findByEmail(currentUserEmail)
                    .orElseThrow(() -> new RuntimeException("Zalogowany użytkownik nie znaleziony"));

            chatService.markMessagesAsRead(chatId, currentUser.getId());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Aktualizuj FCM token zalogowanego użytkownika
     */
    @PostMapping("/fcm-token")
    public ResponseEntity<Void> updateFcmToken(Authentication authentication,
                                             @RequestBody UpdateFcmTokenRequest request) {
        try {
            String username = authentication.getName();
            UserModel user = userRepository.findByEmail(username)
                    .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

            fcmTokenService.addOrUpdateToken(user, request.getFcmToken(), request.getOldFcmToken(), request.getDeviceName());

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/actualDate")
    public ResponseEntity<ZonedDateTime> getActualDate() {
        return ResponseEntity.ok(ZonedDateTime.now());
    }
}