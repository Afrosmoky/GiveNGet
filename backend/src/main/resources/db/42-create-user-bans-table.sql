-- Tabela do przechowywania banów użytkowników z określonym czasem trwania
CREATE TABLE user_bans (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL COMMENT 'Użytkownik który został zbanowany',
    banned_by_id BIGINT NOT NULL COMMENT 'Użytkownik (moderator/admin) który zbanował',
    reason_code VARCHAR(50) NOT NULL COMMENT 'Kod powodu bana (enum BanReason)',
    reason TEXT NULL COMMENT 'Dodatkowy opis powodu (tylko dla kodu 401 - Inne)',
    start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data rozpoczęcia bana',
    end_date TIMESTAMP NULL COMMENT 'Data zakończenia bana (NULL = ban permanentny)',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (banned_by_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_bans_user_id (user_id),
    INDEX idx_user_bans_banned_by_id (banned_by_id),
    INDEX idx_user_bans_start_date (start_date),
    INDEX idx_user_bans_end_date (end_date),
    INDEX idx_user_bans_active (user_id, start_date, end_date),
    INDEX idx_user_bans_reason_code (reason_code)
);

