-- Znaczniki wysłanych powiadomień push o rezerwacji (docs/08 #5).
--
-- Scheduler „przejmuje” wysyłkę warunkowym UPDATE ... WHERE <kolumna> IS NULL — tylko ten
-- przebieg (i ta instancja aplikacji), której UPDATE zmienił wiersz, wysyła push. Daje to
-- wysyłkę co najwyżej raz także przy kilku instancjach i nakładających się przebiegach.
-- NULL = jeszcze nie wysłano. Wartości w UTC, jak pozostałe kolumny rezerwacji.
ALTER TABLE reservation
    ADD COLUMN expiry_warning_sent_at DATETIME NULL,
    ADD COLUMN pickup_reminder_sent_at DATETIME NULL;

-- Kandydaci schedulera: aktywne rezerwacje bez wysłanego ostrzeżenia, po terminie wygaśnięcia
CREATE INDEX idx_reservation_status_expires_warning
    ON reservation (status, expires_at, expiry_warning_sent_at);
