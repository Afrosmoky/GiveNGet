package com.example.gng.chat.service;

import com.example.gng.chat.dto.*;
import com.example.gng.chat.entity.ChatEntity;
import com.example.gng.chat.entity.ChatParticipantEntity;
import com.example.gng.chat.entity.MessageEntity;
import com.example.gng.chat.repository.ChatParticipantRepository;
import com.example.gng.chat.repository.ChatRepository;
import com.example.gng.chat.repository.MessageRepository;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@Service
public class ChatService {

    private final ChatRepository chatRepository;
    private final ChatParticipantRepository chatParticipantRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    @Autowired
    public ChatService(ChatRepository chatRepository,
                      ChatParticipantRepository chatParticipantRepository,
                      MessageRepository messageRepository,
                      UserRepository userRepository) {
        this.chatRepository = chatRepository;
        this.chatParticipantRepository = chatParticipantRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }



    /**
     * Pobierz wszystkie czaty użytkownika
     */
    public List<ChatDto> getUserChats(Long userId) {
        List<ChatEntity> chatEntities = chatRepository.findChatsByUserId(userId);
        return chatEntities.stream()
                .map(chat -> convertChatToDto(chat, userId))
                .sorted((f, s) -> {
                    LocalDateTime ts1 = s.getLastMessageTimestamp();
                    LocalDateTime ts2 = f.getLastMessageTimestamp();
                    if (ts1 == null && ts2 == null) return 0;
                    if (ts1 == null) return 1;
                    if (ts2 == null) return -1;
                    return ts1.compareTo(ts2);
                })
                .collect(Collectors.toList());
    }

    /**
     * Pobierz wiadomości czatu z paginacją
     */
    public Page<MessageDto> getChatMessages(Long chatId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<MessageEntity> messagePage = messageRepository.findByChatIdOrderByTimestampDesc(chatId, pageable);
        return messagePage.map(this::convertMessageToDto);
    }

    /**
     * Pobierz fragment rozmowy: wiadomość o podanym ID oraz 5 wcześniejszych i 5 późniejszych (jeśli istnieją)
     */
    public java.util.List<MessageDto> getConversationSnippet(Long chatId, Long messageId) {
        MessageEntity center = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Wiadomość nie znaleziona"));
        if (!center.getChat().getId().equals(chatId)) {
            throw new RuntimeException("Wiadomość nie należy do zadanego czatu");
        }

        // 5 wcześniejszych (DESC) i 5 późniejszych (ASC)
        java.util.List<MessageEntity> before = messageRepository
                .findByChatIdAndTimestampLessThanOrderByTimestampDesc(chatId, center.getTimestamp(), PageRequest.of(0, 5));
        java.util.List<MessageEntity> after = messageRepository
                .findByChatIdAndTimestampGreaterThanOrderByTimestampAsc(chatId, center.getTimestamp(), PageRequest.of(0, 5));

        // Złóż wynik: wcześniej (ASC), center, później (ASC)
        java.util.List<MessageEntity> resultEntities = new java.util.ArrayList<>();
        java.util.Collections.reverse(before); // teraz rosnąco
        resultEntities.addAll(before);
        resultEntities.add(center);
        resultEntities.addAll(after);

        return resultEntities.stream().map(this::convertMessageToDto).toList();
    }


