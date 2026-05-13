-- Krok 1: Dodanie kolumn bez problematycznej wartości domyślnej
ALTER TABLE users ADD COLUMN trust_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN user_rank VARCHAR(50) NOT NULL DEFAULT 'STARTER';
ALTER TABLE users ADD COLUMN free_offers_count INTEGER NOT NULL DEFAULT 5;
-- Usunięcie "DEFAULT CURDATE()". Wartość domyślna będzie ustawiana przez aplikację,
-- a dla istniejących wierszy użyjemy następnego polecenia UPDATE.
ALTER TABLE users ADD COLUMN last_offers_reset_date DATE NULL;

-- Krok 2: Ustawienie wartości dla istniejących wierszy
-- Zapewnia, że istniejące dane będą miały poprawną datę
UPDATE users SET last_offers_reset_date = CURDATE() WHERE last_offers_reset_date IS NULL;

-- Krok 3: (Opcjonalnie, jeśli chcesz, aby kolumna była NOT NULL)
-- Zmieniamy kolumnę na NOT NULL, gdy już ma poprawne dane.
ALTER TABLE users MODIFY COLUMN last_offers_reset_date DATE NOT NULL;


-- Dodanie indeksów dla lepszej wydajności (te nie powodowały błędów)
CREATE INDEX idx_users_trust_points ON users(trust_points);
CREATE INDEX idx_users_user_rank ON users(user_rank);
CREATE INDEX idx_users_last_offers_reset_date ON users(last_offers_reset_date);