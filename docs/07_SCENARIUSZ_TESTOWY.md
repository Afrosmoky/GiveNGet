# Scenariusz testowy — lokalny smoke test pilotażu

Cel: ręcznie przejść cały zakres pilotażu (przepływ **rezerwacja → odbiór → raport** + import, zgody, profil sklepu, statystyki, powiadomienia) i sprawdzić guardy. Testy jednostkowe/IT pokrywają logikę; to weryfikuje kawałki razem.

> Wartości lokalne (docker compose): baza `gngdev`, user `gnguser`, hasło `local-not-a-secret` (domyślne w `docker-compose.yml`). Kolumna weryfikacji to `is_verified`.

---

## 0. Rzeczy do wykonania PRZED testem (checklista)
- [ ] **Docker działa** (`docker info` odpowiada; jak wisi — restart Docker Desktop).
- [ ] **`.env` gotowy** — skopiowany z `.env.example`, URL-e na `localhost` (`FRONT_APP_URL=http://localhost:3000`, `NEXT_PUBLIC_API_URL=http://localhost:8080`, `CORS_ALLOWED_ORIGINS=http://localhost:3000`), `JWT_SECRET` ustawiony. `DB_*` nie trzeba — compose ma domyślne. **Nie używaj `.env.demo`** (wskazuje na VPS).
- [ ] **Klucz Google Maps dopuszcza localhost** — w Google Cloud Console (projekt z „Maps Platform API Key") → referrery HTTP zawierają `http://localhost:3000/*`. Bez tego mapa na `/register` nie wstanie.
- [ ] **(dla 3e — powiadomienia) klucz Firebase** — `backend/src/main/resources/serviceAccountKey.json` jest na dysku (projekt `givenget-b5ef0`). #5 montuje go do kontenera. Bez #5 FCM jest wyłączone (reszta działa).
- [ ] **Świeży build z najnowszym kodem:**
  ```
  cd ~/Sites/gng
  docker compose up -d --build
  docker compose logs -f backend      # czekaj na "Started GngApplication"
  docker compose ps                   # 3 serwisy Up
  ```
  Jeśli backend sypie `Access denied for user 'gnguser'` → stary wolumen bazy: `docker compose down -v && docker compose up -d --build` (świeża baza).
- [ ] **Szybki sanity check:** `curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/v1/reservations` → **403** (endpoint żyje). 404 = kod się nie przebudował.

Front: http://localhost:3000, backend: http://localhost:8080. Kamera do skanu QR działa na `localhost` (bezpieczny kontekst) — HTTPS dopiero pod IP na VPS.

---

## 1. Konta
Rejestracja **tworzy konto nawet gdy mail aktywacyjny nie pójdzie** (SMTP lokalnie zwykle nie działa — to nie blokuje). Konto powstaje jako niezweryfikowane; odblokowujesz je w bazie.

1. **Firma (COMPANY)** — `/register`, formularz firmowy (zaznacz lokalizację na mapie — wymagane lat/lon; zaznacz checkbox zgód).
2. **Użytkownik (REGULAR)** — `/register`, formularz użytkownika (checkbox zgód).
3. **Odblokuj oba konta i ZRESTARTUJ backend** (cache `@Cacheable` na userze — bez restartu login poda starą rolę/stan):
   ```
   docker compose exec mysql mysql -ugnguser -plocal-not-a-secret gngdev \
     -e "UPDATE users SET is_verified=1;"
   docker compose restart backend
   ```
4. Zaloguj się każdym kontem hasłem podanym przy rejestracji.
5. **Pracownik sklepu (STORE_EMPLOYEE)** — zakłada go firma w UI. Zalogowany jako firma: menu → **👥 Pracownicy sklepu** (albo kafelek w dashboardzie firmy, ikona 👥 w nagłówku mobilnym) → `/store/employees`. Wypełnij formularz: imię `Jan`, nazwisko `Kowalski`, e-mail `pracownik@test.pl`, hasło `Haslo123!` (min. 8 znaków), telefon opcjonalnie → **Utwórz konto pracownika**.
   - Oczekiwane: komunikat o utworzeniu, formularz wyczyszczony, pracownik na górze tabeli ze statusem **aktywny**. Konto powstaje od razu zweryfikowane — bez restartu i bez `UPDATE` w bazie.
   - Ten sam e-mail drugi raz → błąd przy polu e-mail „Konto o tym adresie e-mail już istnieje" (`409 EMAIL_ALREADY_EXISTS`), lista bez zmian.
   - Hasło krótsze niż 8 znaków → błąd przy polu hasła (`400 VALIDATION_FAILED`).

   Zaloguj się kontem pracownika na froncie.
6. **Dezaktywacja pracownika** — na `/store/employees` przy pracowniku **Dezaktywuj** → status **dezaktywowany**.
   - Logowanie tym kontem nie przechodzi (dziś przekierowuje na `/user-not-confirmed` — stary endpoint logowania nie odróżnia dezaktywacji od niepotwierdzonego maila; przycisk ponownej wysyłki maila nic nie zmienia, bo konto pozostaje zweryfikowane).
   - Pracownik zalogowany **przed** dezaktywacją: próba potwierdzenia odbioru na `/store/pickup` → `403 EMPLOYEE_DEACTIVATED` („Twoje konto pracownika zostało dezaktywowane…"). Jego token żyje do 3 h — w tym czasie nadal widzi np. czaty, ale odbioru już nie potwierdzi (luka zaakceptowana).
   - **Aktywuj** → pracownik loguje się i potwierdza odbiory ponownie. Restart backendu niepotrzebny (cache konta jest czyszczony przy zmianie).
   - Druga firma nie widzi pracowników pierwszej na swojej liście; `PATCH /api/v1/store-employees/{id}` na cudzym id → `404 STORE_EMPLOYEE_NOT_FOUND`. Konto inne niż firmowe na `/store/employees` → przekierowanie na `/unauthorized` (API: `403`).

---

## 2. Happy path (rdzeń loopu)
| Krok | Akcja | Oczekiwany wynik |
|---|---|---|
| 1 | Firma: utwórz ofertę **sprzedaż**, cena 5,00 PLN, ilość **10** | Oferta widoczna, dostępność 10 |
| 2 | User: wejdź w ofertę, zarezerwuj **3 szt.** | Kod odbioru + QR; dostępność → **7** |
| 3 | User: „Moje rezerwacje" | Rezerwacja `RESERVED`, kod + QR |
| 4 | Pracownik: `/store/pickup` | Panel dostępny (inne role → brak dostępu) |
| 5 | Pracownik: wpisz kod / zeskanuj QR → potwierdź | „Odebrano"; licznik sesji rośnie |
| 6 | User: „Moje rezerwacje" | Status `COLLECTED`, kod zniknął |
| 7 | Oferta: dostępność | Nadal **7** (odbiór NIE zwalnia stanu) |
| 8 | Firma: `/reports/savings` | Uratowane: 3; wartość: 15,00 PLN; kg/CO₂ z plakietką „SZACUNEK" |

## 3. Przypadki brzegowe (guardy)
- **Za dużo:** rezerwacja > dostępne → `OFFER_NOT_AVAILABLE`.
- **Anulowanie:** zarezerwuj, anuluj → dostępność **rośnie** z powrotem.
- **Zły kod:** losowy kod u pracownika → `INVALID_PICKUP_CODE` (404).
- **Obcy sklep:** pracownik firmy A potwierdza kod oferty firmy B → `FORBIDDEN`.
- **Własna oferta:** firma nie widzi „Rezerwuj" na swojej ofercie.
- **Rate limit tempo:** >10 rezerwacji/h jednym userem → `429 RATE_LIMIT_EXCEEDED` + `Retry-After`.
- **Rate limit stan:** 6. aktywna rezerwacja → `TOO_MANY_ACTIVE_RESERVATIONS` (bez `Retry-After`).
- **Brute-force kodu:** >30 `collect`/min jednym pracownikiem → `429`.
- **Logowanie:** >10 nieudanych/min z jednego IP → `429`.
- **Pusta wartość w raporcie:** oferta **za darmo**, odbierz → sztuki rosną, wartość pusta z komunikatem „oferty bez ceny".

## 3a. Import ofert z Excela (firma)
1. Firma → `/offers/import` → **„Pobierz szablon"** (ma przykłady, arkusz „Instrukcja", listę kategorii).
2. Wypełnij: jeden `sprzedaz` z ceną+ilością, jeden `za_darmo` bez ceny, jeden błędny (`sprzedaz` bez ceny). Wyślij.
3. Oczekiwane: `utworzone: N`, tabela błędów z numerami wierszy, info o wierszach w moderacji (PENDING).
4. Zaimportowane oferty widoczne z ceną i ilością, właściciel = firma.
5. Brzegowe: `.csv` jako `.xlsx` → `INVALID_FILE_TYPE`; brak pliku → `FILE_REQUIRED`; >2 MB → `413 FILE_TOO_LARGE`; >500 wierszy → `TOO_MANY_ROWS`; brak kolumn → `MISSING_COLUMNS`; termin w przeszłości → `EXPIRY_DATE_IN_PAST`; typ niedozwolony w kategorii → `TRANSACTION_TYPE_NOT_ALLOWED`; nie-COMPANY → `403`.

## 3b. Zgody przy rejestracji (regulamin + RODO)
1. `/register` **bez** checkboxa → wysłanie zablokowane, żadne żądanie nie idzie.
2. Linki „regulamin"/„polityka" otwierają się w nowej karcie, formularz zostaje wypełniony.
3. Zaznacz → wyślij → konto utworzone. Firma: checkbox na 2. kroku.
4. Zapis w bazie:
   ```
   docker compose exec mysql mysql -ugnguser -plocal-not-a-secret gngdev \
     -e "SELECT email, terms_accepted_version, terms_accepted_at, privacy_accepted_at FROM users;"
   ```
   Oczekiwane: wersja `1.0`, oba czasy wypełnione, w **UTC**.
5. API bez flag → `400 CONSENT_REQUIRED`, `details.missing = ["terms","privacy"]`, konto nie powstaje.

## 3c. Publiczny profil sklepu
1. Firma ma kilka ofert (np. z 3a); jedną ustaw na nieaktywną.
2. User: na kafelku oferty firmy kliknij **„Sklep: <nazwa>"** → `/stores/<id>` (klik w resztę kafelka otwiera ofertę).
3. Strona sklepu: logo, nazwa, adres, ocena + „Opinie", opis, mapa, licznik aktywnych ofert; siatka tylko **ACTIVE**; przy >20 „Pokaż więcej" bez duplikatów.
4. Wejdź w ofertę ze strony sklepu → rezerwacja działa.
5. Widok oferty firmy: nazwa + „Zobacz sklep" → `/stores/<id>`; osoba prywatna → `/profile/<id>`.
6. Brzegowe: `/stores/<id osoby prywatnej>` i nieistniejące → „Ten sklep nie istnieje…" (`404 STORE_NOT_FOUND`); sklep bez ofert → komunikat; bez logowania → przekierowanie; `/api/v1/stores/abc` → `400 INVALID_PARAMETER`; `?size=500` → przycięte do 100.

## 3d. Statystyki platformy (ADMIN)
1. Potrzebny ADMIN. Lokalnie: `UPDATE users SET type='ADMIN' WHERE email='…';` **i `docker compose restart backend`** (cache), po teście przywróć typ + znów restart.
2. ADMIN → panel → **„Statystyki pilotażu"** (`/admin/stats`). Moderator/firma/user → brak dostępu.
3. „Cały okres": liczby zgodne z krokami 2–3c; „uratowane sztuki" = wynik raportu oszczędności ADMIN-a dla tego okresu.
4. Zarejestruj nowe konto → „Nowe w okresie" rośnie. Rezerwuj + anuluj → „Łącznie"/„Anulowane" rosną, „Odbiory" bez zmian.
5. Zakres z przeszłości bez danych → kafelki „przepływ" = 0, „stan" bez zmian.
6. API: `from`>`to` → `400 INVALID_DATE_RANGE`; zła data → `400 INVALID_PARAMETER`; nie-ADMIN → `403`.

## 3e. Powiadomienia FCM i PWA (#5)
> Wymaga: przebudowany stack i klucz Firebase zamontowany w kontenerze (`FIREBASE_CREDENTIALS_FILE`, domyślnie `backend/src/main/resources/serviceAccountKey.json`). Log backendu: `FCM włączone: Firebase zainicjalizowany (projekt givenget-b5ef0)`. Web push działa na `localhost` (bezpieczny kontekst).
1. **Zgoda:** zaloguj usera, zarezerwuj ofertę — pod kodem odbioru pojawia się karta „Powiadomienia o rezerwacjach” → **Włącz** → zezwól w przeglądarce. Aplikacja NIE pyta sama przy starcie. Token w bazie: `SELECT user_id, device_name FROM fcm_token;`.
2. **Potwierdzenie rezerwacji:** push „Rezerwacja potwierdzona” z nazwą oferty, liczbą sztuk i terminem (bez kodu odbioru — to sekret widoczny na zablokowanym ekranie). Klik → `/reservations?reservationId=…` (rezerwacja podświetlona i przewinięta).
3. **Odbiór:** pracownik potwierdza → „Odbiór potwierdzony”.
4. **Ostrzeżenie o wygaśnięciu i przypomnienie o odbiorze** (scheduler co 5 min, w minutach 1, 6, 11…): domyślnie ostrzeżenie 120 min przed końcem holdu, przypomnienie po otwarciu okna odbioru oferty (najwcześniej 30 min po rezerwacji). Do testu: `RESERVATION_EXPIRY_WARNING_BEFORE_MINUTES=1500 RESERVATION_PICKUP_REMINDER_MIN_AGE_MINUTES=0 docker compose up -d backend` i poczekaj na przebieg. Kolejny przebieg nie wysyła nic ponownie (claim `*_sent_at`, migracja 56). Na koniec wróć do domyślnych: `docker compose up -d backend`.
5. **Zmiana konta na tym samym urządzeniu:** wyloguj, zaloguj inne konto → log `Token FCM urządzenia przepięty z konta X na Y`. Wylogowanie odpina token (`DELETE /api/v1/push/tokens` → 204).
6. **Martwy token:** wpis z nieprawidłowym tokenem znika po pierwszym pushu (log `Usunięto martwy token FCM`).
7. **Brak klucza = brak crasha:** bez pliku klucza backend wstaje z `FCM wyłączone` (WARN), rezerwacje działają, wysyłka to no-op. Uszkodzony klucz = backend NIE wstaje (celowo — błąd konfiguracji).
8. **PWA:** Chrome pokazuje ikonę instalacji w pasku adresu, a na „Moje rezerwacje” kartę „Zainstaluj aplikację Biovlo”. DevTools → Application: `/sw.js` (scope `/`, Serwist) i `/firebase-messaging-sw.js` (scope `/firebase-cloud-messaging-push-scope`). Offline (DevTools → Network → Offline) nawigacja pokazuje „Jesteś offline”.

**Do weryfikacji na VPS (wymaga prawdziwego HTTPS):**
- iOS (16.4+): push działa tylko w aplikacji dodanej do ekranu początkowego, z HTTPS — tam sprawdzić zgodę, token i dostarczenie.
- Link w powiadomieniu przez `webpush.fcm_options.link` (FCM przyjmuje tylko HTTPS) — na localhost deep link niesie pole `url` obsługiwane przez service worker.
- Ustawić `FRONT_APP_URL` na publiczny adres https (z niego budowany jest link i ikona powiadomienia) oraz `FIREBASE_CREDENTIALS_FILE` na ścieżkę klucza na serwerze.
- Android/Chrome mobile: instalacja PWA i push w tle po zamknięciu karty.

## 4. Uwagi
- Raport/statystyki liczą dni w **UTC** (doba kończy się w PL ~1:00–2:00) — adnotacja jest w UI.
- Po KAŻDEJ ręcznej zmianie w bazie dotyczącej konta (verified, type) → `docker compose restart backend` (cache usera).
- Wygasanie TTL i współbieżność (dwie rezerwacje na ostatnią sztukę, podwójny odbiór) — tylko przez `ReservationConcurrencyTest` na prawdziwym MySQL (komenda w CLAUDE.md), nie ręcznie.
