# Do dobudowania przed pilotażem (funkcje z zakresu, jeszcze nie zbudowane)

Stan na 10.2026. Rdzeń przepływu (rezerwacja → odbiór → raport, cena, pracownik sklepu) jest gotowy. Poniższe pozycje były w zakresie pilotażu, ale nie zostały dotąd zaimplementowane. Kolejność wg priorytetu i zależności.

| # | Funkcja | Dlaczego potrzebne na pilotaż | Zależności | Status |
|---|---|---|---|---|
| 1 | **Import ofert z Excela** | Sklep masowo wystawia oferty z pliku z systemu sklepu | — (jest oferta, quantity, cena) | **zrobione** (10.2026) |
| 2 | **Zgody RODO + akceptacja regulaminu** | Wymóg prawny przy pilotażu pod marką sieci | — | **zrobione** (10.2026) |
| 3 | **Publiczny profil sklepu** | Użytkownik widzi sklep i jego oferty | fundament profilu jest | **zrobione** (10.2026) |
| 4 | **Statystyki platformowe pod pilotaż** | Materiał do rozmów z siecią (aktywni, sklepy, rezerwacje, odbiory) | `DashboardStatisticsService` (częściowo) | **zrobione** (10.2026) |
| 5 | **FCM + powiadomienia rezerwacji** | Potwierdzenie rezerwacji, ostrzeżenie o wygaśnięciu, przypomnienie odbioru | naprawa FirebaseConfig (projekt Firebase `givenget-b5ef0` — Piotra, dostępny; `serviceAccountKey.json` na dysku) | w toku |
| 6 | **Panel pracowników sklepu (UI firmy)** | Firma sama zakłada konta pracowników i odbiera im dostęp — bez curla | provisioning `POST /api/v1/store-employees` był | **zrobione** (10.2026) |
| 7 | **Cena przed obniżką (`originalPrice`)** | Pokazuje oszczędność („normalnie X, teraz Y" + % rabatu) — rdzeń wartości „food rescue", mocny argument na spotkaniach z partnerami | jest `price`/`quantity` | **zrobione** (migracja `53`, szczegóły niżej) |

| 8 | **Lista rezerwacji dla firmy** | Sklep widzi, kto zarezerwował jego towar (pulpit „Ostatnie rezerwacje" + strona „Rezerwacje") — dziś „wkrótce", bo backend zwraca tylko rezerwacje bieżącego usera | jest moduł `reservation` | **zrobione** (10.2026, szczegóły niżej) |

## Lista rezerwacji dla firmy — zrobione (#8)
Backend: `GET /api/v1/reservations/for-store?page&size&status?` (ROLE_COMPANY) → rezerwacje na oferty **tej** firmy (join `reservation → offer → offer.user`), paginacja (`PageResponse`), opcjonalny filtr statusu, sort `createdAt desc, id desc`; sprawdzenie w serwisie, że oferty należą do firmy wywołującej. DTO bez danych wrażliwych klienta (kod odbioru widoczny tylko pracownikowi przy odbiorze — tu pokazujemy status/ilość/ofertę/czas, nie `pickupCode`). Frontend (konsola firmy): strona „Rezerwacje" (zastępuje „wkrótce") + sekcja „Ostatnie rezerwacje" na pulpicie. Wchodzi z reskinem pulpitu/konsoli firmy (grupa C).

**Jak zrobione:**
- `ReservationController.listForStore` → `ReservationService.listForStore`; reguła `GET /api/v1/reservations/for-store` → `hasRole("COMPANY")` w `SecurityConfig` przed ogólną `/api/v1/**`. Serwis ponownie sprawdza typ konta (`403 FORBIDDEN`), a zakres wyznacza zapytanie po `offer.user.id = wywołujący` — firma nie dostanie rezerwacji na cudze oferty niezależnie od parametrów.
- Filtr po statusie **efektywnym** (jak w DTO): RESERVED po terminie, którego scheduler jeszcze nie przestawił, wypada z „RESERVED” i wpada do „EXPIRED” (sprawdzone na żywej bazie). Wielkość liter bez znaczenia; zła wartość → `400 INVALID_RESERVATION_STATUS` z `details.allowed`.
- `StoreReservationDTO`: id, status, ilość, oferta (id, nazwa, miniatura), **tylko imię klienta**, `createdAt`, `expiresAt`, `collectedAt`, `cancelledAt`. Bez `pickupCode`/`qrPayload`, nazwiska, e-maila i telefonu.
- Paginacja `PageParams` (domyślnie 20, limit 100), sort `createdAt desc, id desc`; oferta i klient dociągane `@EntityGraph`.
- Testy: `StoreReservationListTest` (serwis), `StoreReservationsSecurityTest` (prawdziwy `SecurityConfig`: tylko COMPANY, `/for-store` nie wpada w `/{id}`, brak kodu odbioru w JSON).
- UI: `/store/reservations` (filtr statusu, paginacja, tabela/karty) i „Ostatnie rezerwacje” + liczniki „Do odbioru”/„Odbiory” na pulpicie (`totalElements` z `size=1`).

