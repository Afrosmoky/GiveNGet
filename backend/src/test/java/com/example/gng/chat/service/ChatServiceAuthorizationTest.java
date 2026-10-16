package com.example.gng.chat.service;

import com.example.gng.chat.entity.ChatEntity;
import com.example.gng.chat.entity.MessageEntity;
import com.example.gng.chat.enums.MessageType;
import com.example.gng.chat.repository.ChatParticipantRepository;
import com.example.gng.chat.repository.ChatRepository;
import com.example.gng.chat.repository.MessageRepository;
import com.example.gng.common.exception.ForbiddenOperationException;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Dostęp do historii rozmowy.
 *
 * Przed poprawką {@code getChatMessages} nie sprawdzała, kto pyta — przy regule
 * {@code permitAll} na /api/chats/** pozwalało to przeczytać dowolną rozmowę na platformie
 * przez iterowanie sekwencyjnych identyfikatorów czatu.
 */
class ChatServiceAuthorizationTest {

    private static final Long CHAT_ID = 42L;
    private static final Long PARTICIPANT_ID = 1L;
    private static final Long OUTSIDER_ID = 999L;

    @Mock private ChatRepository chatRepository;
    @Mock private ChatParticipantRepository chatParticipantRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private UserRepository userRepository;

    private AutoCloseable mocks;
    private ChatService chatService;

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);
        chatService = new ChatService(chatRepository, chatParticipantRepository,
                messageRepository, userRepository);
    }

    @AfterEach
    void tearDown() throws Exception {
        mocks.close();
    }

    @Test
    void participantCanReadConversation() {
        when(chatParticipantRepository.existsByChatIdAndUserIdAndLeftAtIsNull(CHAT_ID, PARTICIPANT_ID))
                .thenReturn(true);
        when(messageRepository.findByChatIdOrderByTimestampDesc(eq(CHAT_ID), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(message("cześć")), PageRequest.of(0, 20), 1));

        var messages = chatService.getChatMessages(CHAT_ID, PARTICIPANT_ID, 0, 20);

        assertEquals(1, messages.getTotalElements());
        assertEquals("cześć", messages.getContent().get(0).getContent());
    }

    @Test
    void outsiderCannotReadConversation() {
        when(chatParticipantRepository.existsByChatIdAndUserIdAndLeftAtIsNull(CHAT_ID, OUTSIDER_ID))
                .thenReturn(false);

        ForbiddenOperationException ex = assertThrows(ForbiddenOperationException.class,
                () -> chatService.getChatMessages(CHAT_ID, OUTSIDER_ID, 0, 20));

        assertEquals("FORBIDDEN", ex.getCode());
        // Najważniejsze: baza wiadomości nie jest w ogóle odpytywana
        verify(messageRepository, never()).findByChatIdOrderByTimestampDesc(anyLong(), any(Pageable.class));
    }

    @Test
    void formerParticipantCannotReadConversation() {
        // Uczestnik, który opuścił czat (leftAt != null), nie przechodzi warunku repozytorium
        when(chatParticipantRepository.existsByChatIdAndUserIdAndLeftAtIsNull(CHAT_ID, PARTICIPANT_ID))
                .thenReturn(false);

        assertThrows(ForbiddenOperationException.class,
                () -> chatService.getChatMessages(CHAT_ID, PARTICIPANT_ID, 0, 20));
    }

    @Test
    void missingIdentityIsRejectedWithoutTouchingDatabase() {
        // Gdyby kontroler kiedyś przekazał null zamiast identyfikatora użytkownika
        assertThrows(ForbiddenOperationException.class,
                () -> chatService.getChatMessages(CHAT_ID, null, 0, 20));

        verify(chatParticipantRepository, never())
                .existsByChatIdAndUserIdAndLeftAtIsNull(anyLong(), anyLong());
        verify(messageRepository, never()).findByChatIdOrderByTimestampDesc(anyLong(), any(Pageable.class));
    }

    private MessageEntity message(String content) {
        ChatEntity chat = new ChatEntity();
        chat.setId(CHAT_ID);

        UserModel sender = new UserModel();
        sender.setId(PARTICIPANT_ID);
        sender.setFirstName("Jan");
        sender.setLastName("Testowy");

        MessageEntity entity = new MessageEntity();
        entity.setId(1L);
        entity.setChat(chat);
        entity.setSender(sender);
        entity.setContent(content);
        entity.setMessageType(MessageType.TEXT);
        entity.setTimestamp(LocalDateTime.now());
        return entity;
    }
}
