-- Dodanie pola status do tabeli offer
ALTER TABLE offer ADD COLUMN status ENUM('ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION') NOT NULL DEFAULT 'ACTIVE';

-- Aktualizacja istniejących ofert - ustawienie statusu na ACTIVE dla wszystkich istniejących ofert
UPDATE offer SET status = 'ACTIVE' WHERE status IS NULL;
