package com.example.gng.offer.repository;

import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.entity.TransactionType;
import com.example.gng.offer.entity.OfferStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OfferRepository extends JpaRepository<OfferEntity, String> {

    @Query("SELECT COUNT(o) > 0 FROM OfferEntity o WHERE o.id = :id")
    boolean existsById(@Param("id") String id);

    @Query("SELECT o FROM OfferEntity o WHERE " +
           "o.status = 'ACTIVE' AND " +
           "(:categoryIds IS NULL OR o.category.id IN :categoryIds) AND " +
           "(:subcategoryIds IS NULL OR o.subcategory.id IN :subcategoryIds) AND " +
           "(:transactionTypes IS NULL OR o.transactionType IN :transactionTypes) AND " +
           "(:maxLon IS NULL OR :minLon IS NULL OR :maxLat IS NULL OR :minLat IS NULL OR " +
           "(o.longitude BETWEEN :minLon AND :maxLon AND o.latitude BETWEEN :minLat AND :maxLat))")
    List<OfferEntity> findOffersByFilters(
            @Param("categoryIds") List<Integer> categoryIds,
            @Param("subcategoryIds") List<Integer> subcategoryIds,
            @Param("transactionTypes") List<TransactionType> transactionTypes,
            @Param("maxLon") BigDecimal maxLon,
            @Param("minLon") BigDecimal minLon,
            @Param("maxLat") BigDecimal maxLat,
            @Param("minLat") BigDecimal minLat);

    @Query("SELECT o FROM OfferEntity o WHERE " +
           "o.status = 'ACTIVE' AND " +
           "((:categoryIds IS NULL OR o.category.id IN :categoryIds) OR " +
           "(:subcategoryIds IS NULL OR o.subcategory.id IN :subcategoryIds)) AND " +
           "(:transactionTypes IS NULL OR o.transactionType IN :transactionTypes) AND " +
           "(:maxLon IS NULL OR :minLon IS NULL OR :maxLat IS NULL OR :minLat IS NULL OR " +
           "(o.longitude BETWEEN :minLon AND :maxLon AND o.latitude BETWEEN :minLat AND :maxLat)) AND " +
           "(o.createdAt > :dateAfter OR o.updatedAt > :dateAfter)")
    List<OfferEntity> findOffersByFiltersWithDateFilter(
            @Param("categoryIds") List<Integer> categoryIds,
            @Param("subcategoryIds") List<Integer> subcategoryIds,
            @Param("transactionTypes") List<TransactionType> transactionTypes,
            @Param("maxLon") BigDecimal maxLon,
            @Param("minLon") BigDecimal minLon,
            @Param("maxLat") BigDecimal maxLat,
            @Param("minLat") BigDecimal minLat,
            @Param("dateAfter") LocalDateTime dateAfter);

    @Query(value = "SELECT * FROM offer WHERE user_id = :userId", nativeQuery = true)
    List<OfferEntity> findByUser(Long userId);

    @Query("SELECT o FROM OfferEntity o WHERE o.expiryDate < :date AND o.status = :status")
    List<OfferEntity> findByExpiryDateBeforeAndStatus(@Param("date") LocalDate date, @Param("status") OfferStatus status);

    /**
     * Pobiera oferty z określonych kategorii, utworzone po określonej dacie, z określonym statusem
     * Posortowane według daty utworzenia (najnowsze pierwsze)
     */
    @Query("SELECT o FROM OfferEntity o WHERE o.category.id IN :categoryIds AND o.createdAt > :createdAfter AND o.status = :status ORDER BY o.createdAt DESC")
    List<OfferEntity> findByCategoryIdInAndCreatedAtAfterAndStatusOrderByCreatedAtDesc(
            @Param("categoryIds") List<Integer> categoryIds,
            @Param("createdAfter") LocalDateTime createdAfter,
            @Param("status") OfferStatus status);

    /**
     * Pobiera oferty z określonych podkategorii, utworzone po określonej dacie, z określonym statusem
     * Posortowane według daty utworzenia (najnowsze pierwsze)
     */
    @Query("SELECT o FROM OfferEntity o WHERE o.subcategory.id IN :subcategoryIds AND o.createdAt > :createdAfter AND o.status = :status ORDER BY o.createdAt DESC")
    List<OfferEntity> findBySubcategoryIdInAndCreatedAtAfterAndStatusOrderByCreatedAtDesc(
            @Param("subcategoryIds") List<Integer> subcategoryIds,
            @Param("createdAfter") LocalDateTime createdAfter,
            @Param("status") OfferStatus status);
}