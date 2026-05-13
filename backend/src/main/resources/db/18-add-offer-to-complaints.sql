-- Dodanie kolumny offer_id do tabeli complaints
ALTER TABLE complaints
    ADD COLUMN offer_id VARCHAR(12);

-- Dodanie klucza obcego dla offer_id
ALTER TABLE complaints
    ADD CONSTRAINT fk_complaints_offer
        FOREIGN KEY (offer_id)
            REFERENCES offer(id)
            ON DELETE CASCADE;

-- Zmiana kolumny reported_user_id na nullable (może być null przy zgłaszaniu oferty)
ALTER TABLE complaints
    MODIFY COLUMN reported_user_id BIGINT NULL; 