package com.example.gng.chat.repository;

import com.example.gng.chat.entity.MessageEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<MessageEntity, Long> {

    /**
     * Znajdź wszystkie wiadomości w czacie
     */
    List<MessageEntity> findByChatIdOrderByTimestampAsc(Long chatId);

    /**
     * Znajdź wiadomości w czacie z paginacją
     */
    Page<MessageEntity> findByChatIdOrderByTimestampDesc(Long chatId, Pageable pageable);

    /**
     * Znajdź ostatnią wiadomość w czacie
     */
    @Query("SELECT m FROM MessageEntity m " +
           "WHERE m.chat.id = :chatId " +
           "ORDER BY m.timestamp DESC " +
           "LIMIT 1")
    MessageEntity findLastMessageByChatId(@Param("chatId") Long chatId);

    /**
     * Policz nieprzeczytane wiadomości dla użytkownika w czacie
     */
    @Query("SELECT COUNT(m) FROM MessageEntity m " +
           "WHERE m.chat.id = :chatId " +
           "AND m.sender.id != :userId " +
           "AND m.timestamp > :lastReadTimestamp")
    long countUnreadMessages(@Param("chatId") Long chatId,
                            @Param("userId") Long userId,
                            @Param("lastReadTimestamp") java.time.LocalDateTime lastReadTimestamp);

    // Fragment rozmowy: 5 wcześniejszych i 5 późniejszych wokół wskazanej wiadomości (z użyciem Pageable do kontroli rozmiaru)
    java.util.List<MessageEntity> findByChatIdAndTimestampLessThanOrderByTimestampDesc(Long chatId, java.time.LocalDateTime timestamp, Pageable pageable);

    java.util.List<MessageEntity> findByChatIdAndTimestampGreaterThanOrderByTimestampAsc(Long chatId, java.time.LocalDateTime timestamp, Pageable pageable);
}