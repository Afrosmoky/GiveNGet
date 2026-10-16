# CLAUDE.md — Biovlo (kod: `gng`)

Instrukcje dla Claude Code pracującego w tym repozytorium.

---

## 1. Czym jest projekt

**Biovlo** (w kodzie historycznie `GiveNGet` / `gng`) — polska platforma „second hand food": marketplace
do oddawania, wymiany i odsprzedaży produktów spożywczych z krótkim terminem ważności.
Model B2C (konta indywidualne) + B2B (konta firmowe / sklepy).

Docelowy przepływ pilotażu: **rezerwacja → potwierdzenie odbioru → raport oszczędności**
(patrz `docs/01_MVP_ZAKRES.md`, decyzje projektowe w `docs/04_REZERWACJE_DESIGN.md`).
Stan: cały przepływ jest zaimplementowany po stronie backendu. UI panelu pracownika
i raportu — do zrobienia.

Kierunek architektoniczny: backend ma pozostać **API-first**, żeby ten sam kod obsłużył web i mobile
(PWA → ewentualnie Capacitor). Stąd zasady w sekcji 6 — są obowiązkowe dla każdej nowej funkcji.

---

## 2. Stack

**Backend** (`backend/`)
- Java 17 (`<java.version>17</java.version>`), Spring Boot 3.5.0, Maven
- Spring Web, Spring Security + JWT (jjwt 0.11.5), Spring Data JPA, Spring Validation, Spring Mail
- Spring WebSocket (STOMP + raw handler), Spring Cache
- MySQL 8 (`mysql-connector-java` 8.0.33), Liquibase (changelog: `db/changelog/db.changelog-master.xml`)
- Firebase Admin SDK 9.2.0 (FCM push)
- Lombok

**Frontend** (`frontend/`)
- Next.js 15.3.3 (App Router, `output: 'standalone'`), React 19, TypeScript
- Tailwind CSS 3 + Chakra UI 3 + Framer Motion (mieszanka — nowy UI trzymać na Tailwind)
- `@stomp/stompjs` + `sockjs-client` (czat), `firebase` 12 (FCM), `@react-google-maps/api`
- Menedżer pakietów: **yarn 1.22** (`packageManager` w `package.json`)

**Infra**
- Docker + `docker-compose.yml` w rootcie (MySQL + backend + frontend)
- Geoapify (geokodowanie), SMTP (maile aktywacyjne), FCM

---

## 3. Mapa modułów

### Backend — `backend/src/main/java/com/example/gng/`

Organizacja **feature-by-feature**; wewnątrz feature'a klasyczne warstwy
`controller/` → `service/` → `repository/` + `dto/` + `entity/` (lub `model/` w starszych pakietach).

