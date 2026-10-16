-- Konta pracowników sklepu (docs/04_REZERWACJE_DESIGN.md, sekcja 7).
--
-- KROK 1 jest krytyczny: users.type to kolumna ENUM założona w migracji 04. Bez dodania
-- nowej wartości każdy zapis konta STORE_EMPLOYEE zostałby odrzucony przez bazę.
ALTER TABLE users
    MODIFY COLUMN type ENUM('REGULAR', 'COMPANY', 'EMPLOYEE', 'ADMIN', 'STORE_EMPLOYEE') NOT NULL;

-- KROK 2: wiązanie pracownik -> sklep w osobnej tabeli (inheritance JOINED, tak jak
-- regular_users_details i business_users_details). Kolumna w users byłaby NULL
-- dla wszystkich pozostałych typów kont.
CREATE TABLE store_employees_details (
    user_id  BIGINT NOT NULL COMMENT 'FK do users — ten sam klucz, inheritance JOINED',
    store_id BIGINT NOT NULL COMMENT 'Konto firmowe sklepu, w którego imieniu pracownik potwierdza odbiory',
    PRIMARY KEY (user_id),
    CONSTRAINT fk_store_employee_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_store_employee_store
        FOREIGN KEY (store_id) REFERENCES business_users_details (user_id) ON DELETE CASCADE
);

-- Pod wyszukiwanie pracowników danego sklepu (przyszły panel firmy).
CREATE INDEX idx_store_employees_store_id ON store_employees_details (store_id);
