-- Tabela do przechowywania statystyk ofert w czasie
CREATE TABLE offer_statistics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    offer_id VARCHAR(12) NOT NULL,
    user_id BIGINT,
    event_type VARCHAR(50) NOT NULL COMMENT 'VIEW, CLICK, PROFILE_VIEW',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (offer_id) REFERENCES offer(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_offer_statistics_offer_id (offer_id),
    INDEX idx_offer_statistics_user_id (user_id),
    INDEX idx_offer_statistics_event_type (event_type),
    INDEX idx_offer_statistics_created_at (created_at),
    INDEX idx_offer_statistics_offer_date (offer_id, created_at)
);

-- Tabela do przechowywania statystyk wiadomości
CREATE TABLE message_statistics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sender_id BIGINT NOT NULL,
    recipient_id BIGINT NOT NULL,
    chat_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    INDEX idx_message_statistics_sender (sender_id),
    INDEX idx_message_statistics_recipient (recipient_id),
    INDEX idx_message_statistics_created_at (created_at)
);