| Pakiet | Zawartość | Prefiks REST |
|---|---|---|
| `auth/` | logowanie, `JwtService`, `JwtAuthenticationFilter`, `CustomUserDetailsService`, `SessionService` | `/api/auth` |
| `auth/admin/` | `AdminController`, `ModeratorController`, `AdminService` (lista userów, bany, zmiana roli) | `/api/admin`, `/api/mod` |
| `offer/` | `OfferEntity`, `OfferStatus`, `TransactionType`, kategorie/podkategorie, `OfferService`, `OfferStatusScheduler` | `/api/offer`, `/api/categories` |
| `register/` | `UserModel` (bazowa encja użytkownika), `UserType`, kody rejestracji/resetu, `BusinessUserModel` (firma) | — |
| `user/` | profil, rejestracja regularnego usera, `UserRank`, `AccountDeletionService`, `UserRankScheduler` | `/api/user`, `/api/profile`, `/api` |
| `chat/` | czat 1:1 (encje, WS handler, `ChatWebSocketService`), **FCM**: `FcmToken`, `FcmTokenService`, `FcmNotificationService` | `/api/chats`, `/ws` |
| `consultant/` | czat z konsultantem/moderatorem + scheduler | (wewnątrz chat/WS) |
| `complaint/` | skargi + notatki moderatorskie | `/api/complaint` |
| `moderation/` | zakazane wzorce (`ForbiddenPattern*`) + cache | `/admin/moderation/cache/evict` |
| `favorites/` | ulubione oferty i kategorie | `/api/favorites`, `/api/favorite-categories` |
| `rates/` | oceny użytkowników (jedyne miejsce z pełną paginacją `Page<>`) | `/api/rates` |
| `statistics/` | `OfferStatisticsEntity`, `MessageStatisticsEntity`, `DashboardStatisticsService` | `/api` (dashboard) |
| `file/` | upload/serwowanie plików (`FileStorageService`) | `/api/static` |
| `geocode/` | proxy do Geoapify | `/api/geocode` |
| `email/`, `mail_template/` | szablony i wysyłka maili | `/mail` |
| `staticcontent/` | treści statyczne (regulamin itp.) | `/api/static-content` |
| `reservation/` | rezerwacje: encja, `ReservationStatus`, kody odbioru, scheduler wygaszania, potwierdzanie odbioru | `/api/v1/reservations` |
| `store/` | konta pracowników sklepu (`StoreEmployeeModel` → `BusinessUserModel`) | `/api/v1/store-employees` |
| `report/` | raport oszczędności — agregaty nad rezerwacjami `COLLECTED`, bez własnej encji | `/api/v1/reports` |
| `common/` | przekrojowe DTO i wyjątki `/api/v1`: `PageResponse`, `ApiErrorResponse`, `ApiException`, `ApiExceptionHandler` | — |
| `ban/` | `UserBanEntity`, `BanReason`, `UserBanService` | — |
| `image/` | `ImageEntity` | — |
| `config/` | `SecurityConfig`, `WebConfig`, `WebSocketConfig`, `WebSocketSecurityConfig`, `CacheConfig`, `FirebaseConfig`, `GlobalExceptionHandler` | — |
| `exceptions/`, `util/` | wyjątki domenowe, `UniqueIdGenerator`, kalkulacje geo, `TemplateProcessor` | — |

Migracje: `backend/src/main/resources/db/*.sql` (numerowane 01–49; raport nie dodał żadnej) spięte w
`db/changelog/db.changelog-master.xml`. **Nowy schemat zawsze przez nowy plik SQL + wpis `<changeSet>`** —
nigdy przez edycję istniejącej migracji.

### Frontend — `frontend/src/`

- `app/` — App Router: `login/`, `register/`, `offers/` (lista, szczegóły, edycja, `mod-edit`),
  `create-offer/`, `chats/`, `consultant-chat/`, `favorites/`, `profile/`, `dashboard/`,
  `admin/` (users, complaints, forbidden-words, consultant-chats), `static-content/`, `activate/`, `reset-password/`
- `components/` — widoki i komponenty współdzielone (`OfferTile*`, `OfferForm`, `Header`/`MobileHeader`,
  `MobileFooter`, `MobileLayoutHandler`, `AuthGuard`, `FCMProvider`, dashboardy user/company)
- `context/` — `WebSocketContext`, `ErrorContext`
- `hooks/` — `useAuth`, `useFavorites`, `useGlobalWebSocket`
- `utils/auth.ts` — **jedyne źródło prawdy o tokenie i danych usera** (localStorage)
- `config/environment.ts` — `apiUrl` z `NEXT_PUBLIC_API_URL`
- `next.config.ts` — rewrites `/api/*` i `/backend-assets/*` → `http://backend:8080` (działa w Dockerze)

---

## 4. Jak działa auth

**Logowanie** — `POST /api/auth/login` → `AuthenticationManager` (BCrypt) → `JwtService.generateToken()`.
Token HS256, `subject` = e-mail, sekret z `jwt.secret`, ważność `jwt.expiration` (= 3 h).
Dodatkowo `GET /api/auth/validate` i `POST /api/auth/logout`.

**Autoryzacja requestu** — `JwtAuthenticationFilter` (`OncePerRequestFilter`, przed
`UsernamePasswordAuthenticationFilter`): czyta `Authorization: Bearer <token>`, wyciąga e-mail,
ładuje `UserDetails`, waliduje i ustawia `SecurityContext`. Filtr ma własną listę `PUBLIC_ENDPOINTS`
(`shouldNotFilter`), niezależną od reguł w `SecurityConfig`.

