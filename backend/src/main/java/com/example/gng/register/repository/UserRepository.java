package com.example.gng.register.repository;

import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import jakarta.persistence.LockModeType;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserModel, Long> {
    
    /**
     * Znajdź użytkownika po emailu z cache'owaniem
     * Cache jest ważny przez 5 minut
     */
    @Cacheable(value = "users", key = "#email", unless = "#result == null")
    Optional<UserModel> findByEmail(String email);
    
    /**
     * Znajdź użytkowników z deleteDate przed podaną datą
     */
    List<UserModel> findByDeleteDateBefore(LocalDateTime date);

    // Metody dla statystyk użytkowników
    long countByVerifiedTrueAndBannedFalse();
    long countByBannedTrue();
    long countByType(UserType type);
    long countByTypeAndVerifiedTrueAndBannedFalse(UserType type);
    long countByTypeAndBannedTrue(UserType type);
    long countByCreateDateAfter(LocalDateTime date);

    @Query("SELECT u FROM UserModel u WHERE " +
           "(:searchTerm IS NULL OR " +
           "LOWER(CONCAT(u.firstName, ' ', u.lastName)) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(u.phoneNumber) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<UserModel> findUsersWithSearch(@Param("searchTerm") String searchTerm, Pageable pageable);

    @Query("SELECT u FROM UserModel u WHERE " +
           "(:searchTerm IS NULL OR " +
           "LOWER(CONCAT(u.firstName, ' ', u.lastName)) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(u.phoneNumber) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) AND " +
           "(:userType IS NULL OR u.type = :userType) AND " +
           "(:verified IS NULL OR u.verified = :verified) AND " +
           "(:banned IS NULL OR u.banned = :banned)")
    Page<UserModel> findUsersWithFilters(@Param("searchTerm") String searchTerm,
                                        @Param("userType") UserType userType,
                                        @Param("verified") Boolean verified,
                                        @Param("banned") Boolean banned,
                                        Pageable pageable);

    /**
     * Znajdź wszystkich moderatorów (EMPLOYEE lub ADMIN) którzy nie są zbanowani
     */
    @Query("SELECT u FROM UserModel u WHERE (u.type = 'EMPLOYEE' OR u.type = 'ADMIN') AND u.banned = false")
    List<UserModel> findAllModerators();

    /**
     * Pobiera użytkownika z pesymistyczną blokadą wiersza (SELECT ... FOR UPDATE).
     *
     * <p>Wymaga aktywnej transakcji. Używane przy tworzeniu rezerwacji, żeby twardy limit
     * jednoczesnych rezerwacji był faktycznie twardy: bez tej blokady dwa równoczesne
     * żądania tego samego użytkownika na RÓŻNE oferty blokują różne wiersze oferty,
     * widzą tę samą liczbę aktywnych rezerwacji i oba przechodzą.
     *
     * <p><b>Kolejność blokad: NAJPIERW użytkownik, POTEM oferta.</b> Jedynym miejscem,
     * które bierze obie, jest {@code ReservationService.create} — dopóki ta kolejność
     * jest zachowana, nie ma cyklu, czyli nie ma deadlocku.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM UserModel u WHERE u.id = :userId")
    Optional<UserModel> findByIdForUpdate(@Param("userId") Long userId);
}
