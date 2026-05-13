CREATE TABLE images (
                               id BIGINT PRIMARY KEY AUTO_INCREMENT,
                               file_name VARCHAR(255) NOT NULL,
                               typ_mime VARCHAR(100),
                               added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                               image LONGTEXT NOT NULL
);