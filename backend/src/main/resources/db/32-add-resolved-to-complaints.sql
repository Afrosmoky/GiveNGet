-- Dodanie kolumny resolved do tabeli complaints
ALTER TABLE complaints
    ADD COLUMN resolved BOOLEAN NOT NULL DEFAULT FALSE;


