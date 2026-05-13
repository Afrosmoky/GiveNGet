package com.example.gng.chat.dto;

import com.example.gng.chat.enums.MessageType;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageRequest {
    private String type; // "SUBSCRIBE", "MARK_READ" lub null
    private Long chatId;
    private Long senderId;
    private Long recipientId;
    private String content;
    private String messageType;
} 