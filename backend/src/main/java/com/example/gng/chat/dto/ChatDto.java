package com.example.gng.chat.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatDto {
    private Long id;
    private String avatarUrl;
    private LocalDateTime createdAt;
    private Long otherParticipantId;
    private String otherParticipantName;
    private String lastMessagePreview;
    private LocalDateTime lastMessageTimestamp;
    private Integer unreadCount;
}