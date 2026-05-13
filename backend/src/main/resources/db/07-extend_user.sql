ALTER TABLE users
    ADD COLUMN default_language varchar(10) NOT NULL DEFAULT 'pl',
    ADD COLUMN default_currency varchar(10) NOT NULL DEFAULT 'PLN',
    ADD COLUMN lat decimal(9,6) NOT NULL DEFAULT 0.0,
    ADD COLUMN lon decimal(9,6) NOT NULL DEFAULT 0.0;