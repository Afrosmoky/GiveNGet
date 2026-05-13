package com.example.gng.chat.service;

import com.example.gng.chat.dto.ChatMessageRequest;
import com.example.gng.chat.dto.ChatMessageResponse;
import com.example.gng.chat.entity.ChatEntity;
import com.example.gng.chat.entity.ChatParticipantEntity;
import com.example.gng.chat.entity.FcmToken;
import com.example.gng.chat.entity.MessageEntity;
import com.example.gng.chat.enums.MessageType;
import com.example.gng.chat.handler.WebSocketChatHandler;
import com.example.gng.chat.repository.ChatParticipantRepository;
import com.example.gng.chat.repository.ChatRepository;
import com.example.gng.chat.repository.MessageRepository;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;
import com.example.gng.statistics.service.DashboardStatisticsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Service
public class ChatWebSocketService {

    private static final Logger logger = LoggerFactory.getLogger(ChatWebSocketService.class);

    private final ChatRepository chatRepository;
    private final ChatParticipantRepository chatParticipantRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final FcmNotificationService fcmNotificationService;
    private final FcmTokenService fcmTokenService;
    private final ObjectMapper objectMapper;
    private final ApplicationContext applicationContext;
    private final DashboardStatisticsService dashboardStatisticsService;

    @Autowired
    public ChatWebSocketService(ChatRepository chatRepository,
                               ChatParticipantRepository chatParticipantRepository,
                               MessageRepository messageRepository,
                               UserRepository userRepository,
                               FcmNotificationService fcmNotificationService,
                               FcmTokenService fcmTokenService,
                               ObjectMapper objectMapper,
                               ApplicationContext applicationContext,
                               DashboardStatisticsService dashboardStatisticsService) {
        this.chatRepository = chatRepository;
        this.chatParticipantRepository = chatParticipantRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.fcmNotificationService = fcmNotificationService;
        this.fcmTokenService = fcmTokenService;
        this.objectMapper = objectMapper;
        this.applicationContext = applicationContext;
        this.dashboardStatisticsService = dashboardStatisticsService;
    }

    @Transactional
    public void handleMessage(ChatMessageRequest request, Long userId) {
        try {
            logger.info("Otrzymano wiadomość WebSocket od użytkownika {}: {}", userId, request);

            if ("SUBSCRIBE".equals(request.getType())) {
                handleSubscribe(request, userId);
            } else if ("MARK_READ".equals(request.getType())) {
                handleMarkAsRead(request, userId);
            } else if (request.getChatId() != null) {
                handleExistingChatMessage(request, userId);
            } else if (request.getRecipientId() != null) {
                handleNewChatMessage(request, userId);
            } else {
                logger.error("Nieprawidłowa struktura wiadomości: {}", request);
            }

        } catch (Exception e) {
            logger.error("Błąd podczas obsługi wiadomości WebSocket", e);
        }
    }

    private void handleSubscribe(ChatMessageRequest request, Long userId) {
        Long chatId = request.getChatId();
        if (chatId == null) {
            logger.error("ChatId wymagane dla subskrypcji");
            return;
        }

        // Sprawdź czy użytkownik ma dostęp do czatu
        if (!chatParticipantRepository.existsByChatIdAndUserIdAndLeftAtIsNull(chatId, userId)) {
            logger.error("Użytkownik {} nie ma dostępu do czatu {}", userId, chatId);
            return;
        }

        // Dodaj użytkownika do grupy czatu - użyj ApplicationContext
        WebSocketChatHandler webSocketHandler = applicationContext.getBean(WebSocketChatHandler.class);
        webSocketHandler.addUserToChat(chatId, userId);
        logger.info("Użytkownik {} zasubskrybował czat {}", userId, chatId);
    }

