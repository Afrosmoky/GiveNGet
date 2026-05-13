-- Liquibase formatted sql
-- changeSet author: system
-- changeSet id: 12-add-last-read-message-id

ALTER TABLE chat_participants ADD COLUMN last_read_message_id BIGINT NULL;

-- Dodaj indeks dla lepszej wydajności
CREATE INDEX idx_chat_participants_last_read ON chat_participants(last_read_message_id);

-- Dodaj foreign key constraint
ALTER TABLE chat_participants 
ADD CONSTRAINT fk_chat_participants_last_read_message 
FOREIGN KEY (last_read_message_id) REFERENCES messages(id) ON DELETE SET NULL; 