**Role** — `CustomUserDetailsService` mapuje `UserType` na **jedną** rolę:
`REGULAR → ROLE_USER`, `COMPANY → ROLE_COMPANY`, `EMPLOYEE → ROLE_EMPLOYEE`,
`STORE_EMPLOYEE → ROLE_STORE_EMPLOYEE`, `ADMIN → ROLE_ADMIN`.
`EMPLOYEE` to moderator platformy, `STORE_EMPLOYEE` to pracownik konkretnego sklepu —
dwie różne rzeczy, których nie wolno mieszać. Jedna rola na konto oznacza, że nikt nie jest
jednocześnie sprzedawcą i pracownikiem.
Tam też: konto `enabled` tylko gdy `verified`, `accountNonLocked` na podstawie `UserBanService`.

**SecurityConfig** — `STATELESS`, CSRF off, `webSecurityCustomizer` całkowicie omija
`/uploads/**` i `/ws/**`. Reguły:
- `permitAll`: `/api/auth/**`, rejestracja, `/api/verify/**`, reset hasła, `/api/static/**`,
  `/api/static-content/**`, `/api/geocode/**`, `/api/profile/**`, `/api/rates/**`, `/ws/**`, `/api/chats/**`
- `authenticated`: `/api/user/**` oraz `anyRequest()`
- `hasRole("ADMIN")`: `/api/admin/**`
- `hasAnyRole("ADMIN","EMPLOYEE")`: `/api/mod/**`
- `/api/v1/**`: `authenticated()`, z wyjątkami dopisanymi **przed** tą regułą (dopasowania
  sprawdzane po kolei): `POST /api/v1/reservations` → `hasRole("USER")`,
  `POST /api/v1/reservations/collect` → `hasAnyRole("STORE_EMPLOYEE","ADMIN")`,
  `POST /api/v1/store-employees` → `hasRole("COMPANY")`,
  `/api/v1/reports/**` → `hasAnyRole("COMPANY","ADMIN")`

Rola to zawsze **pierwsza** bramka, nie jedyna. Przy potwierdzaniu odbioru serwis sprawdza
dodatkowo, czy oferta należy do firmy tego pracownika; w raporcie — czy konto firmowe pyta
o własny sklep. Sama rola tego nie rozstrzyga, więc każdy nowy endpoint `/api/v1` operujący
na cudzych danych potrzebuje własnego sprawdzenia w serwisie.

**CORS** — skonfigurowany w **dwóch miejscach**:
- `SecurityConfig.corsConfigurationSource()` — sztywna lista `localhost:3000/3001/8080` + `allowedOriginPatterns("*")`
- `WebConfig.addCorsMappings()` — jeden origin z property `cors.allowed-origin`
- `WebSocketConfig` — osobno, też z `cors.allowed-origin`

**Frontend** — token w `localStorage` (`authToken`, `tokenType`, `userType`, …) obsługiwany w
`utils/auth.ts`; `AuthGuard` i sprawdzenia `userType` w komponentach. `middleware.ts` **nie robi auth** —
tylko obsługuje stare URL-e ofert. Bezpieczeństwo egzekwuje wyłącznie backend.

---

## 5. Komendy dev

### Cały stack (najprościej)
```bash
cp .env.local .env          # lub .env.demo dla VPS
docker compose up -d --build
docker compose logs -f backend
docker compose down
```
Frontend `http://localhost:3000`, backend `http://localhost:8080`, MySQL `localhost:3306`.

> `NEXT_PUBLIC_API_URL` jest wypalany w bundle podczas builda —
> zmiana URL wymaga `docker compose up -d --build frontend`.

### Backend osobno
Backend wymaga zmiennych środowiskowych (`JWT_SECRET`, `SMTP_*`, `GEOAPIFY_KEY`) — bez nich
**nie wstanie**, i to celowo. Pełna lista z opisem: `.env.example` w katalogu głównym.
`mvn spring-boot:run` nie czyta `.env`, więc trzeba je wyeksportować w powłoce.

