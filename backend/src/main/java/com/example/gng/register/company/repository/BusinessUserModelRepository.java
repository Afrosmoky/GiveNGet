package com.example.gng.register.company.repository;

import com.example.gng.register.company.model.BusinessUserModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BusinessUserModelRepository extends JpaRepository<BusinessUserModel, Long> {
} 