package com.example.gng.favorites.entity;

import com.example.gng.register.model.UserModel;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "favorite_categories")
@Data
public class FavoriteCategoryEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserModel user;
    
    @Column(name = "category_id")
    private Integer categoryId;
    
    @Column(name = "subcategory_id")
    private Integer subcategoryId;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
    
    /**
     * Sprawdza czy to jest ulubiona kategoria (nie podkategoria)
     */
    public boolean isCategoryFavorite() {
        return categoryId != null && subcategoryId == null;
    }
    
    /**
     * Sprawdza czy to jest ulubiona podkategoria (nie kategoria)
     */
    public boolean isSubcategoryFavorite() {
        return subcategoryId != null && categoryId != null;
    }
}