```bash
cd backend
docker compose up -d                      # sama MySQL (profil local: baza `gng`, user/password)
set -a && . ../.env && set +a             # wczytaj zmienne środowiskowe do powłoki
mvn spring-boot:run -Dspring-boot.run.profiles=local
mvn clean package                         # build JAR (-DskipTests aby pominąć testy)
mvn test                                  # testy jednostkowe
mvn liquibase:update                      # migracje ręcznie (propertyFile: liquibase.properties)
java -jar target/gng-0.0.1-SNAPSHOT.jar --spring.profiles.active=local
```
Brak Maven Wrappera — potrzebny lokalny `mvn`. Profile: `local` (domyślny, baza `gng`) i `dev` (baza `gngdev`).
W kontenerze uruchamia `start.sh` (profil `dev`); `start-local.sh` to wariant lokalny.

### Testy integracyjne na prawdziwym MySQL

Część testów (np. `ReservationConcurrencyTest` — blokada wiersza, wygasanie, indeksy
z migracji) wymaga **pustej** bazy MySQL 8 i jest pomijana, gdy nie podano `it.mysql.url`.
Liquibase zakłada schemat od zera, więc bazę trzeba wyczyścić przed każdym przebiegiem.

```bash
docker run -d --name gng-it-mysql -p 3307:3306 \
  -e MYSQL_ROOT_PASSWORD=it -e MYSQL_DATABASE=gngit mysql:8.0

mvn test \
  -Dit.mysql.url='jdbc:mysql://localhost:3307/gngit?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC' \
  -Dit.mysql.username=root -Dit.mysql.password=it

# przed kolejnym przebiegiem
docker exec gng-it-mysql mysql -uroot -pit -e 'DROP DATABASE gngit; CREATE DATABASE gngit;'
```

Logikę wrażliwą na współbieżność i na kształt schematu testujemy **tylko** w ten sposób.
Mock potwierdzi każde założenie, jakie mu podsuniemy — nie udowodni, że
`SELECT ... FOR UPDATE` i poziom izolacji rzeczywiście chronią stan magazynowy.

### Frontend osobno
```bash
cd frontend
yarn install
yarn dev        # http://localhost:3000
yarn build
yarn start
yarn lint
```

### Sekrety
`.env`, `.env.local`, `.env.demo` oraz `backend/src/main/resources/serviceAccountKey.json`
są w `.gitignore`. **Nie commitować żadnych kluczy.** Uwaga: hasła SMTP, sekret JWT i klucz Geoapify
są obecnie zapisane wprost w `application-local.properties` / `application-dev.properties` —
nowy kod ma czytać sekrety z ENV, nie dopisywać kolejnych do properties.

---

## 6. ZASADY KODOWANIA POD MOBILE

Obowiązują **we wszystkich nowych funkcjach**. Cel: backend reużywalny bez zmian przez klienta
mobilnego (PWA / Capacitor / RN). Istniejący kod ich miejscami nie spełnia — nie refaktorujemy go
hurtowo, ale **nowy kod nie powiela starych wzorców**.

### 6.1. Odpowiedzi zawsze przez DTO — nigdy encje JPA
Kontroler zwraca dedykowany DTO (record/klasa) mapowany w serwisie. Nigdy `OfferEntity`, `UserModel`
ani `Page<Entity>` z kontrolera. Powód: encja wycieka hasła, relacje lazy i szczegóły schematu,
a każda zmiana bazy psuje kontrakt klienta mobilnego, którego nie da się zaktualizować „razem z deployem".

### 6.2. Nowe endpointy pod `/api/v1`
Każdy nowy kontroler: `@RequestMapping("/api/v1/<zasób>")`. Stare prefiksy (`/api/offer`, `/api/chats`…)
zostają bez zmian — mobilna apka żyje dłużej niż deploy backendu, więc kontrakt musi być wersjonowany
od początku. Pamiętać o dopisaniu nowego prefiksu do reguł w `SecurityConfig`
**oraz** do `PUBLIC_ENDPOINTS` w `JwtAuthenticationFilter`, jeśli endpoint ma być publiczny.

### 6.3. Spójny format błędów
Jeden kształt odpowiedzi błędu dla wszystkich nowych endpointów:

