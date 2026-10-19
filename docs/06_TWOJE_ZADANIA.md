# Twoje zadania (poza kodem) — Biovlo

Rzeczy do zrobienia po stronie Piotra: konta zewnętrzne, wdrożenie, weryfikacje. Kod robi CC; to jest reszta. Odhaczaj zrobione.

## Bezpieczeństwo
- [ ] **(rekomendacja) Rotacja sekretów u źródła.** Przeniesienie do ENV nie usuwa ich z historii gita.
  - **Decyzja Piotra:** na razie NIE rotować, ocena: nie wyciekły (repo prywatne).
  - **Rekomendacja / ryzyko:** sekrety są w historii commitów. Jeśli repo trafi na jakikolwiek remote (GitHub itp.), zostanie udostępnione lub laptop/historia będą dostępne — te dane są żywe. Najwyższe ryzyko: hasło aplikacji Gmail (dostęp do maila) i hasło MySQL na VPS (dostęp do bazy). Zalecane zrotowanie przynajmniej tych dwóch przed pilotażem pod marką sieci. Klucz Geoapify — głównie ryzyko kosztów.
- [ ] **ENV na VPS (pilotaż).** Uzupełnić realne wartości w `.env.demo` na serwerze: `JWT_SECRET`, `SMTP_*`, `GEOAPIFY_KEY`, `DB_*`, `CORS_ALLOWED_ORIGINS` (domena pilotażu). Wzorzec: `.env.example`.
- [ ] **`liquibase-dev.properties`** nadal ma hasło dev-bazy (świadomy dług). Jeśli zmienisz hasło MySQL na VPS — zaktualizuj też tu.

## Konta / usługi zewnętrzne
- [x] **Projekt Firebase** — `givenget-b5ef0`, Twój, dostępny; `serviceAccountKey.json` jest na dysku i `firebase-config.js`/VAPID wskazują ten projekt. (Wcześniejsza notatka o „braku dostępu do starego" z `CONTEXT.md` była nieaktualna.) Na produkcję zweryfikuj, że klucz jest aktywny i wstaw ścieżkę przez ENV (`FIREBASE_CREDENTIALS_PATH` / `FIREBASE_CREDENTIALS_FILE`).
- [ ] **DECYZJA: rotacja klucza serwisowego Firebase.** Klucz `serviceAccountKey.json` był wcześniej **pakowany do JAR-a / obrazu Dockera backendu** (`COPY . .` + `mvn package`, bez wykluczenia). Naprawione: `backend/.dockerignore` wyklucza go z kontekstu builda, w runtime montowany jako plik tylko-do-odczytu; nowy obraz go nie zawiera. Klucz **nigdy nie był w gicie**. **Do rozstrzygnięcia:** czy jakikolwiek wcześniejszy obraz backendu trafił do rejestru (Docker Hub/GHCR) albo na VPS. Jeśli tak → **zrotuj klucz w konsoli Firebase** (jest w warstwach tego obrazu). Jeśli nie (deploy dopiero przed Tobą) → sprawa zamknięta. Rekomendacja: zrotować raz przed pierwszym deployem jako tania polisa (2 min, Twój projekt).
- [ ] **FCM — weryfikacja na VPS (wymaga HTTPS):** push na iOS 16.4+ (tylko w PWA dodanej do ekranu początkowego), link `fcm_options.link` (FCM przyjmuje tylko HTTPS — na localhost link niesie service worker), ustawić `FRONT_APP_URL` na publiczny `https://…` i `FIREBASE_CREDENTIALS_FILE` na ścieżkę klucza na serwerze, instalacja + push w tle na Androidzie.
- **Gdzie są klucze geo:** backend Geoapify = `GEOAPIFY_KEY` (ENV; w properties `geoapify.api.key=${GEOAPIFY_KEY}`). **Działający klucz = literał `ece891cb04c3409bb4770905dccb5c72`** (jedyny, jaki był zaszyty w `application-dev.properties` — prod go używa). NIE jest martwy: lokalny 401 wynika z **nieustawionego `GEOAPIFY_KEY`** (property wysyła dosłowne `${GEOAPIFY_KEY}`). Lokalnie ustaw `GEOAPIFY_KEY=ece891cb04c3409bb4770905dccb5c72` w `.env` (+ ew. `localhost` w dozwolonych originach klucza). Front: `frontend/src/config/environment.ts` ma **zahardkodowane** `geoapifyApiKey: '432e181…'` (osobny klucz; front i tak geokoduje przez backendowy proxy `/api/geocode`, więc prawdopodobnie zbędny) i **Google Maps** `googleApiKey`/`REACT_APP_Maps_API_KEY: 'AIza…'` (tym renderuje się mapa — to NIE Geoapify). Na VPS: ważny `GEOAPIFY_KEY` w `.env.demo` + w Google Cloud Console dopuścić referrer domeny pilotażu (i `localhost`) dla klucza Maps. Rozważyć przeniesienie literałów z `environment.ts` do ENV i ograniczenie kluczy w panelach.
- [ ] **Włączyć biling Google Maps.** Mapa (`/offers/map` + mapy w ofertach) rzuca `BillingNotEnabledMapError` i znak wodny „For development purposes only", bo klucz `AIzaSyAvK7…` (w `frontend/src/config/environment.ts`) nie ma bilingu. Kroki: Google Cloud Console → projekt z tym kluczem (APIs & Services → Credentials) → **Billing** (podpiąć kartę) → **Maps JavaScript API** włączone (Geocoding/Places niepotrzebne — geokodujemy przez Geoapify) → **ograniczyć klucz** (HTTP referrers: `http://localhost:3000/*` + `https://DOMENA/*`; API restrictions: tylko Maps JavaScript API) → opcjonalnie budget alert. Darmowy limit (~$200/mc) pokryje pilotaż. Po włączeniu działa bez redeploya (zmiana po stronie Google). **DECYZJA: włączamy biling** (nie przechodzimy na OSM/Leaflet).
- [ ] **Własne konto SMTP** do maili aktywacyjnych (zamiast testowego). Dane do ENV (`SMTP_*`).
- [ ] **Geoapify** — jeśli rotujesz klucz, wstaw nowy do ENV.

## Treści prawne
- [ ] **Prawdziwy regulamin i polityka prywatności (po polsku).** Obecne strony `static-content/terms-of-service` i `privacy-policy` to angielski placeholder („eaty.com", 2013). Przed pilotażem pod marką sieci podmienić na właściwą treść Biovlo (materiał prawny — Ty/Łukasz). Po podmianie podbić `terms.current-version`.

## Wdrożenie pilotażu
- [ ] **Konta testowe NIE mogą trafić na produkcję/VPS.** W bazie dev są konta `*@test.pl` (m.in. `admin@test.pl` z rolą ADMIN, `firma@test.pl`, `user@test.pl`, `pracownik@test.pl`) — hasła jak reszta kont testowych. Przed deployem upewnić się, że baza pilotażu jest czysta (Liquibase zakłada schemat, nie seeduje tych kont, ale zweryfikować po migracji). Realne konto admina założyć osobno z silnym hasłem.
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
