-- Tabela do przechowywania czatów z konsultantem
CREATE TABLE consultant_chats (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL COMMENT 'Użytkownik który rozpoczął czat',
    moderator_id BIGINT NULL COMMENT 'Moderator przypisany do czatu (null = nieprzypisany)',
    status VARCHAR(50) NOT NULL DEFAULT 'OPENED' COMMENT 'OPENED, ASSIGNED, CLOSED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP NULL COMMENT 'Data ostatniej wiadomości',
    closed_at TIMESTAMP NULL COMMENT 'Data zamknięcia czatu',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_consultant_chats_user_id (user_id),
    INDEX idx_consultant_chats_moderator_id (moderator_id),
    INDEX idx_consultant_chats_status (status),
    INDEX idx_consultant_chats_last_message_at (last_message_at)
);

-- Tabela do przechowywania wiadomości w czatach z konsultantem
CREATE TABLE consultant_messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    chat_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL COMMENT 'Użytkownik lub moderator wysyłający wiadomość',
    content TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'TEXT',
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES consultant_chats(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_consultant_messages_chat_id (chat_id),
    INDEX idx_consultant_messages_sender_id (sender_id),
    INDEX idx_consultant_messages_timestamp (timestamp)
);
