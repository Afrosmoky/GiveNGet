package com.example.gng.chat.repository;

import com.example.gng.chat.entity.ChatEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRepository extends JpaRepository<ChatEntity, Long> {

    /**
     * Znajdź prywatny czat między dwoma użytkownikami
     */
    @Query("SELECT c FROM ChatEntity c " +
           "JOIN c.participants cp1 " +
           "JOIN c.participants cp2 " +
           "WHERE cp1.user.id = :user1Id " +
           "AND cp2.user.id = :user2Id " +
           "AND cp1.leftAt IS NULL " +
           "AND cp2.leftAt IS NULL " +
           "AND c.id IN (" +
           "  SELECT c2.id FROM ChatEntity c2 " +
           "  JOIN c2.participants cp " +
           "  GROUP BY c2.id " +
           "  HAVING COUNT(cp) = 2" +
           ")")
    Optional<ChatEntity> findPrivateChatBetweenUsers(@Param("user1Id") Long user1Id, @Param("user2Id") Long user2Id);

    /**
     * Znajdź wszystkie czaty użytkownika
     */
    @Query("SELECT DISTINCT c FROM ChatEntity c " +
           "JOIN c.participants cp " +
           "WHERE cp.user.id = :userId " +
           "AND cp.leftAt IS NULL " +
           "ORDER BY c.createdAt DESC")
    List<ChatEntity> findChatsByUserId(@Param("userId") Long userId);
}