## Cena przed obniżką — zrobione (#7)
- **Schemat:** `offer.original_price DECIMAL(10,2) NULL` (migracja `53`). NULL = oferta bez przeceny.
- **Reguły** (`OfferService.resolvePricingForCreate/ForUpdate` — jedno miejsce dla formularza, edycji i importu): tylko sprzedaż (`400 ORIGINAL_PRICE_NOT_ALLOWED`), format jak cena — > 0, maks. 2 miejsca, limit (`400 INVALID_ORIGINAL_PRICE`), musi być wyższa od ceny (`400 ORIGINAL_PRICE_NOT_HIGHER`, `details: price, originalPrice`).
- **Edycja:** `originalPrice` brak pola = bez zmian (stary klient mobilny nie skasuje przeceny); usunięcie tylko jawnie `clearOriginalPrice=true` (razem z `originalPrice` → `INVALID_ORIGINAL_PRICE`). Zmiana typu na darmowy/wymianę czyści przecenę razem z ceną. Nowa cena ≥ zapisanej `originalPrice` → `ORIGINAL_PRICE_NOT_HIGHER` z podpowiedzią „podnieś też cenę przed obniżką albo ją usuń" — przeceny nie kasujemy po cichu.
- **API:** `OfferPreview` i `OfferDetailsDTO` mają `originalPrice` i `discountPercent` (Integer, HALF_UP, liczony w backendzie — `OfferPreviewSupport.discountPercent`; `null`, gdy brak przeceny albo rabat zaokrągla się do 0 %).
- **Import Excel:** opcjonalna kolumna `cena_przed_obnizka` (przykład w szablonie: chleb 4.99 / 7.99), błędy per wiersz z tymi samymi kodami.
- **UI:** komponent `Price` (kafelek i szczegóły): nowa cena, przekreślona `originalPrice`, badge „−NN%" z `discountPercent`. Pole „Cena przed obniżką" w formularzu tylko dla sprzedaży.

## Uwagi
- **Panel pracowników sklepu — zrobione.** `GET /api/v1/store-employees?page&size` (`PageResponse<StoreEmployeeDTO>`, sort `createDate desc, id desc`, tylko pracownicy sklepu wywołującego) i `PATCH /api/v1/store-employees/{id}` z `{ "active": true|false }` (idempotentne). Cała ścieżka `/api/v1/store-employees/**` → `ROLE_COMPANY`; cudzy lub nieistniejący pracownik → ten sam `404 STORE_EMPLOYEE_NOT_FOUND`. DTO: id, imię, nazwisko, e-mail, telefon, sklep, `createdAt`, `active` — bez hasła. UI: `/store/employees` (formularz + tabela/karty z paginacją i przyciskiem Dezaktywuj/Aktywuj), link w menu firmy, `MobileHeader`, kafelek w `CompanyDashboard`.
  - **Dezaktywacja przez osobną flagę** `store_employees_details.active` (migracja `52`), nie `is_verified=false`: niezweryfikowane konto może samo zamówić link aktywacyjny (`/api/resentVerification`) i się odblokować. Egzekucja: logowanie (`CustomUserDetailsService`: `enabled = verified && active`), potwierdzanie odbioru starym tokenem (`403 EMPLOYEE_DEACTIVATED`), czyszczenie cache `users` po zmianie.
  - **Luka zaakceptowana:** token wydany przed dezaktywacją żyje do 3 h (`JwtService.validateToken` nie sprawdza `isEnabled`) — w tym czasie pracownik ma dostęp do ogólnych endpointów (np. czat), ale nie potwierdzi odbioru.
  - **Do poprawy później:** logowanie dezaktywowanego konta zwraca stary `401 "User not confirmed"`, więc front pokazuje ekran niepotwierdzonego maila. Właściwy komunikat wymaga zmiany kontraktu `/api/auth/login`.
  - **Poza zakresem:** edycja danych pracownika, reset hasła przez firmę, trwałe usuwanie konta.
