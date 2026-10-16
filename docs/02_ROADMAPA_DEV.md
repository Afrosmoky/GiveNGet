# Biovlo MVP — roadmapa developmentu

Kolejność ułożona wg zależności: najpierw fundament stanu magazynowego, na nim rezerwacje, na nich odbiór, a dopiero potem raport/powiadomienia (które potrzebują danych z odbioru). Bezpieczeństwo i wdrożenie na końcu, przed odbiorem MVP.

## Faza 0 — Setup i weryfikacja (start)
- [ ] Zweryfikować stan kodu względem statusów w `01_MVP_ZAKRES.md` (co faktycznie działa vs „od zera").
- [ ] Środowisko lokalne: `docker compose up` (MySQL + backend + frontend), sprawdzić migracje Liquibase.
- [ ] Firebase: własny projekt, `serviceAccountKey.json`, `frontend/src/firebase-config.js`, VAPID key w `firebase-messaging-sw.js`. *(do weryfikacji — z wcześniejszych notatek)*
- [ ] SMTP: własne konto zamiast testowego.
- [ ] Uporządkować sekrety/`.env` (nie trzymać kluczy w repo — patrz Faza 4).

## Faza 1 — Rdzeń mechaniki (A)
- [ ] **Ilość / stan magazynowy** — pole `quantity` na ofercie + dekrementacja przy rezerwacji. *(podstawa dla rezerwacji)*
- [ ] **Rezerwacje** — encja, hold sztuki, wygasanie i zwrot do puli, anulowanie, statusy (aktywna/zarezerwowana/odebrana/wygasła), limity anty-abuse.
- [ ] **Potwierdzenie odbioru** — kod rezerwacji + skan QR kamerą w przeglądarce; domyka rezerwację i zasila statystyki.

## Faza 2 — Sklep / retail (B)
- [ ] **Rola pracownika sklepu** (panel EMPLOYEE) — potrzebna do potwierdzania odbioru i dodawania ofert.
- [ ] **Profil sklepu** — widok publiczny.
- [ ] **Import ofert z Excela** — mapowanie kolumn, walidacja, raport błędów. *(walidacja plików ważna dla bezpieczeństwa)*
- [ ] **Raport oszczędności** — kg, wartość, liczba uratowanych, prosty CO₂. *(zależny od danych z odbioru)*

## Faza 3 — Platforma (C)
- [ ] **Powiadomienia FCM** — potwierdzenie rezerwacji, ostrzeżenie o wygaśnięciu, przypomnienie o odbiorze. *(zależne od rezerwacji/odbioru)*
- [ ] **Statystyki platformowe** — aktywni użytkownicy, sklepy, rezerwacje, odbiory.
- [ ] **Zgody RODO** + akceptacja regulaminu przy rejestracji/rezerwacji.

## Faza 4 — Bezpieczeństwo (D, przed produkcją)
- [ ] CORS (uwaga: wg notatek hardcoded w `SecurityConfig.java` `allowedOriginPatterns("*")` — do naprawienia).
- [ ] Rate limiting.
- [ ] Usunięcie klucza Firebase z repozytorium.
- [ ] Walidacja wgrywanych plików (szczególnie import Excel).
- [ ] Autoryzacja czatu / WebSocket.

## Faza 5 — Bufor i wdrożenie (E)
- [ ] Stabilizacja i testy przepływu rezerwacja → odbiór → raport.
- [ ] Deploy pilotażu na VPS.
- [ ] Zgłoszenie gotowości → **odbiór MVP** wg procedury z `01_MVP_ZAKRES.md` → protokół.

---

## Środowisko / infrastruktura *(z wcześniejszych notatek — zweryfikować)*
- VPS: Ubuntu, Docker. Domeny: biovlo.com / biovlo.pl. Backend :8080, frontend :3000.
- Deploy: `git clone` na VPS → `cp .env.demo .env` → `docker compose up -d --build`.
- Stack: Java 17 / Spring Boot 3.5, MySQL 8, Liquibase · Next.js 15 / React 19, Tailwind · Docker · FCM.

## Definicja „gotowe" (Kamień Milowy)
Podstawowy przepływ **rezerwacja → potwierdzenie odbioru → raport oszczędności** działa na produkcji, wraz z funkcjami retail/platforma/bezpieczeństwo z Załącznika nr 1. Błędy kosmetyczne nie blokują odbioru; brak działającego przepływu = błąd krytyczny.
