package com.example.gng.user.register.model;

import com.example.gng.register.model.UserModel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "regular_users_details")
@PrimaryKeyJoinColumn(name = "user_id")
@Data
public class RegularUserModel extends UserModel {
    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;
}
