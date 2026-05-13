CREATE TABLE reset_password_code
(
    id    bigint PRIMARY KEY AUTO_INCREMENT,
    user_id bigint,
    code varchar(255) unique,
    added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used boolean default false,
    FOREIGN KEY (user_id) REFERENCES users(id)
);