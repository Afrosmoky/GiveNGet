package com.example.gng.chat.handler;

import com.example.gng.auth.service.JwtService;
import com.example.gng.chat.dto.ChatMessageRequest;
import com.example.gng.chat.service.ChatWebSocketService;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
public class WebSocketChatHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketChatHandler.class);
    
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final ApplicationContext applicationContext;
    
    // Mapowanie userId -> WebSocketSession
    private final ConcurrentMap<Long, WebSocketSession> userSessions = new ConcurrentHashMap<>();
    
    // Mapowanie chatId -> Set<userId> (uczestnicy czatu)
    private final ConcurrentMap<Long, ConcurrentMap<Long, Boolean>> chatParticipants = new ConcurrentHashMap<>();

    @Autowired
    public WebSocketChatHandler(JwtService jwtService, UserRepository userRepository, ObjectMapper objectMapper, ApplicationContext applicationContext) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.applicationContext = applicationContext;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        try {
            // Wyciągnij token z parametrów URL
            String token = extractTokenFromUrl(session.getUri());
            if (token == null) {
                logger.error("Token JWT nie znaleziony w URL");
                session.close(CloseStatus.POLICY_VIOLATION.withReason("Token JWT wymagany"));
                return;
            }

            // Zweryfikuj token i wyciągnij userId
            String userEmail = jwtService.extractUsername(token);
            if (userEmail == null) {
                logger.error("Nieprawidłowy token JWT");
                session.close(CloseStatus.POLICY_VIOLATION.withReason("Nieprawidłowy token JWT"));
                return;
            }

            UserModel user = userRepository.findByEmail(userEmail)
                    .orElse(null);
            if (user == null) {
                logger.error("Użytkownik nie znaleziony: {}", userEmail);
                session.close(CloseStatus.POLICY_VIOLATION.withReason("Użytkownik nie znaleziony"));
                return;
            }

            // Zapisz sesję użytkownika
            userSessions.put(user.getId(), session);
            logger.info("Użytkownik {} połączony z WebSocket", userEmail);

        } catch (Exception e) {
            logger.error("Błąd podczas nawiązywania połączenia WebSocket", e);
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            // Znajdź użytkownika dla tej sesji
            Long userId = findUserIdBySession(session);
            if (userId == null) {
                logger.error("Nie znaleziono użytkownika dla sesji");
                return;
            }

            // Parsuj wiadomość
            ChatMessageRequest request = objectMapper.readValue(message.getPayload(), ChatMessageRequest.class);
            
            // Przekaż do serwisu czatu - użyj ApplicationContext do pobrania serwisu
            ChatWebSocketService chatWebSocketService = applicationContext.getBean(ChatWebSocketService.class);
            chatWebSocketService.handleMessage(request, userId);

        } catch (Exception e) {
            logger.error("Błąd podczas obsługi wiadomości WebSocket", e);
            // Wyślij błąd do klienta
            sendErrorMessage(session, "Błąd podczas przetwarzania wiadomości: " + e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        // Usuń użytkownika z mapowań
        Long userId = findUserIdBySession(session);
        if (userId != null) {
            userSessions.remove(userId);
            removeUserFromAllChats(userId);
            logger.info("Użytkownik {} rozłączony z WebSocket", userId);
        }
    }

    private String extractTokenFromUrl(URI uri) {
        if (uri == null || uri.getQuery() == null) {
            return null;
        }
        
        String query = uri.getQuery();
        String[] params = query.split("&");
        
        for (String param : params) {
            String[] keyValue = param.split("=");
            if (keyValue.length == 2 && "token".equals(keyValue[0])) {
                return keyValue[1];
            }
        }
        
        return null;
    }

    private Long findUserIdBySession(WebSocketSession session) {
        for (Map.Entry<Long, WebSocketSession> entry : userSessions.entrySet()) {
            if (entry.getValue().equals(session)) {
                return entry.getKey();
            }
        }
        return null;
    }

    private void removeUserFromAllChats(Long userId) {
        for (ConcurrentMap<Long, Boolean> participants : chatParticipants.values()) {
            participants.remove(userId);
        }
    }

    private void sendErrorMessage(WebSocketSession session, String errorMessage) {
        try {
            session.sendMessage(new TextMessage("{\"error\":\"" + errorMessage + "\"}"));
        } catch (IOException e) {
            logger.error("Błąd podczas wysyłania komunikatu o błędzie", e);
        }
    }

    // Metody publiczne do zarządzania sesjami
    public void addUserToChat(Long chatId, Long userId) {
        chatParticipants.computeIfAbsent(chatId, k -> new ConcurrentHashMap<>()).put(userId, true);
        logger.info("Użytkownik {} dodany do czatu {}", userId, chatId);
    }

    public void removeUserFromChat(Long chatId, Long userId) {
        ConcurrentMap<Long, Boolean> participants = chatParticipants.get(chatId);
        if (participants != null) {
            participants.remove(userId);
            logger.info("Użytkownik {} usunięty z czatu {}", userId, chatId);
        }
    }

    public void sendMessageToChat(Long chatId, String message) {
        ConcurrentMap<Long, Boolean> participants = chatParticipants.get(chatId);
        if (participants != null) {
            for (Long userId : participants.keySet()) {
                WebSocketSession session = userSessions.get(userId);
                if (session != null && session.isOpen()) {
                    try {
                        session.sendMessage(new TextMessage(message));
                    } catch (IOException e) {
                        logger.error("Błąd podczas wysyłania wiadomości do użytkownika {}", userId, e);
                    }
                }
            }
        }
    }

    public void sendMessageToUser(Long userId, String message) {
        WebSocketSession session = userSessions.get(userId);
        if (session != null && session.isOpen()) {
            try {
                session.sendMessage(new TextMessage(message));
            } catch (IOException e) {
                logger.error("Błąd podczas wysyłania wiadomości do użytkownika {}", userId, e);
            }
        }
    }


} 