-- Dodanie pola dla dozwolonych typów transakcji do kategorii (tylko jeśli nie istnieje)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'category' 
     AND COLUMN_NAME = 'allowed_transaction_types') = 0,
    'ALTER TABLE category ADD COLUMN allowed_transaction_types JSON',
    'SELECT "Column allowed_transaction_types already exists in category table"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Dodanie pola dla dozwolonych typów transakcji do podkategorii (tylko jeśli nie istnieje)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'subcategory' 
     AND COLUMN_NAME = 'allowed_transaction_types') = 0,
    'ALTER TABLE subcategory ADD COLUMN allowed_transaction_types JSON',
    'SELECT "Column allowed_transaction_types already exists in subcategory table"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Usunięcie wszystkich istniejących kategorii i podkategorii
DELETE FROM favorite_categories;
DELETE FROM subcategory;
DELETE FROM category;

-- Resetowanie auto_increment
ALTER TABLE category AUTO_INCREMENT = 1;
ALTER TABLE subcategory AUTO_INCREMENT = 1;

-- Wstawienie nowych kategorii z typami transakcji
INSERT INTO category (name, allowed_transaction_types) VALUES 
('Dania domowe (prywatne)', '["free", "exchange"]'),
('Nadwyżki restauracyjne/sklepowe', '["free", "exchange", "sale"]'),
('Owoce i warzywa', '["free", "exchange", "sale"]'),
('Nabiał i alternatywy', '["free", "exchange", "sale"]'),
('Mięso, drób i ryby', '["free", "exchange", "sale"]'),
('Pieczywo i wypieki', '["free", "exchange", "sale"]'),
('Spiżarnia i produkty suche', '["free", "exchange", "sale"]'),
('Mrożonki', '["free", "exchange", "sale"]'),
('Dania gotowe i przygotowane', '["free", "exchange", "sale"]'),
('Słodycze i przekąski', '["free", "exchange", "sale"]'),
('Napoje bezalkoholowe', '["free", "exchange", "sale"]'),
('Dziecko i niemowlę', '["free", "exchange", "sale"]'),
('Karma dla zwierząt', '["free", "exchange", "sale"]'),
('Chemia i artykuły domowe (non-food)', '["free", "exchange", "sale"]'),
('Inne', '["free", "exchange", "sale"]');

-- Wstawienie podkategorii dla "Dania domowe (prywatne)" - kategoria 1
-- Brak podkategorii

-- Wstawienie podkategorii dla "Nadwyżki restauracyjne/sklepowe" - kategoria 2
-- Brak podkategorii

-- Wstawienie podkategorii dla "Owoce i warzywa" - kategoria 3
INSERT INTO subcategory (name, category_id, allowed_transaction_types) VALUES 
('Świeże owoce', 3, '["free", "exchange", "sale"]'),
('Świeże warzywa', 3, '["free", "exchange", "sale"]'),
('Zioła i zielenina', 3, '["free", "exchange", "sale"]'),
('Grzyby', 3, '["free", "exchange", "sale"]'),
('Plony z działki (domowe)', 3, '["free", "exchange"]');

-- Wstawienie podkategorii dla "Nabiał i alternatywy" - kategoria 4
INSERT INTO subcategory (name, category_id, allowed_transaction_types) VALUES 
('Mleko i napoje roślinne', 4, '["free", "exchange", "sale"]'),
('Sery', 4, '["free", "exchange", "sale"]'),
('Jogurty i desery mleczne', 4, '["free", "exchange", "sale"]'),
('Masło i smarowidła', 4, '["free", "exchange", "sale"]'),
('Jaja', 4, '["free", "exchange", "sale"]');

-- Wstawienie podkategorii dla "Mięso, drób i ryby" - kategoria 5
INSERT INTO subcategory (name, category_id, allowed_transaction_types) VALUES 
('Świeże mięso', 5, '["free", "exchange", "sale"]'),
('Drób', 5, '["free", "exchange", "sale"]'),
('Ryby i owoce morza', 5, '["free", "exchange", "sale"]'),
('Wędliny i wyroby wędliniarskie', 5, '["free", "exchange", "sale"]'),
('Mrożone mięso/ryby', 5, '["free", "exchange", "sale"]');

-- Wstawienie podkategorii dla "Pieczywo i wypieki" - kategoria 6
INSERT INTO subcategory (name, category_id, allowed_transaction_types) VALUES 
('Pieczywo i bułki', 6, '["free", "exchange", "sale"]'),
('Wypieki słodkie', 6, '["free", "exchange", "sale"]'),
('Wypieki wytrawne', 6, '["free", "exchange", "sale"]'),
('Wypieki bezglutenowe', 6, '["free", "exchange", "sale"]');

