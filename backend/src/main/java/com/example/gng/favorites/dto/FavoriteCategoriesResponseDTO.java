package com.example.gng.favorites.dto;

import lombok.Data;

import java.util.List;

@Data
public class FavoriteCategoriesResponseDTO {
    
    private List<Integer> favoriteCategoryIds;
    private List<FavoriteSubcategoryDTO> favoriteSubcategories;
    
    @Data
    public static class FavoriteSubcategoryDTO {
        private Integer categoryId;
        private Integer subcategoryId;
    }
}
