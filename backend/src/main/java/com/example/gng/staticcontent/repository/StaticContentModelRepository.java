package com.example.gng.staticcontent.repository;

import com.example.gng.staticcontent.model.StaticContentModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StaticContentModelRepository extends JpaRepository<StaticContentModel, Long> {
    Optional<StaticContentModel> findFirstByNameAndLangOrderByVersionDesc(String name, String lang);
}

