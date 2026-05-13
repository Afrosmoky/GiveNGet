-- Tabela do przechowywania wewnętrznych notatek do skarg (dostępne tylko dla moderatorów/administratorów)
CREATE TABLE complaint_notes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    complaint_id BIGINT NOT NULL COMMENT 'ID skargi do której należy notatka',
    author_id BIGINT NOT NULL COMMENT 'ID moderatora/administratora który utworzył notatkę',
    content TEXT NOT NULL COMMENT 'Treść notatki',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_complaint_notes_complaint_id (complaint_id),
    INDEX idx_complaint_notes_author_id (author_id),
    INDEX idx_complaint_notes_created_at (created_at)
);

