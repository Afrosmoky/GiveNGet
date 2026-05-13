-- Tabela dla ulubionych kategorii i podkategorii użytkowników
CREATE TABLE favorite_categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    category_id INT NULL, -- NULL jeśli polubiono podkategorię
    subcategory_id INT NULL, -- NULL jeśli polubiono kategorię
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE CASCADE,
    FOREIGN KEY (subcategory_id) REFERENCES subcategory(id) ON DELETE CASCADE,
    -- Unikalność dla podkategorii
    UNIQUE KEY unique_user_subcategory (user_id, category_id, subcategory_id)
);

-- Indeksy dla lepszej wydajności
CREATE INDEX idx_favorite_categories_user_id ON favorite_categories(user_id);
CREATE INDEX idx_favorite_categories_category_id ON favorite_categories(category_id);
CREATE INDEX idx_favorite_categories_subcategory_id ON favorite_categories(subcategory_id);
