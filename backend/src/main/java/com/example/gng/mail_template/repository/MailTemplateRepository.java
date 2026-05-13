package com.example.gng.mail_template.repository;

import com.example.gng.mail_template.model.MailTemplateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MailTemplateRepository extends JpaRepository<MailTemplateEntity, Integer> {
    MailTemplateEntity findByName(String name);
}