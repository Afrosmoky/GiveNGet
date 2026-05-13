package com.example.gng.moderation.repository;

import com.example.gng.moderation.entity.ForbiddenPatternEntity;
import com.example.gng.moderation.entity.ForbiddenPatternType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ForbiddenPatternRepository extends JpaRepository<ForbiddenPatternEntity, Integer> {

    List<ForbiddenPatternEntity> findByActiveTrue();

    List<ForbiddenPatternEntity> findByTypeAndActiveTrue(ForbiddenPatternType type);
}


