package com.example.gng.register.company.repository;

import com.example.gng.register.company.model.TagModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TagModelRepository extends JpaRepository<TagModel, Long> {
    Optional<TagModel> findByTagName(String tagName);
    
    // Znajdź najczęściej używane tagi
    @Query("SELECT t FROM TagModel t LEFT JOIN t.businessUsers bu GROUP BY t ORDER BY COUNT(bu) DESC")
    List<TagModel> findMostPopularTags();
    
    // Znajdź tagi używane przez określoną liczbę firm
    @Query("SELECT t FROM TagModel t WHERE SIZE(t.businessUsers) >= :minUsage")
    List<TagModel> findTagsWithMinUsage(int minUsage);
} 