- **Statystyki platformowe — zrobione.** `GET /api/v1/stats/platform?from&to` (tylko `ROLE_ADMIN`, pakiet `platformstats`), UI: `/admin/stats` (pozycja w menu panelu tylko dla ADMIN). Metryki: konta REGULAR (łącznie / zweryfikowane / nowe w okresie), sklepy zweryfikowane, oferty ACTIVE i wystawione w okresie, rezerwacje utworzone w okresie wg statusu, odbiory i uratowane sztuki w okresie (te same zapytania co raport oszczędności). „Stan" liczony na teraz, „przepływ" w okresie (dni UTC). `DashboardStatisticsService` nie został użyty — to statystyki zaangażowania pojedynczej firmy, ładowane do pamięci.
- **Publiczny profil sklepu — zrobione.** `GET /api/v1/stores/{companyId}` (`StoreProfileDTO`: nazwa, logo, adres, opis, lat/lon, liczba aktywnych ofert, ocena — bez e-maila, telefonu i liczników wewnętrznych) i `GET /api/v1/stores/{companyId}/offers?page&size` (`PageResponse<OfferPreview>`, tylko `ACTIVE`, sort `createdAt desc, id desc`). Dostęp dla zalogowanych — tak jak przeglądanie ofert. Nie-sklep / zbanowany / niezweryfikowany / w trakcie usuwania → `404 STORE_NOT_FOUND`. UI: `/stores/[companyId]`; linki z kafelka oferty („Sklep: …"), z widoku oferty (nazwa sprzedawcy + przycisk) i baner na `/profile/[id]` firmy (opinie zostają tam).
- **Import Excela — zrobione.** Apache POI (`poi-ooxml` 5.3.0), pakiet `offerimport`, `POST /api/v1/offers/import` (multipart, pole `file`) i `GET /api/v1/offers/import/template` — oba tylko `ROLE_COMPANY`. UI: `/offers/import` (link w menu firmy, `MobileHeader`, kafelek w `CompanyDashboard`).
  - **Szablon** (nagłówki w wierszu 1, pierwszy arkusz, kolejność i wielkość liter dowolne): wymagane `nazwa`, `opis`, `typ_transakcji` (`sprzedaz`/`za_darmo`/`wymiana`), `termin_waznosci` (RRRR-MM-DD lub komórka daty), `godziny_odbioru_od`, `godziny_odbioru_do` (GG:MM), `kategoria`; opcjonalne `cena`, `waluta`, `ilosc` (brak → 1), `podkategoria` (wymagana, gdy kategoria ją ma), `lokalizacja`, `szerokosc_geo`, `dlugosc_geo`. Plik z endpointu szablonu ma przykłady, arkusz „Instrukcja" i aktualną listę kategorii z bazy — to jedyne źródło prawdy dla klientów.
  - **Lokalizacja:** brak współrzędnych w pliku → `lat`/`lon` i adres firmy. Własne współrzędne wymagają też `lokalizacja`.
  - **Odpowiedź:** `{ utworzone, bledy: [{ wiersz, code, message }], doWeryfikacji: [wiersz] }` — `doWeryfikacji` to wiersze zapisane jako `PENDING` przez moderację treści.
- **Zgody RODO — zrobione.** Rejestracja REGULAR i COMPANY wymaga `termsAccepted=true` i `privacyAccepted=true` (multipart). Brak → `400 CONSENT_REQUIRED` (6.3, `details.missing`: `terms`/`privacy`), konto nie powstaje. Na koncie: `terms_accepted_version` (z `terms.current-version` ← `TERMS_CURRENT_VERSION`, start `1.0`), `terms_accepted_at`, `privacy_accepted_at` (UTC) — migracja `50`. UI: jeden checkbox w obu formularzach `/register` z linkami do `/static-content/terms-of-service` i `/static-content/privacy-policy`.
  - **Do zrobienia poza kodem:** obie treści to dziś angielski szablon (regulamin z 2013, „eaty.com") / polski placeholder polityki — podmienić na prawdziwe polskie treści Biovlo i wtedy podbić `TERMS_CURRENT_VERSION`.
  - **Poza zakresem:** ponowna akceptacja dla istniejących kont (mają `NULL`) i po podbiciu wersji; zgoda przy rezerwacji.
- **FCM** — najpierw naprawa infry (ścieżka klucza z ENV, blok `notification`, czyszczenie martwych tokenów), potem wpięcie w zdarzenia rezerwacji. Projekt Firebase `givenget-b5ef0` jest Piotra i dostępny (`serviceAccountKey.json` na dysku) — testowalne lokalnie bez zakładania nowego projektu.
- Po każdej dobudowanej funkcji — rozszerzyć `docs/07_SCENARIUSZ_TESTOWY.md` o jej kroki.

## Kolejność realizacji
1 (Import Excela) → 2 (RODO) → 3 (profil sklepu) → 4 (statystyki) → 5 (FCM, po Firebase).

## Po redesignie — PWA (mobile bez Capacitora na teraz)
Capacitor odkładamy (dystrybucja do sklepów app store'owych to dłuższa droga). Na pilotaż wystarczy **PWA** — ten sam front Next.js, instalowalny, bo backend jest API-first (REST + JWT w nagłówku, DTO, bez sesji/cookie — §6), więc API nie wymaga zmian. Zakres etapu:
- **`manifest.json`** (nazwa Biovlo, `theme_color`/`background_color` z tokenów, `display: standalone`) + **ikony PNG** 192 / 512 / maskable — generowane z `biovlo_logo.png` (logo już mamy, przezroczyste).
- **Service worker** przez **Serwist** (następca `next-pwa`; stary `next-pwa` ma problemy z App Routerem Next 15) — offline-shell + cache statyków. Uwaga: nie cache'ować odpowiedzi API z danymi wrażliwymi.
- **HTTPS** — warunek konieczny PWA; i tak na liście przed pilotażem (`docs/06`).
- **Push w PWA = FCM-web** (mamy FCM): Android/Chrome działa w tle po instalacji; **iOS Safari tylko od 16.4+ i tylko gdy PWA dodana do ekranu początkowego** (brak auto-promptu „zainstaluj", push nie działa w zwykłej karcie). Zweryfikować aktualne zachowanie iOS przy wpinaniu.
- Wejście dopiero **po całym redesignie** (front responsywny jest warunkiem sensownej PWA).

## Nice-to-have backendu (wyszło przy reskinie panelu admina, grupa E) — nie na pilotaż
- **Rola w liście użytkowników.** `GET` listy userów w panelu admina nie zwraca roli konta, więc front nie pokazuje plakietki rola (firma/konsument/pracownik/admin). Dodanie pola do DTO listy jest proste i addytywne (nie psuje klientów) — zrobić osobno, poza gałęzią `redesign`, która ma mieć zamrożony backend.
- **Zmiana roli z panelu — pomijamy na pilotaż.** Brak endpointu; to nie jest przepływ pilotażu, w razie potrzeby rola zmienialna w bazie.
- **Wejście na `/offers/mod-edit` zapisuje wyświetlenie oferty** (zachowanie sprzed redesignu). Zafałszowuje statystyki wyświetleń sprzedawcy — moderator nie jest klientem. Na pilotaż pomijalne (moderatorzy = my), do naprawy później: nie liczyć wyświetlenia przy wejściu w trybie moderacji.

## Nice-to-have czatu (wyszło przy reskinie, grupa F) — nie na pilotaż
- **Powiązanie czatu z ofertą.** Rozmowy nie mają pola oferty (`chats` + `/api/chats/me`), więc w oknie czatu nie da się pokazać, której oferty dotyczy rozmowa ani linku do niej. W marketplace to przydatne — wymaga dodania pola oferty w backendzie (encja + DTO). Osobno, poza `redesign`.
- **Flaga ładowania wiadomości.** Przy otwieraniu rozmowy przez chwilę miga „Brak wiadomości", bo kod nie ma stanu „ładowanie wiadomości" (jest tylko dla listy rozmów). Dodanie wymaga zmiany logiki pobierania — drobny polish na później.

## Branding — logo dostarczone
Łukasz przysłał logo Biovlo (okrąg: domek + uścisk dłoni + koszyk z warzywami, paleta zieleń/pomarańcz + ciemnozielony napis). Zrobione: wersja przezroczysta (`biovlo_logo.png` pełny kwadrat, `biovlo_logo_trim.png` przycięty). Do zrobienia przy brandingu: podmienić roboczy `Logo.tsx` (listek) na prawdziwe logo, **wyprowadzić tokeny kolorów z logo** (dziś zielenie są „robocze do czasu logo"), wygenerować favicony i ikony PWA z `biovlo_logo.png`.
