package com.example.gng.consultant.repository;

import com.example.gng.consultant.entity.ConsultantChatEntity;
import com.example.gng.consultant.entity.ConsultantChatStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ConsultantChatRepository extends JpaRepository<ConsultantChatEntity, Long> {
    
    @Query("SELECT c FROM ConsultantChatEntity c WHERE c.user.id = :userId ORDER BY c.createdAt DESC")
    List<ConsultantChatEntity> findByUserId(@Param("userId") Long userId);
    
    @Query("SELECT c FROM ConsultantChatEntity c WHERE c.user.id = :userId AND c.status != 'CLOSED' ORDER BY c.createdAt DESC")
    List<ConsultantChatEntity> findActiveChatsByUserId(@Param("userId") Long userId);
    
    @Query("SELECT c FROM ConsultantChatEntity c WHERE c.status = :status ORDER BY c.createdAt DESC")
    List<ConsultantChatEntity> findByStatus(@Param("status") ConsultantChatStatus status);
    
    @Query("SELECT c FROM ConsultantChatEntity c WHERE c.status = 'OPENED' OR (c.status = 'ASSIGNED' AND c.moderator.id = :moderatorId) ORDER BY c.createdAt DESC")
    List<ConsultantChatEntity> findAvailableChatsForModerator(@Param("moderatorId") Long moderatorId);
    
    @Query("SELECT c FROM ConsultantChatEntity c WHERE c.moderator.id = :moderatorId AND c.status = 'ASSIGNED' ORDER BY c.createdAt DESC")
    List<ConsultantChatEntity> findAssignedChatsByModeratorId(@Param("moderatorId") Long moderatorId);
    
    @Query("SELECT c FROM ConsultantChatEntity c WHERE c.status != 'CLOSED' AND " +
           "((c.lastMessageAt IS NOT NULL AND c.lastMessageAt < :threshold) OR " +
           "(c.lastMessageAt IS NULL AND c.createdAt < :threshold))")
    List<ConsultantChatEntity> findInactiveChats(@Param("threshold") LocalDateTime threshold);
    
    @Query("SELECT c FROM ConsultantChatEntity c WHERE c.user.id = :userId AND c.status != 'CLOSED' ORDER BY c.createdAt DESC")
    Optional<ConsultantChatEntity> findActiveChatByUserId(@Param("userId") Long userId);
}

