-- Usuń kolumnę views_count z tabeli offer
-- Statystyki wyświetleń są teraz przechowywane w tabeli offer_statistics
ALTER TABLE offer DROP COLUMN views_count;
