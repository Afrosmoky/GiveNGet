-- users.create_date było NULL dla każdego konta założonego przez aplikację: kolumna ma
-- DEFAULT CURRENT_TIMESTAMP (migracja 28), ale Hibernate wstawiał jawnie null z pustego
-- pola encji. Od teraz ustawia je UserModel (@PrePersist, UTC).
--
-- Dla kont zarejestrowanych po wprowadzeniu zgód (migracja 50) znamy dokładny moment
-- rejestracji — to terms_accepted_at (UTC). Starszych kont nie da się wiarygodnie
-- odtworzyć: zostają z NULL, liczą się w sumach, ale nie w „nowych w okresie".
UPDATE users
SET create_date = terms_accepted_at
WHERE create_date IS NULL
  AND terms_accepted_at IS NOT NULL;
