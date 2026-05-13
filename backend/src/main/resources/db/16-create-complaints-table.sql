CREATE TABLE complaints (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reported_user_id BIGINT NOT NULL,
    chat_id BIGINT,
    message_id BIGINT,
    explanation TEXT NOT NULL,
    reporter_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_complaints_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_complaints_reported_user FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_complaints_chat FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    CONSTRAINT fk_complaints_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);