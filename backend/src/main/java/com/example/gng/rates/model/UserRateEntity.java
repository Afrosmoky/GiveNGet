package com.example.gng.rates.model;

import com.example.gng.register.model.UserModel;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_rates")
@Data
public class UserRateEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserModel user;

    @Column(name = "cleanliness", nullable = false)
    private Integer cleanliness;

    @Column(name = "quality", nullable = false)
    private Integer quality;

    @Column(name = "transaction_rating", nullable = false)
    private Integer transactionRating;

    @Column(name = "comment")
    private String comment;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}