-- Dezaktywacja konta pracownika sklepu przez firmę (odwracalna).
--
-- Osobna flaga zamiast users.is_verified: niezweryfikowane konto może samo zamówić nowy
-- link aktywacyjny (POST /api/resentVerification) i się odblokować, więc is_verified=0
-- nie byłoby blokadą. Kolumna żyje w tabeli szczegółów, bo dotyczy tylko STORE_EMPLOYEE.
-- DEFAULT 1 — istniejący pracownicy pozostają aktywni.
ALTER TABLE store_employees_details
    ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1
        COMMENT 'Czy firma dopuszcza pracownika do logowania i potwierdzania odbiorów';
