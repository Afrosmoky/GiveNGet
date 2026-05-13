package com.example.gng.statistics.repository;

import com.example.gng.statistics.entity.MessageStatisticsEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface MessageStatisticsRepository extends JpaRepository<MessageStatisticsEntity, Long> {
    
    @Query("SELECT m FROM MessageStatisticsEntity m WHERE m.recipient.id = :userId")
    List<MessageStatisticsEntity> findByRecipientId(@Param("userId") Long userId);
    
    @Query("SELECT COUNT(m) FROM MessageStatisticsEntity m WHERE m.recipient.id = :userId")
    Long countByRecipientId(@Param("userId") Long userId);
    
    @Query("SELECT COUNT(m) FROM MessageStatisticsEntity m WHERE m.recipient.id = :userId AND m.createdAt >= :startDate AND m.createdAt <= :endDate")
    Long countByRecipientIdAndDateRange(@Param("userId") Long userId,
                                        @Param("startDate") LocalDateTime startDate,
                                        @Param("endDate") LocalDateTime endDate);
}