    /**
     * Utwórz lub pobierz prywatny czat między dwoma użytkownikami
     */
    @Transactional
    public ChatEntity createOrGetPrivateChat(Long user1Id, Long user2Id) {
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

    /**
     * Konwertuj Chat na ChatDto
     */
    private ChatDto convertChatToDto(ChatEntity chatEntity, Long currentUserId) {
        ChatDto dto = new ChatDto();
        dto.setId(chatEntity.getId());
        dto.setCreatedAt(chatEntity.getCreatedAt());
        // Znajdź drugiego uczestnika
        Optional<ChatParticipantEntity> otherParticipant = chatEntity.getParticipants().stream()
                .filter(p -> !p.getUser().getId().equals(currentUserId))
                .findFirst();

        if (otherParticipant.isPresent()) {
            UserModel otherUser = otherParticipant.get().getUser();
            dto.setOtherParticipantId(otherUser.getId());
            dto.setOtherParticipantName(otherUser.getFirstName() + " " + otherUser.getLastName());
            dto.setAvatarUrl(otherUser.getAvatar() != null ? otherUser.getAvatar().getFilePath() : null);
        }

        // Pobierz ostatnią wiadomość
        MessageEntity lastMessageEntity = messageRepository.findLastMessageByChatId(chatEntity.getId());
        if (lastMessageEntity != null) {
            dto.setLastMessagePreview(lastMessageEntity.getContent());
            dto.setLastMessageTimestamp(lastMessageEntity.getTimestamp());
        }

        // Implementacja logiki nieodczytanych wiadomości
        int unreadCount = chatParticipantRepository.countUnreadMessages(chatEntity.getId(), currentUserId);
        dto.setUnreadCount(unreadCount);

        return dto;
    }

    /**
     * Konwertuj Message na MessageDto
     */
    private MessageDto convertMessageToDto(MessageEntity messageEntity) {
        MessageDto dto = new MessageDto();
        dto.setId(messageEntity.getId());
        dto.setChatId(messageEntity.getChat().getId());
        dto.setSenderId(messageEntity.getSender().getId());
        dto.setSenderName(messageEntity.getSender().getFirstName() + " " + messageEntity.getSender().getLastName());
        dto.setContent(messageEntity.getContent());
        dto.setTimestamp(messageEntity.getTimestamp());
        dto.setMessageType(messageEntity.getMessageType());
        return dto;
    }

    /**
     * Oznacz wiadomości jako przeczytane dla użytkownika w czacie
     */
    @Transactional
    public void markMessagesAsRead(Long chatId, Long userId) {
        Optional<ChatParticipantEntity> participant = chatParticipantRepository
                .findByChatIdAndUserIdAndLeftAtIsNull(chatId, userId);

        if (participant.isPresent()) {
            // Znajdź najnowszą wiadomość w czacie
            MessageEntity lastMessageEntity = messageRepository.findLastMessageByChatId(chatId);
            if (lastMessageEntity != null) {
                ChatParticipantEntity chatParticipantEntity = participant.get();
                chatParticipantEntity.setLastReadMessageId(lastMessageEntity.getId());
                chatParticipantRepository.save(chatParticipantEntity);
            }
        }
    }

    /**
     * Pobierz informacje o niewyświetlonych wiadomościach dla użytkownika
     */
    public List<UnreadMessageInfo> getUnreadMessageInfo(Long userId) {
        List<ChatEntity> userChatEntities = chatRepository.findChatsByUserId(userId);
        List<UnreadMessageInfo> unreadInfo = new ArrayList<>();

        for (ChatEntity chatEntity : userChatEntities) {
            // Sprawdź czy użytkownik ma nieodczytane wiadomości
            int unreadCount = chatParticipantRepository.countUnreadMessages(chatEntity.getId(), userId);

            if (unreadCount > 0) {
                // Znajdź ostatnią wiadomość w czacie
                MessageEntity lastMessageEntity = messageRepository.findLastMessageByChatId(chatEntity.getId());
                if (lastMessageEntity != null) {
                    Long senderId = lastMessageEntity.getSender().getId();
                    if (!userId.equals(senderId)) {
                        // Znajdź nazwę nadawcy ostatniej wiadomości
                        String senderName = lastMessageEntity.getSender().getFirstName() + " " + lastMessageEntity.getSender().getLastName();
                        UnreadMessageInfo info = new UnreadMessageInfo();
                        info.setUserId(senderId);
                        info.setSenderName(senderName);
                        unreadInfo.add(info);
                    }
                }
            }
        }

        return unreadInfo;
    }

}