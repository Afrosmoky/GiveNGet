package com.example.gng.register.company.model;

import com.example.gng.image.model.ImageEntity;
import com.example.gng.register.model.UserModel;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "business_users_details")
@PrimaryKeyJoinColumn(name = "user_id") // Links to the 'users' table via user_id
@Data
public class BusinessUserModel extends UserModel {
    @Column(name = "company_name", nullable = false)
    private String companyName;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_logo_id")
    private ImageEntity companyLogo;

    @OneToMany(mappedBy = "businessUser", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<SocialLinkModel> socialLinks = new ArrayList<>();

    // Many-to-Many relationship with Tag
    @ManyToMany(fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
            name = "business_user_tags", // Name of the join table
            joinColumns = @JoinColumn(name = "business_user_id"), // Column in join table referring to BusinessUser
            inverseJoinColumns = @JoinColumn(name = "tag_id")    // Column in join table referring to Tag
    )
    private Set<TagModel> tags = new HashSet<>(); // Using Set to avoid duplicate tags for a user

}
