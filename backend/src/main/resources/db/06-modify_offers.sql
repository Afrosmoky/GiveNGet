-- Dodanie kolumny category_id
ALTER TABLE offer
    ADD COLUMN category_id INT;

-- Dodanie klucza obcego dla category_id
ALTER TABLE offer
    ADD CONSTRAINT fk_offers_category
        FOREIGN KEY (category_id)
            REFERENCES category(id)
            ON DELETE SET NULL;

-- Dodanie kolumny subcategory_id
ALTER TABLE offer
    ADD COLUMN subcategory_id INT;

-- Dodanie klucza obcego dla subcategory_id
ALTER TABLE offer
    ADD CONSTRAINT fk_offers_subcategory
        FOREIGN KEY (subcategory_id)
            REFERENCES subcategory(id)
            ON DELETE SET NULL;