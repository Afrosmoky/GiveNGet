CREATE TABLE fcm_token (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    token VARCHAR(512) NOT NULL UNIQUE,
    device_name VARCHAR(255),
    valid_until TIMESTAMP NOT NULL,
    CONSTRAINT fk_fcm_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE users DROP COLUMN fcm_token;