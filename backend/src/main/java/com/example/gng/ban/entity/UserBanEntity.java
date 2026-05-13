package com.example.gng.ban.entity;

import com.example.gng.ban.enums.BanReason;
import com.example.gng.register.model.UserModel;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_bans")
@Data
public class UserBanEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserModel user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "banned_by_id", nullable = false)
    private UserModel bannedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_code", nullable = false)
    private BanReason reasonCode;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason; // Opcjonalne, tylko dla BanReason.OTHER

    @Column(name = "start_date", nullable = false)
    private LocalDateTime startDate;

    @Column(name = "end_date")
    private LocalDateTime endDate; // NULL = ban permanentny

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (startDate == null) {
            startDate = LocalDateTime.now();
        }
    }

    /**
     * Sprawdza czy ban jest aktywny (czy aktualna data jest między startDate a endDate, lub endDate jest NULL)
     */
    public boolean isActive() {
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(startDate)) {
            return false; // Ban jeszcze się nie rozpoczął
        }
        if (endDate == null) {
            return true; // Ban permanentny
        }
        return now.isBefore(endDate); // Ban aktywny jeśli data jest przed endDate
    }
}

