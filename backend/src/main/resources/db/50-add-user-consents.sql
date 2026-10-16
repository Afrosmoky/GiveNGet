-- Zgody przy rejestracji: akceptacja regulaminu i polityki prywatności (docs/08, pozycja 2).
--
-- Kolumny są NULL-owalne: konta założone przed tą migracją nie mają zapisanej zgody.
-- Ponowna akceptacja dla nich (np. po podbiciu wersji regulaminu) to osobny krok.
-- Czasy w UTC, tak jak w rezerwacjach.
ALTER TABLE users
    ADD COLUMN terms_accepted_version VARCHAR(32) NULL COMMENT 'Wersja regulaminu zaakceptowana przy rejestracji (terms.current-version)',
    ADD COLUMN terms_accepted_at DATETIME NULL COMMENT 'Moment akceptacji regulaminu, UTC',
    ADD COLUMN privacy_accepted_at DATETIME NULL COMMENT 'Moment akceptacji polityki prywatności, UTC';

-- Formularz rejestracji linkuje do /static-content/privacy-policy, a migracja 02 seeduje
-- tylko terms-of-service — na świeżej bazie link prowadziłby do błędu. Wstawiamy
-- placeholder tylko wtedy, gdy wpisu nie ma, żeby nie nadpisać istniejącej treści.
-- lang = 'en', bo StaticContentService szuka treści wyłącznie w tym języku.
INSERT INTO static_content (version, name, lang, content)
SELECT 1, 'privacy-policy', 'en',
       '<h1>Polityka prywatności</h1><p><strong>Treść w przygotowaniu.</strong> Pełna polityka prywatności serwisu Biovlo zostanie opublikowana przed uruchomieniem pilotażu.</p><p>Administratorem danych osobowych podanych przy rejestracji jest operator serwisu Biovlo. Dane są przetwarzane w celu założenia i prowadzenia konta oraz realizacji rezerwacji.</p>'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM static_content WHERE name = 'privacy-policy');
