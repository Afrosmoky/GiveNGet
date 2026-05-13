package com.example.gng.rates.repository;

import com.example.gng.rates.model.UserRateEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRateRepository extends JpaRepository<UserRateEntity, Long> {

    /**
     * Znajdź wszystkie oceny dla danego użytkownika
     */
    List<UserRateEntity> findByUserId(Long userId);

    /**
     * Znajdź wszystkie oceny dla danego użytkownika posortowane od najnowszych
     */
    List<UserRateEntity> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * Znajdź wszystkie oceny dla danego użytkownika z podaną oceną czystości posortowane od najnowszych
     */
    List<UserRateEntity> findByUserIdAndCleanlinessOrderByCreatedAtDesc(Long userId, Integer cleanliness);

    /**
     * Znajdź wszystkie oceny dla danego użytkownika z podaną oceną jakości posortowane od najnowszych
     */
    List<UserRateEntity> findByUserIdAndQualityOrderByCreatedAtDesc(Long userId, Integer quality);

    /**
     * Znajdź wszystkie oceny dla danego użytkownika z podaną oceną transakcji posortowane od najnowszych
     */
    List<UserRateEntity> findByUserIdAndTransactionRatingOrderByCreatedAtDesc(Long userId, Integer transactionRating);

    /**
     * Znajdź wszystkie oceny dla danego użytkownika posortowane od najnowszych z paginacją
     */
    Page<UserRateEntity> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    /**
     * Znajdź wszystkie oceny dla danego użytkownika z podaną oceną czystości posortowane od najnowszych z paginacją
     */
    Page<UserRateEntity> findByUserIdAndCleanlinessOrderByCreatedAtDesc(Long userId, Integer cleanliness, Pageable pageable);

    /**
     * Znajdź wszystkie oceny dla danego użytkownika z podaną oceną jakości posortowane od najnowszych z paginacją
     */
    Page<UserRateEntity> findByUserIdAndQualityOrderByCreatedAtDesc(Long userId, Integer quality, Pageable pageable);

    /**
     * Znajdź wszystkie oceny dla danego użytkownika z podaną oceną transakcji posortowane od najnowszych z paginacją
     */
    Page<UserRateEntity> findByUserIdAndTransactionRatingOrderByCreatedAtDesc(Long userId, Integer transactionRating, Pageable pageable);

    /**
     * Sprawdź czy użytkownik ma już oceny
     */
    boolean existsByUserId(Long userId);

    /**
     * Policz liczbę ocen dla danego użytkownika
     */
    long countByUserId(Long userId);

    /**
     * Znajdź średnią ocenę czystości dla danego użytkownika
     */
    @Query("SELECT AVG(ur.cleanliness) FROM UserRateEntity ur WHERE ur.user.id = :userId")
    Double findAverageCleanlinessByUserId(@Param("userId") Long userId);

    /**
     * Znajdź średnią ocenę jakości dla danego użytkownika
     */
    @Query("SELECT AVG(ur.quality) FROM UserRateEntity ur WHERE ur.user.id = :userId")
    Double findAverageQualityByUserId(@Param("userId") Long userId);

    /**
     * Znajdź średnią ocenę transakcji dla danego użytkownika
     */
    @Query("SELECT AVG(ur.transactionRating) FROM UserRateEntity ur WHERE ur.user.id = :userId")
    Double findAverageTransactionRatingByUserId(@Param("userId") Long userId);

    /**
     * Znajdź wszystkie oceny z komentarzami
     */
    List<UserRateEntity> findByCommentIsNotNull();

    /**
     * Znajdź oceny dla danego użytkownika z komentarzami
     */
    List<UserRateEntity> findByUserIdAndCommentIsNotNull(Long userId);

    /**
     * Usuń wszystkie oceny dla danego użytkownika
     */
    void deleteByUserId(Long userId);

    /**
     * Znajdź średnie oceny dla danego użytkownika (czystość, jakość, transakcja)
     */
    @Query("SELECT AVG(ur.cleanliness), AVG(ur.quality), AVG(ur.transactionRating) FROM UserRateEntity ur WHERE ur.user.id = :userId")
    List<Object[]> findAverageRatingsByUserId(@Param("userId") Long userId);
}