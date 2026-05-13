package com.example.gng.register.repository;

import com.example.gng.register.model.ResetPasswordCodeModel;
import com.example.gng.register.model.UserModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ResetPasswordCodeModelRepository extends JpaRepository<ResetPasswordCodeModel, Long> {
    Optional<ResetPasswordCodeModel> findByCodeAndUsedFalseAndAddedAfter(String code, LocalDateTime added);

    List<ResetPasswordCodeModel> findByAddedBefore(LocalDateTime added);

    List<ResetPasswordCodeModel> findByUser(UserModel userModel);
}
