-- Ustawienie domyślnego kodowania i collate dla bazy danych
-- Pamiętaj, aby wykonać to polecenie dla swojej bazy danych, np.:
-- ALTER DATABASE your_database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Tabela dla wspólnych atrybutów użytkowników
CREATE TABLE users (
                       id BIGINT PRIMARY KEY AUTO_INCREMENT,
                       first_name VARCHAR(255) NOT NULL,
                       last_name VARCHAR(255) NOT NULL,
                       email VARCHAR(255) NOT NULL UNIQUE,
                       phone_number VARCHAR(20),
                       password VARCHAR(255) NOT NULL,
                       address VARCHAR(255)
    -- Możesz dodać domyślne kodowanie dla całej tabeli, jeśli nie jest ustawione na poziomie bazy:
    -- DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
);

-- Tabela dla szczegółów zwykłych użytkowników
CREATE TABLE regular_users_details (
                                       user_id BIGINT PRIMARY KEY,
                                       age INT,
                                       profile_picture_id BIGINT, -- Klucz obcy do tabeli images
                                       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, -- Dodano ON DELETE CASCADE
                                       FOREIGN KEY (profile_picture_id) REFERENCES images(id) ON DELETE SET NULL -- Jeśli obraz może być nullem po usunięciu
);

-- Tabela dla szczegółów użytkowników firmowych
CREATE TABLE business_users_details (
                                        user_id BIGINT PRIMARY KEY,
                                        company_name VARCHAR(255) NOT NULL,
                                        company_info TEXT, -- TEXT jest odpowiednie dla dłuższych tekstów
                                        company_logo_id BIGINT, -- Klucz obcy do tabeli images
                                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                                        FOREIGN KEY (company_logo_id) REFERENCES images(id) ON DELETE SET NULL
);

-- Nowa tabela dla linków społecznościowych (relacja jeden do wielu)
CREATE TABLE social_links (
                              id BIGINT PRIMARY KEY AUTO_INCREMENT,
                              business_user_id BIGINT NOT NULL,
                              platform VARCHAR(50) NOT NULL, -- np. "Facebook", "LinkedIn", "Twitter"
                              url VARCHAR(512) NOT NULL, -- Zwiększony rozmiar dla długich URL-i
                              FOREIGN KEY (business_user_id) REFERENCES business_users_details(user_id) ON DELETE CASCADE
);

-- Nowa tabela dla pojedynczych tagów (uniwersalna lista tagów)
CREATE TABLE tags (
                      id BIGINT PRIMARY KEY AUTO_INCREMENT,
                      tag_name VARCHAR(100) NOT NULL UNIQUE -- Nazwy tagów powinny być unikalne globalnie
);

-- Tabela łącząca dla relacji wiele do wielu między BusinessUser a Tag
CREATE TABLE business_user_tags (
                                    business_user_id BIGINT NOT NULL,
                                    tag_id BIGINT NOT NULL,
                                    PRIMARY KEY (business_user_id, tag_id),
                                    FOREIGN KEY (business_user_id) REFERENCES business_users_details(user_id) ON DELETE CASCADE,
                                    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);