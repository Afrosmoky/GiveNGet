package com.example.gng.chat.repository;

import com.example.gng.chat.entity.ChatParticipantEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatParticipantRepository extends JpaRepository<ChatParticipantEntity, Long> {

    /**
     * Znajdź uczestnika czatu
     */
    Optional<ChatParticipantEntity> findByChatIdAndUserId(Long chatId, Long userId);

    /**
     * Znajdź wszystkich aktywnych uczestników czatu
     */
    @Query("SELECT cp FROM ChatParticipantEntity cp " +
           "WHERE cp.chat.id = :chatId " +
           "AND cp.leftAt IS NULL")
    List<ChatParticipantEntity> findActiveParticipantsByChatId(@Param("chatId") Long chatId);

    /**
     * Sprawdź czy użytkownik jest uczestnikiem czatu
     */
    boolean existsByChatIdAndUserIdAndLeftAtIsNull(Long chatId, Long userId);

    /**
     * Znajdź uczestnika czatu dla aktualizacji lastReadMessageId
     */
    Optional<ChatParticipantEntity> findByChatIdAndUserIdAndLeftAtIsNull(Long chatId, Long userId);

    /**
     * Policz nieodczytane wiadomości dla użytkownika w czacie
     */
    @Query("SELECT COUNT(m) FROM MessageEntity m " +
           "WHERE m.chat.id = :chatId " +
           "AND m.id > COALESCE((SELECT cp.lastReadMessageId FROM ChatParticipantEntity cp " +
           "WHERE cp.chat.id = :chatId AND cp.user.id = :userId AND cp.leftAt IS NULL), 0)")
    int countUnreadMessages(@Param("chatId") Long chatId, @Param("userId") Long userId);
}