ALTER TABLE chats
    ADD COLUMN last_message_preview text NULL,
    ADD COLUMN last_message_timestamp TIMESTAMP NULL DEFAULT NULL;