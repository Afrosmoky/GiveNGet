-- Dodanie pola quantity (liczba sztuk) do tabeli offer.
-- Jednostka: sztuka. Wartość >= 0, domyślnie 1.
-- Etap przygotowawczy pod rezerwacje (docs/04_REZERWACJE_DESIGN.md, sekcja 1).
ALTER TABLE offer ADD COLUMN quantity INT NOT NULL DEFAULT 1;

-- Backfill: wszystkie istniejące oferty traktujemy jako jedną sztukę.
UPDATE offer SET quantity = 1 WHERE quantity IS NULL OR quantity < 1;

-- Twarda gwarancja niezmiennika na poziomie bazy (MySQL 8.0.16+).
ALTER TABLE offer ADD CONSTRAINT chk_offer_quantity_non_negative CHECK (quantity >= 0);