    private void handleMarkAsRead(ChatMessageRequest request, Long userId) {
        Long chatId = request.getChatId();
        if (chatId == null) {
            logger.error("ChatId wymagane dla oznaczania jako przeczytane");
            return;
        }

        // Sprawdź czy użytkownik ma dostęp do czatu
        if (!chatParticipantRepository.existsByChatIdAndUserIdAndLeftAtIsNull(chatId, userId)) {
            logger.error("Użytkownik {} nie ma dostępu do czatu {}", userId, chatId);
            return;
        }

        // Oznacz wiadomości jako przeczytane
        Optional<ChatParticipantEntity> participant = chatParticipantRepository
                .findByChatIdAndUserIdAndLeftAtIsNull(chatId, userId);

        if (participant.isPresent()) {
            // Znajdź najnowszą wiadomość w czacie
            MessageEntity lastMessageEntity = messageRepository.findLastMessageByChatId(chatId);
            if (lastMessageEntity != null) {
                ChatParticipantEntity chatParticipantEntity = participant.get();
                chatParticipantEntity.setLastReadMessageId(lastMessageEntity.getId());
                chatParticipantRepository.save(chatParticipantEntity);
                logger.info("Użytkownik {} oznaczył wiadomości jako przeczytane w czacie {}", userId, chatId);
            }
        }
    }

    private void handleExistingChatMessage(ChatMessageRequest request, Long userId) {
        Long chatId = request.getChatId();

        // Sprawdź czy użytkownik ma dostęp do czatu
        if (!chatParticipantRepository.existsByChatIdAndUserIdAndLeftAtIsNull(chatId, userId)) {
            logger.error("Użytkownik {} nie ma dostępu do czatu {}", userId, chatId);
            return;
        }

        // Pobierz użytkownika
        UserModel user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

        // Pobierz czat
        ChatEntity chatEntity = chatRepository.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Czat nie znaleziony"));

        // Utwórz wiadomość
        MessageEntity messageEntity = new MessageEntity();
        messageEntity.setChat(chatEntity);
        messageEntity.setSender(user);
        messageEntity.setContent(request.getContent());
        messageEntity.setMessageType(MessageType.valueOf(request.getMessageType()));
        messageEntity.setTimestamp(LocalDateTime.now());

        MessageEntity savedMessageEntity = messageRepository.save(messageEntity);

        // Aktualizuj lastMessagePreview i lastMessageTimestamp w czacie
        chatEntity.setLastMessagePreview(messageEntity.getContent());
        chatEntity.setLastMessageTimestamp(messageEntity.getTimestamp());
        chatRepository.save(chatEntity);

        // Konwertuj na DTO
        ChatMessageResponse response = convertToChatMessageResponse(savedMessageEntity);

        // Wyślij do wszystkich uczestników czatu (oprócz nadawcy)
        String responseJson;
        try {
            responseJson = objectMapper.writeValueAsString(response);
            WebSocketChatHandler webSocketHandler = applicationContext.getBean(WebSocketChatHandler.class);
            webSocketHandler.sendMessageToChat(chatId, responseJson);
        } catch (Exception e) {
            logger.error("Błąd podczas serializacji odpowiedzi", e);
        }

        // Wyślij powiadomienie FCM
        sendNotificationToOtherParticipant(chatId, userId, response);

        // Zapisz statystykę wiadomości
        try {
            // Znajdź odbiorcę (drugi uczestnik czatu)
            List<ChatParticipantEntity> participants = chatParticipantRepository.findActiveParticipantsByChatId(chatId);
            Long recipientId = participants.stream()
                    .filter(p -> !p.getUser().getId().equals(userId))
                    .findFirst()
                    .map(p -> p.getUser().getId())
                    .orElse(null);
            
            if (recipientId != null) {
                dashboardStatisticsService.recordMessage(userId, recipientId, chatId);
            }
        } catch (Exception e) {
            logger.warn("Nie udało się zapisać statystyki wiadomości: {}", e.getMessage());
        }

        logger.info("Wiadomość zapisana i wysłana do czatu {}", chatId);
    }

    private void handleNewChatMessage(ChatMessageRequest request, Long userId) {
        Long recipientId = request.getRecipientId();

        // Sprawdź czy odbiorca istnieje
        UserModel recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new RuntimeException("Odbiorca nie znaleziony"));

        // Utwórz lub pobierz czat
        ChatEntity chatEntity = createOrGetPrivateChat(userId, recipientId);

        // Pobierz nadawcę
        UserModel sender = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Nadawca nie znaleziony"));

        // Utwórz wiadomość
        MessageEntity messageEntity = new MessageEntity();
        messageEntity.setChat(chatEntity);
        messageEntity.setSender(sender);
        messageEntity.setContent(request.getContent());
        messageEntity.setMessageType(MessageType.valueOf(request.getMessageType()));
        messageEntity.setTimestamp(LocalDateTime.now());

        MessageEntity savedMessageEntity = messageRepository.save(messageEntity);