-- Wstawienie podkategorii dla "Spiżarnia i produkty suche" - kategoria 7
INSERT INTO subcategory (name, category_id, allowed_transaction_types) VALUES 
('Ryż i zboża', 7, '["free", "exchange", "sale"]'),
('Makarony i kluski', 7, '["free", "exchange", "sale"]'),
('Mąki i dodatki do pieczenia', 7, '["free", "exchange", "sale"]'),
('Oleje i octy', 7, '["free", "exchange", "sale"]'),
('Cukier, sól i przyprawy', 7, '["free", "exchange", "sale"]'),
('Konserwy i przetwory w słoikach', 7, '["free", "exchange", "sale"]');

-- Wstawienie podkategorii dla "Mrożonki" - kategoria 8
INSERT INTO subcategory (name, category_id, allowed_transaction_types) VALUES 
('Warzywa i owoce mrożone', 8, '["free", "exchange", "sale"]'),
('Lody i desery mrożone', 8, '["free", "exchange", "sale"]'),
('Dania gotowe mrożone', 8, '["free", "exchange", "sale"]'),
('Pieczywo i wypieki mrożone', 8, '["free", "exchange", "sale"]');

-- Wstawienie podkategorii dla "Dania gotowe i przygotowane" - kategoria 9
INSERT INTO subcategory (name, category_id, allowed_transaction_types) VALUES 
('Dania domowe', 9, '["free", "exchange"]'),
('Nadwyżki restauracyjne', 9, '["free", "exchange", "sale"]'),
('Sałatki i kanapki', 9, '["free", "exchange", "sale"]'),
('Zestawy do gotowania (meal kits)', 9, '["free", "exchange", "sale"]');

-- Wstawienie podkategorii dla "Słodycze i przekąski" - kategoria 10
INSERT INTO subcategory (name, category_id, allowed_transaction_types) VALUES 
('Czekolady i cukierki', 10, '["free", "exchange", "sale"]'),
('Chipsy i przekąski słone', 10, '["free", "exchange", "sale"]'),
('Orzechy i suszone owoce', 10, '["free", "exchange", "sale"]'),
('Płatki śniadaniowe i batoniki', 10, '["free", "exchange", "sale"]');

-- Wstawienie podkategorii dla "Napoje bezalkoholowe" - kategoria 11
INSERT INTO subcategory (name, category_id, allowed_transaction_types) VALUES 
('Woda i napoje gazowane', 11, '["free", "exchange", "sale"]'),
('Soki i smoothie', 11, '["free", "exchange", "sale"]'),
('Napoje słodzone', 11, '["free", "exchange", "sale"]'),
('Herbata i kawa (opakowane)', 11, '["free", "exchange", "sale"]');

-- Wstawienie podkategorii dla "Dziecko i niemowlę" - kategoria 12
INSERT INTO subcategory (name, category_id, allowed_transaction_types) VALUES 
('Żywność dla niemowląt (słoiczki/tubki)', 12, '["free", "exchange", "sale"]'),
('Mleko modyfikowane (tylko zamknięte)', 12, '["free", "exchange", "sale"]'),
('Przekąski dla dzieci', 12, '["free", "exchange", "sale"]');

-- Wstawienie podkategorii dla "Karma dla zwierząt" - kategoria 13
INSERT INTO subcategory (name, category_id, allowed_transaction_types) VALUES 
('Karma sucha', 13, '["free", "exchange", "sale"]'),
('Karma mokra', 13, '["free", "exchange", "sale"]'),
('Przysmaki dla zwierząt', 13, '["free", "exchange", "sale"]');

-- Wstawienie podkategorii dla "Chemia i artykuły domowe (non-food)" - kategoria 14
INSERT INTO subcategory (name, category_id, allowed_transaction_types) VALUES 
('Środki czystości i pranie', 14, '["free", "exchange", "sale"]'),
('Papier i artykuły jednorazowe', 14, '["free", "exchange", "sale"]'),
('Higiena osobista (zamknięte)', 14, '["free", "exchange", "sale"]'),
('Akcesoria kuchenne (folie, worki)', 14, '["free", "exchange", "sale"]');

-- Wstawienie podkategorii dla "Inne" - kategoria 15
-- Brak podkategorii
