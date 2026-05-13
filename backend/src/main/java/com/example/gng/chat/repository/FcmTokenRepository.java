package com.example.gng.chat.repository;

import com.example.gng.chat.entity.FcmToken;
import com.example.gng.register.model.UserModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface FcmTokenRepository extends JpaRepository<FcmToken, Long> {
    Optional<FcmToken> findByToken(String token);
    List<FcmToken> findByUserAndValidUntilAfter(UserModel user, LocalDateTime now);
    void deleteByValidUntilBefore(LocalDateTime now);
} 