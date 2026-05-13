package com.example.gng.offer.repository;

import com.example.gng.offer.entity.CategoryEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryEntityRepository extends JpaRepository<CategoryEntity, Integer> {
    @EntityGraph(attributePaths = {"subcategories"})
    List<CategoryEntity> findAll();
} 