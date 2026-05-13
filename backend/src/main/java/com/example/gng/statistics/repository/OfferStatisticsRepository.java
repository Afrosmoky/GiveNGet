package com.example.gng.statistics.repository;

import com.example.gng.statistics.entity.OfferStatisticsEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface OfferStatisticsRepository extends JpaRepository<OfferStatisticsEntity, Long> {
    
    @Query("SELECT s FROM OfferStatisticsEntity s WHERE s.offer.id = :offerId AND s.eventType = :eventType")
    List<OfferStatisticsEntity> findByOfferIdAndEventType(@Param("offerId") String offerId, 
                                                           @Param("eventType") OfferStatisticsEntity.EventType eventType);
    
    @Query("SELECT s FROM OfferStatisticsEntity s WHERE s.offer.user.id = :userId AND s.eventType = :eventType")
    List<OfferStatisticsEntity> findByUserIdAndEventType(@Param("userId") Long userId, 
                                                         @Param("eventType") OfferStatisticsEntity.EventType eventType);
    
    @Query("SELECT s FROM OfferStatisticsEntity s WHERE s.offer.user.id = :userId AND s.createdAt >= :startDate AND s.createdAt <= :endDate")
    List<OfferStatisticsEntity> findByUserIdAndDateRange(@Param("userId") Long userId, 
                                                          @Param("startDate") LocalDateTime startDate,
                                                          @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT s FROM OfferStatisticsEntity s WHERE s.offer.id = :offerId AND s.createdAt >= :startDate AND s.createdAt <= :endDate ORDER BY s.createdAt ASC")
    List<OfferStatisticsEntity> findByOfferIdAndDateRange(@Param("offerId") String offerId,
                                                            @Param("startDate") LocalDateTime startDate,
                                                            @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT COUNT(s) FROM OfferStatisticsEntity s WHERE s.offer.user.id = :userId AND s.eventType = :eventType")
    Long countByUserIdAndEventType(@Param("userId") Long userId, 
                                  @Param("eventType") OfferStatisticsEntity.EventType eventType);
    
    @Query("SELECT COUNT(s) FROM OfferStatisticsEntity s WHERE s.offer.id = :offerId AND s.eventType = :eventType")
    Long countByOfferIdAndEventType(@Param("offerId") String offerId, 
                                    @Param("eventType") OfferStatisticsEntity.EventType eventType);
}
