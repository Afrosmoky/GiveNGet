-- Dodanie kolumny user_id do tabeli offer
ALTER TABLE offer
    ADD COLUMN user_id BIGINT;

-- Dodanie klucza obcego dla user_id
ALTER TABLE offer
    ADD CONSTRAINT fk_offers_user
        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE;

-- Ustawienie kolumny user_id jako NOT NULL po dodaniu klucza obcego
-- (opcjonalnie, jeśli chcemy wymusić, że każda oferta musi mieć autora)
-- ALTER TABLE offer MODIFY COLUMN user_id BIGINT NOT NULL; 