```json
{
  "code": "RESERVATION_EXPIRED",
  "message": "Rezerwacja wygasła.",
  "details": { "reservationId": "abc123", "expiredAt": "2026-09-20T10:00:00Z" }
}
```

- `code` — stabilny, maszynowy, `SCREAMING_SNAKE_CASE`; klient rozgałęzia się po nim, nie po tekście
- `message` — komunikat dla użytkownika (PL)
- `details` — opcjonalna mapa (np. błędy walidacji per pole)

Status HTTP zgodny z semantyką (400/401/403/404/409/422/500).
Obecny `GlobalExceptionHandler` zwraca `{status, message, errors}` i łapie `Exception` → 500
z treścią wyjątku w `message` — **nie kopiować tego wzorca**; nowe wyjątki domenowe dodawać z własnym
`code` i nie wystawiać stack trace'ów ani komunikatów wewnętrznych na zewnątrz.

### 6.4. Paginacja list + stabilne sortowanie
Każdy endpoint zwracający listę: `?page=0&size=20` (domyślnie `page=0`, `size=20`, górny limit `size` np. 100).
Odpowiedź w spójnym kształcie:

```json
{ "content": [], "page": 0, "size": 20, "totalElements": 0, "totalPages": 0 }
```

Sortowanie **zawsze deterministyczne** — klucz sortowania + `id` (lub `createdAt` + `id`) jako tie-breaker.
Bez tego infinite scroll na mobile duplikuje i gubi rekordy. Wzorzec do naśladowania:
`RatesService` / `AdminService` (`PageRequest.of(page, size, sort)`).
Antywzorzec: `OfferController` — zwraca pełne listy bez paginacji.

### 6.5. Logika w backendzie, klient cienki
Reguły biznesowe (walidacja dostępności, przejścia statusów, limity, wyliczenia raportów, uprawnienia)
żyją w serwisach backendu. Frontend renderuje to, co dostał, i wysyła intencje.
Żadnego liczenia stanu rezerwacji czy uprawnień po stronie klienta — mobilny klient to inny kod,
a zduplikowana reguła oznacza dwie różne odpowiedzi.

### 6.6. Brak couplingu web-only
Tylko **REST + JWT w nagłówku `Authorization`**. Bez sesji serwerowych, bez cookie jako nośnika auth,
bez zależności od SSR, `next/headers`, rewrite'ów Next czy `localStorage` po stronie kontraktu API.
Upload plików: `multipart/form-data`, odpowiedź z absolutnym/stabilnym URL-em zasobu.
Powiadomienia: FCM (token urządzenia), nie mechanizmy przeglądarkowe.
WebSocket ma działać z tokenem przekazywanym jawnie, nie z ciasteczka sesji.

---

## 7. Konwencje robocze

- **Komendy destrukcyjne i systemowe — nigdy bez pytania.** Nie uruchamiać operacji działających poza tym repozytorium ani nieodwracalnych na maszynie użytkownika bez wyraźnej zgody. W szczególności: `docker system prune`, `docker volume rm`, `docker ... prune --volumes`, `rm -rf` poza katalogiem projektu, kasowanie obrazów/wolumenów. Gdy zabraknie miejsca na dysku — zatrzymaj się i zapytaj; użyj najwęższego możliwego zakresu (np. `docker builder prune` zamiast `docker system prune -af --volumes`) i tylko na zasobach utworzonych w tym projekcie.
- Komentarze w kodzie i komunikaty użytkownika — po polsku (spójnie z resztą repo).
- Nowa funkcja = nowy pakiet feature'owy w `com.example.gng.<feature>` z podziałem
  `controller/service/repository/dto/entity`.
- Zmiana schematu = nowy plik `db/NN-opis.sql` + `<changeSet>` w changelogu.
- Nie edytować plików `*_DOCUMENTATION.md` w `backend/` bez potrzeby — to dokumentacja odziedziczona.
- Dokumenty planistyczne pilotażu: `docs/00_PODSUMOWANIE.md`, `docs/01_MVP_ZAKRES.md`,
  `docs/02_ROADMAPA_DEV.md`, `docs/03_ARCHITEKTURA_MOBILE.md`.