        // Aktualizuj lastMessagePreview i lastMessageTimestamp w czacie
        chatEntity.setLastMessagePreview(messageEntity.getContent());
        chatEntity.setLastMessageTimestamp(messageEntity.getTimestamp());
        chatRepository.save(chatEntity);

        // Konwertuj na DTO
        ChatMessageResponse response = convertToChatMessageResponse(savedMessageEntity);

        // Wyślij do odbiorcy
        String responseJson;
        try {
            responseJson = objectMapper.writeValueAsString(response);
            WebSocketChatHandler webSocketHandler = applicationContext.getBean(WebSocketChatHandler.class);
            webSocketHandler.sendMessageToUser(recipientId, responseJson);
        } catch (Exception e) {
            logger.error("Błąd podczas serializacji odpowiedzi", e);
        }

        // Wyślij powiadomienie FCM
        sendNotificationToOtherParticipant(chatEntity.getId(), userId, response);

        // Zapisz statystykę wiadomości
        try {
            dashboardStatisticsService.recordMessage(userId, recipientId, chatEntity.getId());
        } catch (Exception e) {
            logger.warn("Nie udało się zapisać statystyki wiadomości: {}", e.getMessage());
        }

        logger.info("Nowa wiadomość utworzona w czacie {}", chatEntity.getId());
    }

    private ChatEntity createOrGetPrivateChat(Long user1Id, Long user2Id) {
        // Sprawdź czy czat już istnieje
        Optional<ChatEntity> existingChat = chatRepository.findPrivateChatBetweenUsers(user1Id, user2Id);

        if (existingChat.isPresent()) {
            return existingChat.get();
        }

        // Utwórz nowy czat
        ChatEntity newChatEntity = new ChatEntity();
        newChatEntity.setCreatedAt(LocalDateTime.now());
        ChatEntity savedChatEntity = chatRepository.save(newChatEntity);

        // Dodaj uczestników
        UserModel user1 = userRepository.findById(user1Id)
                .orElseThrow(() -> new RuntimeException("Użytkownik 1 nie znaleziony"));
        UserModel user2 = userRepository.findById(user2Id)
                .orElseThrow(() -> new RuntimeException("Użytkownik 2 nie znaleziony"));

        ChatParticipantEntity participant1 = new ChatParticipantEntity();
        participant1.setChat(savedChatEntity);
        participant1.setUser(user1);
        participant1.setJoinedAt(LocalDateTime.now());
        chatParticipantRepository.save(participant1);

        ChatParticipantEntity participant2 = new ChatParticipantEntity();
        participant2.setChat(savedChatEntity);
        participant2.setUser(user2);
        participant2.setJoinedAt(LocalDateTime.now());
        chatParticipantRepository.save(participant2);

        return savedChatEntity;
    }

    private ChatMessageResponse convertToChatMessageResponse(MessageEntity messageEntity) {
        ChatMessageResponse response = new ChatMessageResponse();
        response.setId(messageEntity.getId());
        response.setChatId(messageEntity.getChat().getId());
        response.setSenderId(messageEntity.getSender().getId());
        response.setSenderName(messageEntity.getSender().getFirstName() + " " + messageEntity.getSender().getLastName());
        response.setContent(messageEntity.getContent());
        response.setTimestamp(messageEntity.getTimestamp().format(DateTimeFormatter.ISO_DATE_TIME));
        response.setMessageType(messageEntity.getMessageType().name());
        response.setChatType("REGULAR");
        return response;
    }

    private void sendNotificationToOtherParticipant(Long chatId, Long senderId, ChatMessageResponse messageResponse) {
        List<ChatParticipantEntity> participants = chatParticipantRepository.findActiveParticipantsByChatId(chatId);

        for (ChatParticipantEntity participant : participants) {
            if (!participant.getUser().getId().equals(senderId)) {
                UserModel user = participant.getUser();
                List<FcmToken> tokens = fcmTokenService.getValidTokensForUser(user);
                for (FcmToken token : tokens) {
                    fcmNotificationService.sendNotification(
                        token.getToken(),
                        "Give n' Get. Nowa wiadomość od użytkownika " + messageResponse.getSenderName(),
                        messageResponse.getContent(),
                        "/chats?userId=" + senderId
                    );
                }
                break; // Only send to one other participant in 1-on-1 chat
            }
        }
    }
}