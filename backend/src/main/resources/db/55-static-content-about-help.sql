-- Strony „O nas” i „Pomoc” linkowane ze stopki. Do tej pory nie istniały: backend zwracał
-- dla nich 200 z treścią „404 - NOT FOUND”. Treść jest tymczasowa (opis tego, jak działa
-- serwis) — docelową podmienimy nowym wpisem z wyższą wersją.
-- lang = 'en', bo StaticContentService szuka treści właśnie w tym języku.
-- „Kontakt” celowo pominięty: nie mamy jeszcze prawdziwych danych kontaktowych.
INSERT INTO static_content (version, name, lang, content)
SELECT 1, 'about', 'en', '<h1>O Biovlo</h1>
<p>Biovlo to platforma do ratowania jedzenia z krótkim terminem przydatności. Sklepy, piekarnie, restauracje i sąsiedzi wystawiają produkty, które inaczej trafiłyby do kosza — taniej albo za darmo.</p>
<h2>Dla kogo</h2>
<ul>
<li><strong>Dla osób prywatnych</strong> — znajdziesz oferty w okolicy, zarezerwujesz produkty i odbierzesz je osobiście.</li>
<li><strong>Dla sklepów i lokali</strong> — wystawisz nadwyżki w kilka minut, potwierdzisz odbiór kodem i sprawdzisz w raporcie, ile jedzenia udało się uratować.</li>
</ul>'
WHERE NOT EXISTS (SELECT 1 FROM static_content WHERE name = 'about');

INSERT INTO static_content (version, name, lang, content)
SELECT 1, 'help', 'en', '<h1>Pomoc</h1>
<h2>Jak zarezerwować produkt?</h2>
<p>Wybierz ofertę, ustaw liczbę sztuk i kliknij „Rezerwuj”. Dostaniesz kod odbioru — znajdziesz go też w zakładce „Moje rezerwacje”.</p>
<h2>Jak odebrać rezerwację?</h2>
<p>Przyjdź w godzinach odbioru podanych w ofercie i pokaż kod w sklepie. Pracownik potwierdzi odbiór.</p>
<h2>Czy mogę anulować rezerwację?</h2>
<p>Tak — aktywną rezerwację anulujesz w zakładce „Moje rezerwacje”. Rezerwacja nieodebrana w terminie wygasa automatycznie.</p>
<h2>Nie dostałem maila aktywacyjnego</h2>
<p>Sprawdź folder spam. Jeśli maila nie ma, spróbuj się zalogować — zobaczysz opcję ponownego wysłania linku aktywacyjnego.</p>'
WHERE NOT EXISTS (SELECT 1 FROM static_content WHERE name = 'help');
