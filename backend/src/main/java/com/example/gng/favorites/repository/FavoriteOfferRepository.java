package com.example.gng.favorites.repository;

import com.example.gng.favorites.entity.FavoriteOfferEntity;
import com.example.gng.register.model.UserModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FavoriteOfferRepository extends JpaRepository<FavoriteOfferEntity, Long> {
    
    /**
     * Znajduje wszystkie ulubione oferty dla danego użytkownika
     */
    @Query("SELECT fo FROM FavoriteOfferEntity fo WHERE fo.user = :user ORDER BY fo.createdAt DESC")
    List<FavoriteOfferEntity> findByUser(@Param("user") UserModel user);
    
    /**
     * Sprawdza czy oferta jest już w ulubionych dla danego użytkownika
     */
    Optional<FavoriteOfferEntity> findByUserAndOfferId(UserModel user, String offerId);
    
    /**
     * Usuwa ofertę z ulubionych dla danego użytkownika
     */
    void deleteByUserAndOfferId(UserModel user, String offerId);
    
    /**
     * Sprawdza czy oferta jest w ulubionych dla danego użytkownika
     */
    boolean existsByUserAndOfferId(UserModel user, String offerId);
    
    /**
     * Znajduje wszystkie ulubione oferty dla danego użytkownika z listy ID ofert
     */
    @Query("SELECT fo FROM FavoriteOfferEntity fo WHERE fo.user = :user AND fo.offer.id IN :offerIds")
    List<FavoriteOfferEntity> findByUserAndOfferIdIn(@Param("user") UserModel user, @Param("offerIds") List<String> offerIds);
    
    /**
     * Znajduje wszystkich użytkowników zainteresowanych daną ofertą
     */
    @Query("SELECT fo FROM FavoriteOfferEntity fo WHERE fo.offer.id = :offerId")
    List<FavoriteOfferEntity> findByOfferId(@Param("offerId") String offerId);
}
