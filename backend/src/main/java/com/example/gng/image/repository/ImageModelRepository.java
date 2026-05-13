package com.example.gng.image.repository;

import com.example.gng.image.model.ImageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ImageModelRepository extends JpaRepository<ImageEntity, Long> {
    Optional<ImageEntity> findByFilePath(String filePath);
}