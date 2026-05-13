package com.example.gng.ban.repository;

import com.example.gng.ban.entity.UserBanEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserBanRepository extends JpaRepository<UserBanEntity, Long> {

    /**
     * Znajduje aktywny ban dla użytkownika (ban który jest obecnie aktywny)
     */
    @Query("SELECT b FROM UserBanEntity b WHERE b.user.id = :userId " +
           "AND b.startDate <= :now " +
           "AND (b.endDate IS NULL OR b.endDate > :now)")
    Optional<UserBanEntity> findActiveBanByUserId(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    /**
     * Znajduje wszystkie bany dla użytkownika
     */
    List<UserBanEntity> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * Znajduje wszystkie aktywne bany (dla wszystkich użytkowników)
     */
    @Query("SELECT b FROM UserBanEntity b WHERE b.startDate <= :now " +
           "AND (b.endDate IS NULL OR b.endDate > :now)")
    List<UserBanEntity> findAllActiveBans(@Param("now") LocalDateTime now);
}

