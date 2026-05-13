package com.example.gng.chat.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequest {
    private String fcmToken;
    private String title;
    private String body;
    private String clickAction;
    private String data;
} 