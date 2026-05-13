package com.example.gng.complaint.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ComplaintNoteResponse {
    private Long id;
    private Long complaintId;
    private Long authorId;
    private String authorName;
    private String content;
    private LocalDateTime createdAt;
}

