# Twoje zadania (poza kodem) — Biovlo

Rzeczy do zrobienia po stronie Piotra: konta zewnętrzne, wdrożenie, weryfikacje. Kod robi CC; to jest reszta. Odhaczaj zrobione.

## Bezpieczeństwo
- [ ] **(rekomendacja) Rotacja sekretów u źródła.** Przeniesienie do ENV nie usuwa ich z historii gita.
  - **Decyzja Piotra:** na razie NIE rotować, ocena: nie wyciekły (repo prywatne).
  - **Rekomendacja / ryzyko:** sekrety są w historii commitów. Jeśli repo trafi na jakikolwiek remote (GitHub itp.), zostanie udostępnione lub laptop/historia będą dostępne — te dane są żywe. Najwyższe ryzyko: hasło aplikacji Gmail (dostęp do maila) i hasło MySQL na VPS (dostęp do bazy). Zalecane zrotowanie przynajmniej tych dwóch przed pilotażem pod marką sieci. Klucz Geoapify — głównie ryzyko kosztów.
- [ ] **ENV na VPS (pilotaż).** Uzupełnić realne wartości w `.env.demo` na serwerze: `JWT_SECRET`, `SMTP_*`, `GEOAPIFY_KEY`, `DB_*`, `CORS_ALLOWED_ORIGINS` (domena pilotażu). Wzorzec: `.env.example`.
- [ ] **`liquibase-dev.properties`** nadal ma hasło dev-bazy (świadomy dług). Jeśli zmienisz hasło MySQL na VPS — zaktualizuj też tu.

## Konta / usługi zewnętrzne
- [x] **Projekt Firebase** — `givenget-b5ef0`, Twój, dostępny; `serviceAccountKey.json` jest na dysku i `firebase-config.js`/VAPID wskazują ten projekt. (Wcześniejsza notatka o „braku dostępu do starego" z `CONTEXT.md` była nieaktualna.) Na produkcję tylko zweryfikuj, że klucz jest aktywny i wstaw ścieżkę do klucza przez ENV (`FIREBASE_CREDENTIALS_PATH`).
- [ ] **Własne konto SMTP** do maili aktywacyjnych (zamiast testowego). Dane do ENV (`SMTP_*`).
- [ ] **Geoapify** — jeśli rotujesz klucz, wstaw nowy do ENV.

## Treści prawne
- [ ] **Prawdziwy regulamin i polityka prywatności (po polsku).** Obecne strony `static-content/terms-of-service` i `privacy-policy` to angielski placeholder („eaty.com", 2013). Przed pilotażem pod marką sieci podmienić na właściwą treść Biovlo (materiał prawny — Ty/Łukasz). Po podmianie podbić `terms.current-version`.

## Wdrożenie pilotażu
- [ ] **HTTPS na środowisku pilotażu.** Reverse proxy (Caddy albo nginx) + certyfikat Let's Encrypt przed frontem/backendem na VPS. **Konieczne** — skaner QR w panelu pracownika (`getUserMedia`) działa tylko w bezpiecznym kontekście; pod samym IP kamera nie wstanie.
- [ ] **Capacitor** jako ostatni krok przed pilotażem (instalowalna apka, push iOS, kamera) — patrz `03_ARCHITEKTURA_MOBILE.md`.

## Weryfikacje lokalne (po odzyskaniu Dockera)
- [ ] **Stan Dockera po `prune --volumes`:** `df -h /`, `docker images`, `docker volume ls` — sprawdź, czy nic krytycznego (bazy innych projektów) nie zniknęło.
- [ ] **Smoke test całego loopu** po `docker compose up -d --build`: firma tworzy ofertę sprzedażową z ceną i ilością > 1 → firma tworzy pracownika (STORE_EMPLOYEE) → user rezerwuje (kod + QR, spadek dostępności) → pracownik `/store/pickup` wpisuje/skanuje kod → odbiór potwierdzony → firma `/reports/savings` widzi sztuki i wartość.
- [ ] **Uruchomić testy współbieżności** (Docker leżał 2+ tury → nieuruchomione, więc niezweryfikowane): `ReservationConcurrencyTest` z bazą IT (komenda w CLAUDE.md / niżej). Potwierdza blokadę wiersza użytkownika przy twardym limicie rezerwacji i wcześniejszą logikę stanu — bez tego security-critical kod jest nieprzetestowany na prawdziwym MySQL.
- [ ] **Build obrazu frontu:** `docker compose build frontend` (zmiana Dockerfile npm→yarn z F#2 nie była budowana przez pełny dysk).
- [ ] **Lokalny wolumen `mysql-data`** trzyma stare hasła (MySQL czyta `MYSQL_*` tylko przy tworzeniu). Jeśli lokalny dev nie łączy się z bazą: `docker compose down -v` (świeży wolumen z nowego `.env`).

## Biznes
- [ ] **Formalne założenie spółki Biovlo** (sp. z o.o.) — od tego zależy wydanie Twoich 8% udziałów po Kamieniu Milowym (umowa to przewiduje). Śledzić z Łukaszem.

---
## Lista skrócona (do rzutu oka)
1. (rekomendowane) zrotować hasło Gmail + hasło MySQL VPS — Twoja decyzja: na razie nie
2. założyć nowy projekt Firebase (blokuje naprawę FCM)
3. własne konto SMTP
4. HTTPS + reverse proxy na VPS (blokuje skan QR)
5. uzupełnić `.env.demo` na VPS realnymi wartościami
6. sprawdzić Docker po prune (`df -h`, `docker images/volume ls`)
7. smoke test całego przepływu po odbudowie stacka
8. `docker compose build frontend`
9. Capacitor przed samym pilotażem
10. pilnować założenia spółki z Łukaszem
