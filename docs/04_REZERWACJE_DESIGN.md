# Rezerwacje — decyzje projektowe (spec przed implementacją)

Bazuje na audycie CC. Rozstrzyga blokery modelu domeny przed kodowaniem. Trzyma zasady z `CLAUDE.md` (DTO, `/api/v1`, format błędów, paginacja, logika w backendzie).

## Zakres tego etapu
Strona użytkownika przepływu: **utworzenie rezerwacji, lista, anulowanie, wygasanie**.
Potwierdzenie odbioru (strona pracownika sklepu) — **osobny, kolejny krok** (wymaga rozstrzygnięcia modelu pracownik↔sklep, patrz sekcja 7).

## 1. Ilość i dostępność
- `Offer.quantity` — Integer, całkowita liczba sztuk, `>= 0`, domyślnie 1. Jednostka: **sztuka** (na pilotaż bez kg/opakowań).
- Dostępność = `quantity − SUMA(quantity rezerwacji zajmujących stan)`. Stan **zajmują**: `RESERVED` (nie wygasła) oraz `COLLECTED` (towar wydany). `EXPIRED` i `CANCELLED` **zwalniają** stan. `quantity` oferty pozostaje niezmienne (to pula wystawiona przez sprzedawcę); „zajęte/wydane" liczymy z rezerwacji — dzięki temu odbiór nie „odblokowuje" stanu.
- `Reservation.quantity` — liczba sztuk w rezerwacji, `>= 1`, `<=` dostępność w chwili tworzenia.
- Oferta wystawia w DTO **wyliczaną** `availableQuantity`; nie trzymamy sumy „zarezerwowane" jako pola, żeby uniknąć rozjazdu (liczymy zapytaniem).

## 2. Współbieżność (krytyczne)
Tworzenie rezerwacji w jednej transakcji:
1. Zablokuj wiersz oferty pesymistycznie (`@Lock(PESSIMISTIC_WRITE)` na metodzie repo pobierającej ofertę),
2. policz aktualną dostępność,
3. jeśli `quantity <= dostępność` — zapisz rezerwację; w przeciwnym razie błąd `OFFER_NOT_AVAILABLE`.

Wolumen pilotażu jest niski → priorytet poprawność nad przepustowością. (Alternatywa: `@Version` optymistyczny + retry — na razie niepotrzebna.)

## 3. Encja `Reservation`
Pakiet `com.example.gng.reservation` (controller/service/repository/dto/entity).
- `id` — String z `UniqueIdGenerator` (spójnie z resztą).
- `offer` — ManyToOne.
- `user` — ManyToOne (kto rezerwuje).
- `quantity` — int.
- `status` — enum `ReservationStatus`: `RESERVED`, `COLLECTED`, `EXPIRED`, `CANCELLED`.
- `pickupCode` — krótki, czytelny, **niezgadywalny** kod do podania przy kasie: 6 znaków `A–Z/2–9` (bez znaków mylących 0/O/1/I), generowany bezpiecznym losowaniem, **unikalny** (indeks). Osobne pole, **nie** `id`.
- `createdAt`, `expiresAt` (LocalDateTime, UTC), `collectedAt` (null), `cancelledAt` (null).

## 4. Statusy i przejścia
- `RESERVED → COLLECTED` — potwierdzenie odbioru (kolejny krok).
- `RESERVED → EXPIRED` — scheduler, gdy `expiresAt < now`.
- `RESERVED → CANCELLED` — anulowanie przez użytkownika.
- `COLLECTED / EXPIRED / CANCELLED` — terminalne.
Status trzymamy **na rezerwacji**, nie na ofercie. `OfferStatus` zostaje bez zmian; „wyprzedane" to wyliczana dostępność = 0.

## 5. Wygasanie
- `expiresAt = now + reservation.hold-ttl-hours` (property, domyślnie np. 24 h). Konfigurowalne.
- `ReservationScheduler` (wzór: `OfferStatusScheduler`) cyklicznie ustawia `RESERVED → EXPIRED` dla przeterminowanych — to automatycznie zwalnia dostępność (bo liczymy tylko aktywne).
- Pola `Offer.pickupDateFrom/To` są dziś `String` — **nie** parsujemy ich na tym etapie; rezerwacja ma własne `expiresAt`. Konwersja pól oferty na typy czasowe: osobny, późniejszy task. Czas trzymamy w UTC.

## 6. Endpointy `/api/v1/reservations`
- `POST /api/v1/reservations` `{offerId, quantity}` (ROLE_USER) → tworzy; zwraca DTO z `pickupCode` i danymi do QR.
- `GET /api/v1/reservations?page=0&size=20` → rezerwacje zalogowanego usera, paginacja + sort `createdAt desc, id`.
- `GET /api/v1/reservations/{id}` → szczegóły (tylko właściciel).
- `POST /api/v1/reservations/{id}/cancel` → anulowanie własnej aktywnej rezerwacji.
- Oferta (lista/szczegóły) wystawia `availableQuantity`.
- Kody błędów (format z CLAUDE.md 6.3): `OFFER_NOT_AVAILABLE`, `RESERVATION_NOT_FOUND`, `RESERVATION_NOT_CANCELLABLE`, `FORBIDDEN`. Nie wpadać w catch-all `GlobalExceptionHandler`.

## 7. Pracownik ↔ sklep (do rozstrzygnięcia PRZED potwierdzeniem odbioru)
Dziś `EMPLOYEE` = globalny moderator, nie jest przypisany do sklepu, a użytkownik ma jedną rolę. Potwierdzenie odbioru musi być ograniczone do pracownika **tego** sklepu. Opcje:
- (rekomendacja) wprowadzić powiązanie pracownik→firma (`BusinessUserModel`) i odrębny typ/rolę „pracownik sklepu" (np. `STORE_EMPLOYEE`), oddzielony od moderatora platformy;
- potwierdzenie odbioru autoryzowane, gdy sklep pracownika = właściciel oferty.

**DECYZJA (podjęta):** nowy typ `STORE_EMPLOYEE` (rola `ROLE_STORE_EMPLOYEE`) powiązany z firmą (`BusinessUserModel`), oddzielony od globalnego moderatora `EMPLOYEE`. Potwierdzenie odbioru dozwolone tylko, gdy firma pracownika = właściciel oferty.

## 8. QR
QR koduje `pickupCode` (ewentualnie `id:pickupCode` dla szybkiego lookupu). Sekretem jest `pickupCode`. Panel pracownika: wpisanie kodu **lub** skan QR → potwierdzenie.

## Poza tym etapem / do naprawy osobno (z audytu)
- FCM nie wstaje w Dockerze (ścieżka klucza względna, błąd łykany) + wiadomości data-only — naprawa przy Fazie 3 (powiadomienia) i przed Capacitorem.
- Sekrety w `application-*.properties` → ENV (Faza 4 bezpieczeństwo).
- Brak testów — nowa logika rezerwacji **z testami** (współbieżność, wygasanie, przejścia statusów).
