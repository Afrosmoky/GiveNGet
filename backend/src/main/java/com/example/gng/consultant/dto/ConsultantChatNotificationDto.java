package com.example.gng.consultant.dto;

import lombok.Data;

/**
 * DTO dla powiadomień WebSocket o nowych czatach z konsultantem lub zmianach statusu
 */
@Data
public class ConsultantChatNotificationDto {
    private String type; // "NEW_CHAT", "CHAT_ASSIGNED", "CHAT_UNASSIGNED", "NEW_MESSAGE"
    private ConsultantChatDto chat;
    private ConsultantMessageDto message; // Tylko dla typu "NEW_MESSAGE"
}

