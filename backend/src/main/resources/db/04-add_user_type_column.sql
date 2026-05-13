-- Dodanie kolumny type do tabeli users
-- Typ ENUM z wartościami: REGULAR, COMPANY, EMPLOYEE, ADMIN

-- Krok 1: Dodaj kolumnę type jako ENUM
ALTER TABLE users 
ADD COLUMN type ENUM('REGULAR', 'COMPANY', 'EMPLOYEE', 'ADMIN');

-- Krok 2: Ustaw typ dla istniejących użytkowników na podstawie obecności w tabelach szczegółów
-- Użytkownicy z wpisami w regular_users_details -> REGULAR
UPDATE users u
SET u.type = 'REGULAR'
WHERE u.id IN (SELECT DISTINCT user_id FROM regular_users_details);

-- Użytkownicy z wpisami w business_users_details -> COMPANY  
UPDATE users u
SET u.type = 'COMPANY'
WHERE u.id IN (SELECT DISTINCT user_id FROM business_users_details);

-- Krok 3: Sprawdź czy są jakieś użytkownicy bez typu i ustaw domyślny REGULAR
UPDATE users 
SET type = 'REGULAR'
WHERE type IS NULL;

-- Krok 4: Dodaj constraint NOT NULL
ALTER TABLE users 
MODIFY COLUMN type ENUM('REGULAR', 'COMPANY', 'EMPLOYEE', 'ADMIN') NOT NULL; 