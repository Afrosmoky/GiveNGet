package com.example.gng.consultant.dto;

import com.example.gng.consultant.entity.ConsultantChatStatus;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ConsultantChatDto {
    private Long id;
    private Long userId;
    private String userName;
    private Long moderatorId;
    private String moderatorName;
    private ConsultantChatStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime lastMessageAt;
    private LocalDateTime closedAt;
    private String lastMessagePreview;
}

