package com.example.gng.chat.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UnreadMessageInfo {
    private Long userId;
    private String senderName;
}