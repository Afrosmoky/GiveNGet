package com.example.gng.chat.dto;

import com.example.gng.chat.enums.MessageType;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageRequest {
    private Long chatId; // null dla pierwszej wiadomości
    private Long recipientId; // ID odbiorcy (wymagane gdy chatId jest null)
    private String content;
    private MessageType messageType;
} 