-- Cena przed obniżką (docs/08 #7) — pokazuje oszczędność: „normalnie X, teraz Y” i % rabatu.
--
-- Opcjonalna i tylko dla ofert sprzedażowych; regułę „większa od price” egzekwuje OfferService
-- (tak jak reguły samej ceny), więc bez CHECK w bazie. Ta sama skala co price — DECIMAL(10,2).
-- Istniejące oferty dostają NULL, czyli „bez przeceny”.
ALTER TABLE offer
    ADD COLUMN original_price DECIMAL(10, 2) NULL
        COMMENT 'Cena za sztukę przed obniżką; NULL = oferta bez przeceny'
        AFTER price;
