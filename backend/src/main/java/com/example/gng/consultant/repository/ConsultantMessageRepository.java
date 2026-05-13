package com.example.gng.consultant.repository;

import com.example.gng.consultant.entity.ConsultantMessageEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConsultantMessageRepository extends JpaRepository<ConsultantMessageEntity, Long> {
    
    @Query("SELECT m FROM ConsultantMessageEntity m WHERE m.chat.id = :chatId ORDER BY m.timestamp ASC")
    List<ConsultantMessageEntity> findByChatIdOrderByTimestampAsc(@Param("chatId") Long chatId);
    
    @Query("SELECT m FROM ConsultantMessageEntity m WHERE m.chat.id = :chatId ORDER BY m.timestamp DESC")
    Page<ConsultantMessageEntity> findByChatIdOrderByTimestampDesc(@Param("chatId") Long chatId, Pageable pageable);
    
    @Query("SELECT COUNT(m) FROM ConsultantMessageEntity m WHERE m.chat.id = :chatId")
    Long countByChatId(@Param("chatId") Long chatId);
}

