package com.example.gng.complaint.dto;

import lombok.Data;

@Data
public class ComplaintRequest {
    private Long reportedUserId;
    private Long chatId;
    private Long messageId;
    private String offerId;
    private String explanation;
} 