# Biovlo — podsumowanie projektu i umowy

## Projekt
Biovlo to platforma i aplikacja przeciwdziałająca marnowaniu żywności („second-hand food"): sklepy i użytkownicy wystawiają oraz odbierają produkty z krótkim terminem przydatności (za darmo, na wymianę lub taniej), zamiast je utylizować. Kod: repozytorium w tym folderze (backend Spring Boot + frontend Next.js).

Cel bieżącego etapu: wąskie, działające **MVP gotowe do pilotażu w realnym sklepie sieci** (np. Żabka). Przewodni przepływ: **rezerwacja → potwierdzenie odbioru → raport oszczędności**.

## Strony i rola
- **Założyciel:** Łukasz Klębowski (GRUCOMPANY Łukasz Klębowski — jednoosobowa działalność). Spółka Biovlo będzie formalnie założona później.
- **Współpracownik / CTO:** Piotr Szulc — kierownictwo techniczne projektu (architektura, decyzje technologiczne, realizacja funkcji MVP, bezpieczeństwo, wdrożenia; docelowo budowa i prowadzenie zespołu).

## Kluczowe ustalenia umowy (podpisana 09.2026)
- **8% udziału ekonomicznego w Proceeds** projektu od początku współpracy.
- Po osiągnięciu **Kamienia Milowego** 8% Proceeds przekształca się w **8% udziałów w spółce** Biovlo (spółka do formalnego założenia; Założyciel zobowiązany doprowadzić do jej określenia i wydać udziały).
- **Ochrona przed rozwodnieniem** do pierwszej realnej rundy inwestycyjnej (pożyczki/granty/środki własne/finansowanie techniczne nie liczą się jako runda).
- **Tag-along przy exit** — prawo przyłączenia się do sprzedaży na tych samych warunkach i cenie za udział, proporcjonalnie do 8%.
- **Zakończenie bez winy przed Kamieniem** — udziały proporcjonalne do wkładu (liczone wg Załącznika nr 2 i stopnia ukończenia MVP).
- **Kamień nieosiągnięty** — zostaje 8% w Proceeds.
- **Brak podwójnego naliczania** — po objęciu udziałów Proceeds nie nalicza się ponownie (poza transakcjami zakontraktowanymi wcześniej).
- **IP** — prawa do rezultatów przechodzą na Projekt/spółkę; wynagrodzeniem za przeniesienie jest 8% / udziały.
- **Poufność** — obowiązuje w trakcie i 10 lat po współpracy.
- **Ochrona konkurencji** — dotyczy know-how Biovlo, **nie jest** zakazem pracy w branży.
- **Rola i zakres:** rola CTO (Załącznik nr 2); wiążący zakres warunkujący Kamień Milowy = Załącznik nr 1. Zadania poza zakresem — osobne pisemne ustalenia.

## Kamień Milowy — dwie ścieżki
1. Działające produkcyjnie **MVP** zgodne z Załącznikiem nr 1, **albo**
2. Rzeczywisty **pilotaż** z min. jednym podmiotem zewnętrznym (pisemne porozumienie/umowa pilotażowa) + uruchomiony przepływ rezerwacja → odbiór → raport.

Odbiór potwierdzany protokołem; szczegóły procedury w `01_MVP_ZAKRES.md`.

## Stack
Java 17 / Spring Boot 3.5, MySQL 8, Liquibase · Next.js 15 / React 19, Tailwind · Docker. Wdrożenie: VPS (Ubuntu), domeny biovlo.com / biovlo.pl. Powiadomienia: FCM.

## Dokumenty powiązane
- `01_MVP_ZAKRES.md` — pełny zakres MVP, statusy, estymacje, kryteria odbioru.
- `02_ROADMAPA_DEV.md` — kolejność budowy i checklist startu.
- Umowa: `../Umowa_Biovlo_do_podpisu.docx` (czysta), `../Umowa_Biovlo_redline.docx` (z historią zmian).
- Źródłowy zakres pilotażu: `../Biovlo_zakres_pilotazu.docx`.
