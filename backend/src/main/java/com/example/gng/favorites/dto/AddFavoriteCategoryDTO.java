package com.example.gng.favorites.dto;

import lombok.Data;

import java.util.List;

@Data
public class AddFavoriteCategoryDTO {
    
    private List<Integer> categoryIds;
    private List<SubcategoryRequest> subcategories;
    
    @Data
    public static class SubcategoryRequest {
        private Integer categoryId;
        private Integer subcategoryId;
    }
    
    /**
     * Waliduje, że podano przynajmniej jedną kategorię lub podkategorię
     */
    public boolean isValid() {
        boolean hasCategories = categoryIds != null && !categoryIds.isEmpty();
        boolean hasSubcategories = subcategories != null && !subcategories.isEmpty();
        
        if (!hasCategories && !hasSubcategories) {
            return false; // Musi być przynajmniej jedna kategoria lub podkategoria
        }
        
        // Sprawdź czy wszystkie podkategorie mają categoryId
        if (hasSubcategories) {
            return subcategories.stream()
                    .allMatch(sub -> sub.getCategoryId() != null && sub.getSubcategoryId() != null);
        }
        
        return true;
    }
    
    /**
     * Sprawdza czy są kategorie do dodania
     */
    public boolean hasCategories() {
        return categoryIds != null && !categoryIds.isEmpty();
    }
    
    /**
     * Sprawdza czy są podkategorie do dodania
     */
    public boolean hasSubcategories() {
        return subcategories != null && !subcategories.isEmpty();
    }
}
