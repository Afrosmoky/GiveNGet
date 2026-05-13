package com.example.gng.consultant.dto;

import com.example.gng.chat.enums.MessageType;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ConsultantMessageDto {
    private Long id;
    private Long chatId;
    private Long senderId;
    private String senderName;
    private String content;
    private LocalDateTime timestamp;
    private MessageType messageType;
    private String chatType; // "REGULAR" lub "CONSULTANT"
}

