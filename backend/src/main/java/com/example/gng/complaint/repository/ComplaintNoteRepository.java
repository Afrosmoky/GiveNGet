package com.example.gng.complaint.repository;

import com.example.gng.complaint.entity.ComplaintNoteEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ComplaintNoteRepository extends JpaRepository<ComplaintNoteEntity, Long> {

    /**
     * Znajduje wszystkie notatki dla danej skargi, posortowane od najstarszej do najnowszej
     */
    List<ComplaintNoteEntity> findByComplaintIdOrderByCreatedAtAsc(Long complaintId);

    /**
     * Zlicza liczbę notatek dla danej skargi
     */
    long countByComplaintId(Long complaintId);
}

