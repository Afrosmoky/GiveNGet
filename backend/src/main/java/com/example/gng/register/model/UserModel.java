package com.example.gng.register.model;

import com.example.gng.image.model.ImageEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;
import com.example.gng.user.entity.UserRank;

@Entity
@Table(name = "users")
@Inheritance(strategy = InheritanceType.JOINED)
@Data
public class UserModel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "address")
    private String address;

    @Column(name = "is_verified")
    private Boolean verified;

    @Column(name = "default_language")
    private  String lang;

    @Column(name = "default_currency")
    private String currency;

    @Column(name = "lat")
    private BigDecimal lat;

    @Column(name = "lon")
    private BigDecimal lon;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private UserType type;

    @OneToOne(fetch = FetchType.EAGER, cascade = CascadeType.ALL)
    @JoinColumn(name = "avatar_id")
    private ImageEntity avatar;

    @Column(name = "delete_date")
    private LocalDateTime deleteDate;

    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    @Column(name = "create_date")
    private LocalDateTime createDate;

    @Column(name = "banned")
    private Boolean banned = false;

    @Column(name = "trust_points")
    private Integer trustPoints = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_rank")
    private UserRank userRank = UserRank.STARTER;

    @Column(name = "free_offers_count")
    private Integer freeOffersCount = 5;

    @Column(name = "last_offers_reset_date")
    private LocalDate lastOffersResetDate = LocalDate.now();
}