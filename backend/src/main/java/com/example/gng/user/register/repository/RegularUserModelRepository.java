package com.example.gng.user.register.repository;

import com.example.gng.user.register.model.RegularUserModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RegularUserModelRepository extends JpaRepository<RegularUserModel, Integer> {

}
