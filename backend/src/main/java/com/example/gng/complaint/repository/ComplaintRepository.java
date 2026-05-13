package com.example.gng.complaint.repository;

import com.example.gng.complaint.entity.ComplaintEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ComplaintRepository extends JpaRepository<ComplaintEntity, Long> {
    java.util.List<ComplaintEntity> findByResolved(Boolean resolved);
}