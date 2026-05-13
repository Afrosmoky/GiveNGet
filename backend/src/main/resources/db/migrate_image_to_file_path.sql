-- Migracja zmieniająca sposób przechowywania obrazów z base64 na ścieżki plików
-- Najpierw dodajemy nową kolumnę
ALTER TABLE images ADD COLUMN file_path VARCHAR(500) not null;

-- Usuwamy starą kolumnę z danymi base64 (UWAGA: spowoduje to utratę danych!)
ALTER TABLE images DROP COLUMN image;
