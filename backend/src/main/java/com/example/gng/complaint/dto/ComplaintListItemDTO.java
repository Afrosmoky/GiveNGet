package com.example.gng.complaint.dto;

import java.time.LocalDateTime;

public class ComplaintListItemDTO {
    public enum Type { CHAT, OFFER }

    private Long id;
    private Type type;
    private String explanation;
    private Long reporterId;
    private String reporterUserName;
    private Long reportedUserId;
    private String reportedUserName;
    private Long chatId;
    private Long messageId;
    private String offerId;
    private Boolean resolved;
    private LocalDateTime createdAt;
    private Long notesCount;

    public ComplaintListItemDTO(Long id, Type type, String explanation, Long reporterId, String reporterUserName, Long reportedUserId,
                                String reportedUserName, Long chatId, Long messageId, String offerId, Boolean resolved, LocalDateTime createdAt, Long notesCount) {
        this.id = id;
        this.type = type;
        this.explanation = explanation;
        this.reporterId = reporterId;
        this.reporterUserName = reporterUserName;
        this.reportedUserId = reportedUserId;
        this.reportedUserName = reportedUserName;
        this.chatId = chatId;
        this.messageId = messageId;
        this.offerId = offerId;
        this.resolved = resolved;
        this.createdAt = createdAt;
        this.notesCount = notesCount != null ? notesCount : 0L;
    }

    public Long getId() { return id; }
    public Type getType() { return type; }
    public String getExplanation() { return explanation; }
    public Long getReporterId() { return reporterId; }
    public String getReporterUserName() { return reporterUserName; }
    public Long getReportedUserId() { return reportedUserId; }
    public String getReportedUserName() { return reportedUserName; }
    public Long getChatId() { return chatId; }
    public Long getMessageId() { return messageId; }
    public String getOfferId() { return offerId; }
    public Boolean getResolved() { return resolved; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public Long getNotesCount() { return notesCount; }
}


