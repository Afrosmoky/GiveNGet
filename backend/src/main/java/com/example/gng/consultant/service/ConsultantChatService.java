package com.example.gng.consultant.service;

import com.example.gng.chat.enums.MessageType;
import com.example.gng.chat.handler.WebSocketChatHandler;
import com.example.gng.chat.service.FcmNotificationService;
import com.example.gng.chat.service.FcmTokenService;
import com.example.gng.consultant.dto.ConsultantChatDto;
import com.example.gng.consultant.dto.ConsultantChatNotificationDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.gng.consultant.dto.ConsultantMessageDto;
import com.example.gng.consultant.dto.SendConsultantMessageRequest;
import com.example.gng.consultant.entity.ConsultantChatEntity;
import com.example.gng.consultant.entity.ConsultantChatStatus;
import com.example.gng.consultant.entity.ConsultantMessageEntity;
import com.example.gng.consultant.repository.ConsultantChatRepository;
import com.example.gng.consultant.repository.ConsultantMessageRepository;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ConsultantChatService {

    private final ConsultantChatRepository consultantChatRepository;
    private final ConsultantMessageRepository consultantMessageRepository;
    private final UserRepository userRepository;
    private final FcmNotificationService fcmNotificationService;
    private final FcmTokenService fcmTokenService;
    private final ApplicationContext applicationContext;
    private final ObjectMapper objectMapper;

    public ConsultantChatService(ConsultantChatRepository consultantChatRepository,
                                 ConsultantMessageRepository consultantMessageRepository,
                                 UserRepository userRepository,
                                 FcmNotificationService fcmNotificationService,
                                 FcmTokenService fcmTokenService,
                                 ApplicationContext applicationContext,
                                 ObjectMapper objectMapper) {
        this.consultantChatRepository = consultantChatRepository;
        this.consultantMessageRepository = consultantMessageRepository;
        this.userRepository = userRepository;
        this.fcmNotificationService = fcmNotificationService;
        this.fcmTokenService = fcmTokenService;
        this.applicationContext = applicationContext;
        this.objectMapper = objectMapper;
    }

    /**
     * Utworzenie nowego czatu z konsultantem przez użytkownika
     */
    @Transactional
    public ConsultantChatDto createConsultantChat(Long userId) {
        // Sprawdź czy użytkownik ma już aktywny czat
        Optional<ConsultantChatEntity> existingChat = consultantChatRepository.findActiveChatByUserId(userId);
        if (existingChat.isPresent()) {
            return convertToDtoForUser(existingChat.get());
        }

        UserModel user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Użytkownik nie znaleziony"));

        ConsultantChatEntity chat = new ConsultantChatEntity();
        chat.setUser(user);
        chat.setStatus(ConsultantChatStatus.OPENED);

        chat = consultantChatRepository.save(chat);
        log.info("Utworzono nowy czat z konsultantem dla użytkownika {}", userId);

        // Powiadom wszystkich moderatorów o nowym czacie przez WebSocket
        notifyModeratorsAboutNewChat(chat);

        return convertToDtoForUser(chat);
    }

    /**
     * Pobierz wszystkie dostępne czaty dla moderatora
     */
    public List<ConsultantChatDto> getAvailableChatsForModerator(Long moderatorId) {
        List<ConsultantChatEntity> chats = consultantChatRepository.findAvailableChatsForModerator(moderatorId);
        return chats.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Przypisz czat do moderatora
     */
    @Transactional
    public ConsultantChatDto assignChatToModerator(Long chatId, Long moderatorId) {
        ConsultantChatEntity chat = consultantChatRepository.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Czat nie znaleziony"));

        UserModel moderator = userRepository.findById(moderatorId)
                .orElseThrow(() -> new RuntimeException("Moderator nie znaleziony"));

        chat.setModerator(moderator);
        chat.setStatus(ConsultantChatStatus.ASSIGNED);
        chat = consultantChatRepository.save(chat);

        log.info("Czat {} przypisany do moderatora {}", chatId, moderatorId);
        
        // Powiadom wszystkich moderatorów o przypisaniu czatu
        notifyModeratorsAboutChatStatusChange(chat, "CHAT_ASSIGNED");

        return convertToDto(chat);
    }

    /**
     * Odepnij czat od moderatora
     */
    @Transactional
    public ConsultantChatDto unassignChatFromModerator(Long chatId) {
        ConsultantChatEntity chat = consultantChatRepository.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Czat nie znaleziony"));

        chat.setModerator(null);
        chat.setStatus(ConsultantChatStatus.OPENED);
        chat = consultantChatRepository.save(chat);

        log.info("Czat {} odpięty od moderatora", chatId);
        
        // Powiadom wszystkich moderatorów o odpięciu czatu
        notifyModeratorsAboutChatStatusChange(chat, "CHAT_UNASSIGNED");

        return convertToDto(chat);
    }

    /**
     * Zamknij czat przez użytkownika
     */
    @Transactional
    public void closeChat(Long chatId, Long userId) {
        ConsultantChatEntity chat = consultantChatRepository.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Czat nie znaleziony"));

        // Sprawdź czy użytkownik jest właścicielem czatu
        if (!chat.getUser().getId().equals(userId)) {
            throw new RuntimeException("Brak uprawnień do zamknięcia tego czatu");
        }

        chat.setStatus(ConsultantChatStatus.CLOSED);
        chat.setClosedAt(LocalDateTime.now());
        consultantChatRepository.save(chat);

        log.info("Czat {} zamknięty przez użytkownika {}", chatId, userId);
    }

    /**
     * Zamknij czat automatycznie (przez scheduler)
     */
    @Transactional
    public void closeChatAutomatically(Long chatId) {
        ConsultantChatEntity chat = consultantChatRepository.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Czat nie znaleziony"));

        chat.setStatus(ConsultantChatStatus.CLOSED);
        chat.setClosedAt(LocalDateTime.now());
        consultantChatRepository.save(chat);

        log.info("Czat {} zamknięty automatycznie (brak aktywności)", chatId);
    }

    /**
     * Wyślij wiadomość w czacie z konsultantem
     */
    @Transactional
    public ConsultantMessageDto sendMessage(SendConsultantMessageRequest request, Long senderId) {
        ConsultantChatEntity chat = consultantChatRepository.findById(request.getChatId())
                .orElseThrow(() -> new RuntimeException("Czat nie znaleziony"));

        // Sprawdź uprawnienia - użytkownik może wysyłać wiadomości tylko do swoich czatów,
        // moderator może wysyłać tylko do przypisanych czatów
        boolean isUser = chat.getUser().getId().equals(senderId);
        boolean isModerator = chat.getModerator() != null && chat.getModerator().getId().equals(senderId);

        if (!isUser && !isModerator) {
            throw new RuntimeException("Brak uprawnień do wysłania wiadomości w tym czacie");
        }

        UserModel sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Nadawca nie znaleziony"));

        ConsultantMessageEntity message = new ConsultantMessageEntity();
        message.setChat(chat);
        message.setSender(sender);
        message.setContent(request.getContent());
        message.setMessageType(MessageType.valueOf(request.getMessageType()));

        message = consultantMessageRepository.save(message);

        // Aktualizuj lastMessageAt w czacie
        chat.setLastMessageAt(LocalDateTime.now());
        consultantChatRepository.save(chat);

        // Konwertuj na DTO dla WebSocket
        ConsultantMessageDto messageDto = convertMessageToDto(message);
        
        // Wyślij wiadomość przez WebSocket do drugiego uczestnika
        sendMessageViaWebSocket(chat, messageDto, senderId);

        // Wyślij powiadomienie FCM do drugiego uczestnika
        sendNotificationToOtherParticipant(chat, senderId);

        log.info("Wiadomość wysłana w czacie z konsultantem {}", request.getChatId());
        return messageDto;
    }

    /**
     * Wysyła wiadomość przez WebSocket do drugiego uczestnika czatu
     */
    private void sendMessageViaWebSocket(ConsultantChatEntity chat, ConsultantMessageDto messageDto, Long senderId) {
        try {
            // Znajdź odbiorcę
            Long recipientId = null;
            if (chat.getUser().getId().equals(senderId)) {
                // Użytkownik wysłał - wyślij do moderatora
                if (chat.getModerator() != null) {
                    recipientId = chat.getModerator().getId();
                }
            } else {
                // Moderator wysłał - wyślij do użytkownika
                recipientId = chat.getUser().getId();
            }

            if (recipientId != null) {
                // Utwórz odpowiedź w formacie JSON
                String responseJson = objectMapper.writeValueAsString(messageDto);
                
                // Wyślij przez WebSocket
                WebSocketChatHandler webSocketHandler = applicationContext.getBean(WebSocketChatHandler.class);
                webSocketHandler.sendMessageToUser(recipientId, responseJson);
            }
            
            // Powiadom wszystkich moderatorów o nowej wiadomości w czacie (jeśli czat nie jest przypisany)
            if (chat.getStatus() == ConsultantChatStatus.OPENED) {
                notifyModeratorsAboutNewMessage(chat, messageDto);
            }
        } catch (Exception e) {
            log.warn("Nie udało się wysłać wiadomości przez WebSocket: {}", e.getMessage());
        }
    }

    /**
     * Powiadamia wszystkich moderatorów o nowym czacie z konsultantem
     */
    private void notifyModeratorsAboutNewChat(ConsultantChatEntity chat) {
        try {
            // Znajdź wszystkich moderatorów (EMPLOYEE lub ADMIN)
            List<UserModel> moderators = userRepository.findAllModerators();

            ConsultantChatDto chatDto = convertToDto(chat);
            ConsultantChatNotificationDto notification = new ConsultantChatNotificationDto();
            notification.setType("NEW_CHAT");
            notification.setChat(chatDto);

            String notificationJson = objectMapper.writeValueAsString(notification);
            WebSocketChatHandler webSocketHandler = applicationContext.getBean(WebSocketChatHandler.class);

            for (UserModel moderator : moderators) {
                webSocketHandler.sendMessageToUser(moderator.getId(), notificationJson);
            }

            log.info("Powiadomiono {} moderatorów o nowym czacie {}", moderators.size(), chat.getId());
        } catch (Exception e) {
            log.warn("Nie udało się powiadomić moderatorów o nowym czacie: {}", e.getMessage());
        }
    }

    /**
     * Powiadamia wszystkich moderatorów o zmianie statusu czatu (przypisanie/odpięcie)
     */
    private void notifyModeratorsAboutChatStatusChange(ConsultantChatEntity chat, String notificationType) {
        try {
            // Znajdź wszystkich moderatorów (EMPLOYEE lub ADMIN)
            List<UserModel> moderators = userRepository.findAllModerators();

            ConsultantChatDto chatDto = convertToDto(chat);
            ConsultantChatNotificationDto notification = new ConsultantChatNotificationDto();
            notification.setType(notificationType);
            notification.setChat(chatDto);

            String notificationJson = objectMapper.writeValueAsString(notification);
            WebSocketChatHandler webSocketHandler = applicationContext.getBean(WebSocketChatHandler.class);

            for (UserModel moderator : moderators) {
                webSocketHandler.sendMessageToUser(moderator.getId(), notificationJson);
            }

            log.info("Powiadomiono {} moderatorów o zmianie statusu czatu {}: {}", moderators.size(), chat.getId(), notificationType);
        } catch (Exception e) {
            log.warn("Nie udało się powiadomić moderatorów o zmianie statusu czatu: {}", e.getMessage());
        }
    }

    /**
     * Powiadamia wszystkich moderatorów o nowej wiadomości w nieprzypisanym czacie
     */
    private void notifyModeratorsAboutNewMessage(ConsultantChatEntity chat, ConsultantMessageDto messageDto) {
        try {
            // Znajdź wszystkich moderatorów (EMPLOYEE lub ADMIN)
            List<UserModel> moderators = userRepository.findAllModerators();

            ConsultantChatDto chatDto = convertToDto(chat);
            ConsultantChatNotificationDto notification = new ConsultantChatNotificationDto();
            notification.setType("NEW_MESSAGE");
            notification.setChat(chatDto);
            notification.setMessage(messageDto);

            String notificationJson = objectMapper.writeValueAsString(notification);
            WebSocketChatHandler webSocketHandler = applicationContext.getBean(WebSocketChatHandler.class);

            for (UserModel moderator : moderators) {
                webSocketHandler.sendMessageToUser(moderator.getId(), notificationJson);
            }

            log.debug("Powiadomiono {} moderatorów o nowej wiadomości w czacie {}", moderators.size(), chat.getId());
        } catch (Exception e) {
            log.warn("Nie udało się powiadomić moderatorów o nowej wiadomości: {}", e.getMessage());
        }
    }

    /**
     * Pobierz wiadomości z czatu
     */
    public List<ConsultantMessageDto> getChatMessages(Long chatId, Long userId) {
        ConsultantChatEntity chat = consultantChatRepository.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Czat nie znaleziony"));

        // Sprawdź uprawnienia
        boolean isUser = chat.getUser().getId().equals(userId);
        boolean isModerator = chat.getModerator() != null && chat.getModerator().getId().equals(userId);

        if (!isUser && !isModerator) {
            throw new RuntimeException("Brak uprawnień do wyświetlenia wiadomości");
        }

        List<ConsultantMessageEntity> messages = consultantMessageRepository.findByChatIdOrderByTimestampAsc(chatId);
        return messages.stream()
                .map(this::convertMessageToDto)
                .collect(Collectors.toList());
    }

    /**
     * Pobierz czaty użytkownika
     */
    public List<ConsultantChatDto> getUserChats(Long userId) {
        List<ConsultantChatEntity> chats = consultantChatRepository.findActiveChatsByUserId(userId);
        return chats.stream()
                .map(this::convertToDtoForUser)
                .collect(Collectors.toList());
    }

    private void sendNotificationToOtherParticipant(ConsultantChatEntity chat, Long senderId) {
        UserModel recipient = null;
        String senderName = "";
        String clickAction = "";

        if (chat.getUser().getId().equals(senderId)) {
            // Użytkownik wysyła wiadomość - powiadom moderatora
            if (chat.getModerator() != null) {
                recipient = chat.getModerator();
                senderName = chat.getUser().getFirstName() + " " + chat.getUser().getLastName();
                clickAction = "/consultant-chat?chatId=" + chat.getId();
            }
        } else {
            // Moderator wysyła wiadomość - powiadom użytkownika
            recipient = chat.getUser();
            senderName = "Konsultant";
            clickAction = "/consultant-chat?chatId=" + chat.getId();
        }

        if (recipient != null) {
            // Pobierz ostatnią wiadomość
            List<ConsultantMessageEntity> messages = consultantMessageRepository.findByChatIdOrderByTimestampAsc(chat.getId());
            String lastMessageContent = "";
            if (!messages.isEmpty()) {
                lastMessageContent = messages.get(messages.size() - 1).getContent();
            }

            List<com.example.gng.chat.entity.FcmToken> tokens = fcmTokenService.getValidTokensForUser(recipient);
            for (com.example.gng.chat.entity.FcmToken token : tokens) {
                fcmNotificationService.sendNotification(
                        token.getToken(),
                        "Give n' Get. Nowa wiadomość w czacie z konsultantem",
                        senderName + ": " + lastMessageContent,
                        clickAction
                );
            }
        }
    }

    /**
     * Konwertuje encję czatu na DTO dla użytkownika (bez informacji o moderatorze)
     */
    private ConsultantChatDto convertToDtoForUser(ConsultantChatEntity chat) {
        ConsultantChatDto dto = new ConsultantChatDto();
        dto.setId(chat.getId());
        dto.setUserId(chat.getUser().getId());
        dto.setUserName(chat.getUser().getFirstName() + " " + chat.getUser().getLastName());
        
        // NIE ustawiamy moderatorId i moderatorName dla użytkownika
        dto.setModeratorId(null);
        dto.setModeratorName(null);
        
        // Status ustawiamy na "OPENED" niezależnie od rzeczywistego statusu (użytkownik nie powinien widzieć ASSIGNED)
        dto.setStatus(ConsultantChatStatus.OPENED);
        dto.setCreatedAt(chat.getCreatedAt());
        dto.setLastMessageAt(chat.getLastMessageAt());
        dto.setClosedAt(chat.getClosedAt());
        
        // Ustaw lastMessagePreview jeśli istnieją wiadomości
        List<ConsultantMessageEntity> messages = consultantMessageRepository.findByChatIdOrderByTimestampAsc(chat.getId());
        if (!messages.isEmpty()) {
            ConsultantMessageEntity lastMessage = messages.get(messages.size() - 1);
            dto.setLastMessagePreview(lastMessage.getContent());
        }
        
        return dto;
    }

    /**
     * Konwertuje encję czatu na DTO dla moderatora (z pełnymi informacjami)
     */
    private ConsultantChatDto convertToDto(ConsultantChatEntity chat) {
        ConsultantChatDto dto = new ConsultantChatDto();
        dto.setId(chat.getId());
        dto.setUserId(chat.getUser().getId());
        dto.setUserName(chat.getUser().getFirstName() + " " + chat.getUser().getLastName());
        
        if (chat.getModerator() != null) {
            dto.setModeratorId(chat.getModerator().getId());
            dto.setModeratorName(chat.getModerator().getFirstName() + " " + chat.getModerator().getLastName());
        }
        
        dto.setStatus(chat.getStatus());
        dto.setCreatedAt(chat.getCreatedAt());
        dto.setLastMessageAt(chat.getLastMessageAt());
        dto.setClosedAt(chat.getClosedAt());
        
        // Ustaw lastMessagePreview jeśli istnieją wiadomości
        List<ConsultantMessageEntity> messages = consultantMessageRepository.findByChatIdOrderByTimestampAsc(chat.getId());
        if (!messages.isEmpty()) {
            ConsultantMessageEntity lastMessage = messages.get(messages.size() - 1);
            dto.setLastMessagePreview(lastMessage.getContent());
        }
        
        return dto;
    }

    private ConsultantMessageDto convertMessageToDto(ConsultantMessageEntity message) {
        ConsultantMessageDto dto = new ConsultantMessageDto();
        dto.setId(message.getId());
        dto.setChatId(message.getChat().getId());
        dto.setSenderId(message.getSender().getId());
        dto.setSenderName(message.getSender().getFirstName() + " " + message.getSender().getLastName());
        dto.setContent(message.getContent());
        dto.setTimestamp(message.getTimestamp());
        dto.setMessageType(message.getMessageType());
        dto.setChatType("CONSULTANT");
        return dto;
    }
}

