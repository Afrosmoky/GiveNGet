-- Stan seedera danych demonstracyjnych (com.example.gng.demo.DemoDataSeeder).
-- Jeden wiersz z kotwicą czasu: odświeżanie przesuwa dane demo o pełne doby, które minęły
-- od tej chwili, żeby oferty i raporty nie starzały się na instancji pokazowej.
-- Na instancjach bez DEMO_SEED_ENABLED=true tabela po prostu zostaje pusta.
CREATE TABLE demo_seed_state (
    id        TINYINT  NOT NULL COMMENT 'Zawsze 1 — tabela ma jeden wiersz',
    anchor_at DATETIME NOT NULL COMMENT 'UTC, moment, do którego dane demo są aktualne',
    PRIMARY KEY (id)
);
