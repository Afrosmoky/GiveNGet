package com.example.gng.register.repository;

import com.example.gng.register.model.RegisterCodeModel;
import com.example.gng.register.model.UserModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RegisterCodeModelRepository extends JpaRepository<RegisterCodeModel, Long> {
    Optional<RegisterCodeModel> findByCodeAndUsedFalseAndAddedAfter(String code, LocalDateTime added);
    List<RegisterCodeModel> findByAddedBefore(LocalDateTime added);
    List<RegisterCodeModel> findByUser(UserModel userModel);
}
