package com.example.gng.consultant.dto;

import lombok.Data;

@Data
public class SendConsultantMessageRequest {
    private Long chatId;
    private String content;
    private String messageType = "TEXT";
}

