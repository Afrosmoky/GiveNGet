-- Modyfikacja tabeli user_rates - zastąpienie kolumny rate trzema nowymi kolumnami
-- Dodanie nowych kolumn
ALTER TABLE user_rates ADD COLUMN cleanliness TINYINT NOT NULL DEFAULT 3 CHECK (cleanliness >= 1 AND cleanliness <= 5);
ALTER TABLE user_rates ADD COLUMN quality TINYINT NOT NULL DEFAULT 3 CHECK (quality >= 1 AND quality <= 5);
ALTER TABLE user_rates ADD COLUMN transaction_rating TINYINT NOT NULL DEFAULT 3 CHECK (transaction_rating >= 1 AND transaction_rating <= 5);

-- Skopiowanie danych z kolumny rate do nowych kolumn (dla kompatybilności wstecznej)
UPDATE user_rates SET cleanliness = rate, quality = rate, transaction_rating = rate WHERE rate IS NOT NULL;

-- Usunięcie starej kolumny rate
ALTER TABLE user_rates DROP COLUMN rate; 