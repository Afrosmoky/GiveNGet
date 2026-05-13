package com.example.gng.chat.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateFcmTokenRequest {
    private String fcmToken;
    private String oldFcmToken;
    private String deviceName;
}