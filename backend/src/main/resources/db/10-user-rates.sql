CREATE TABLE user_rates (
    id bigint AUTO_INCREMENT PRIMARY KEY,
    user_id bigint NOT NULL,
    rate TINYINT NOT NULL CHECK (rate >= 1 AND rate <= 5),
    comment varchar(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);