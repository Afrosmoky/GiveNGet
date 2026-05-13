package com.example.gng.favorites.repository;

import com.example.gng.favorites.entity.FavoriteCategoryEntity;
import com.example.gng.register.model.UserModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FavoriteCategoryRepository extends JpaRepository<FavoriteCategoryEntity, Long> {

    /**
     * Sprawdza czy użytkownik ma daną kategorię w ulubionych
     */
    boolean existsByUserAndCategoryId(UserModel user, Integer categoryId);

    /**
     * Sprawdza czy użytkownik ma daną podkategorię w ulubionych
     */
    boolean existsByUserAndSubcategoryId(UserModel user, Integer subcategoryId);

    /**
     * Pobiera wszystkie ulubione kategorie i podkategorie dla danego użytkownika
     */
    List<FavoriteCategoryEntity> findByUserOrderByCreatedAtDesc(UserModel user);

    /**
     * Pobiera ID kategorii ulubionych dla danego użytkownika
     */
    @Query("SELECT fc.categoryId FROM FavoriteCategoryEntity fc WHERE fc.user = :user AND fc.categoryId IS NOT NULL AND fc.subcategoryId IS NULL")
    List<Integer> findCategoryIdsByUser(@Param("user") UserModel user);

    /**
     * Pobiera ID podkategorii ulubionych dla danego użytkownika
     */
    @Query("SELECT fc.subcategoryId FROM FavoriteCategoryEntity fc WHERE fc.user = :user AND fc.subcategoryId IS NOT NULL")
    List<Integer> findSubcategoryIdsByUser(@Param("user") UserModel user);

    /**
     * Usuwa wszystkie ulubione kategorie i podkategorie dla danego użytkownika
     */
    @Modifying
    void deleteByUser(UserModel user);
}
