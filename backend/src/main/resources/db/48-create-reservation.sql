-- Tabela rezerwacji (docs/04_REZERWACJE_DESIGN.md, sekcja 3).
--
-- Kolumny czasu jako DATETIME, nie TIMESTAMP: aplikacja zapisuje jawny UTC
-- (LocalDateTime.now(ZoneOffset.UTC)), a TIMESTAMP w MySQL konwertowałby wartości
-- wg strefy sesji — co cicho psuje wygasanie po zmianie konfiguracji połączenia.
CREATE TABLE reservation (
    id           VARCHAR(12)  NOT NULL COMMENT 'Losowy identyfikator, spójnie z offer.id',
    offer_id     VARCHAR(12)  NOT NULL,
    user_id      BIGINT       NOT NULL COMMENT 'Kto rezerwuje',
    quantity     INT          NOT NULL COMMENT 'Liczba zarezerwowanych sztuk, >= 1',
    status       VARCHAR(20)  NOT NULL DEFAULT 'RESERVED' COMMENT 'RESERVED, COLLECTED, EXPIRED, CANCELLED',
    pickup_code  CHAR(6)      NOT NULL COMMENT 'Kod do podania przy kasie, alfabet A-Z/2-9 bez znaków mylących',
    created_at   DATETIME     NOT NULL COMMENT 'UTC',
    expires_at   DATETIME     NOT NULL COMMENT 'UTC, koniec holdu',
    collected_at DATETIME     NULL     COMMENT 'UTC, ustawiane przy potwierdzeniu odbioru',
    cancelled_at DATETIME     NULL     COMMENT 'UTC, ustawiane przy anulowaniu',
    PRIMARY KEY (id),
    CONSTRAINT fk_reservation_offer FOREIGN KEY (offer_id) REFERENCES offer (id) ON DELETE CASCADE,
    CONSTRAINT fk_reservation_user  FOREIGN KEY (user_id)  REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_reservation_quantity_positive CHECK (quantity >= 1)
);

-- Kod odbioru jest sekretem potwierdzającym odbiór — unikalność musi gwarantować baza,
-- nie tylko pętla losująca w aplikacji.
CREATE UNIQUE INDEX uq_reservation_pickup_code ON reservation (pickup_code);

-- Pod zapytanie dostępności: SUM(quantity) WHERE offer_id = ? AND status = 'RESERVED' AND expires_at > now.
CREATE INDEX idx_reservation_offer_status_expires ON reservation (offer_id, status, expires_at);

-- Pod listę rezerwacji użytkownika ze stabilnym sortowaniem (created_at DESC, id ASC).
CREATE INDEX idx_reservation_user_created ON reservation (user_id, created_at);

-- Pod scheduler wygaszania: WHERE status = 'RESERVED' AND expires_at <= now.
CREATE INDEX idx_reservation_status_expires ON reservation (status, expires_at);
