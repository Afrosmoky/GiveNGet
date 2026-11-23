# Dane demonstracyjne (instancja pokazowa / rekrutacja)

Seeder `com.example.gng.demo.DemoDataSeeder` zakłada kompletny, „żywy" zestaw danych:
konta wszystkich typów, oferty trzech sklepów i osób prywatnych, ~3 miesiące historii
odebranych rezerwacji (raport oszczędności), aktywne rezerwacje do potwierdzenia przy kasie,
statystyki wyświetleń, oceny, ulubione, rozmowy i zgłoszenia dla moderatora.

**Tylko instancja pokazowa.** Bez `DEMO_SEED_ENABLED=true` bean seedera w ogóle nie powstaje.

---

## Włączenie na VPS

W `.env` na serwerze:

```bash
DEMO_SEED_ENABLED=true
DEMO_SEED_PASSWORD='jakies-haslo-dla-rekruterow'   # min. 8 znaków, wspólne dla kont demo
```

```bash
docker compose up -d --build backend
docker compose logs backend | grep -A20 "Dane demo"
```

W logu jest lista kont i aktualne kody odbioru klienta demo. Hasła w logu nie ma.

Włączony seeder bez hasła (albo z krótszym niż 8 znaków) = backend nie wstaje — celowo,
żeby nie wystawić publicznie kont firmowych z pustym hasłem.

Seed wykonuje się raz (poznaje „już jest" po koncie `demo.sklep@example.com`).
Kolejne starty tylko odświeżają dane.

## Konta

Wszystkie mają hasło z `DEMO_SEED_PASSWORD`. Domena `example.com` jest zarezerwowana (RFC 2606) —
adresy nie należą do nikogo.

| Login | Typ | Kto |
|---|---|---|
| `demo.klient@example.com` | REGULAR | Anna Nowak, Mokotów — historia rezerwacji, ulubione, czaty |
| `demo.sklep@example.com` | COMPANY | Zielony Koszyk — główny sklep scenariusza |
| `demo.kasjer1@example.com` | STORE_EMPLOYEE | Ola Zielińska, kasjerka Zielonego Koszyka |
| `demo.kasjer2@example.com` | STORE_EMPLOYEE | Tomasz Lewandowski, kasjer Zielonego Koszyka |
| `demo.kasjer3@example.com` | STORE_EMPLOYEE | Jan Dąbrowski — **dezaktywowany** przez firmę, nie zaloguje się (to też jest demo) |
| `demo.moderator@example.com` | EMPLOYEE | moderatorka — zgłoszenia, czaty z konsultantem |
| `demo.admin@example.com` | ADMIN | statystyki pilotażu, raport całej platformy, użytkownicy |

Tło marketplace'u (bez możliwości logowania — losowe hasła): Piekarnia Złoty Kłos, Bistro Pod Lipami
i cztery osoby prywatne.

## Scenariusz dla rekrutera (ok. 10 min)

1. **Klient** (`demo.klient`) → *Moje rezerwacje*: dwie aktywne rezerwacje z kodami odbioru,
   do tego odebrane, anulowana i przepadła. Przeglądanie ofert, mapa, ulubione, czat ze sklepem.
   Można zarezerwować kolejną ofertę.
2. **Kasjer** (`demo.kasjer1`) → *Odbiór*: wpisuje kod klienta → rezerwacja potwierdzona.
3. **Sklep** (`demo.sklep`) → *Pulpit*, *Rezerwacje*, *Raport* (uratowane sztuki, wartość,
   szacunkowe kg i CO₂ za ~3 miesiące), *Pracownicy* (dwóch aktywnych, jeden wyłączony).
4. **Moderator** → *Skargi*: dwa otwarte zgłoszenia ofert, jedno rozwiązane.
5. **Admin** → *Statystyki pilotażu*, raport oszczędności dla całej platformy.

## Jak demo się nie starzeje

Co godzinę (`DEMO_SEED_REFRESH_CRON`, domyślnie `0 15 * * * *`) i przy każdym starcie:

- **Przesunięcie w czasie** — gdy od kotwicy (`demo_seed_state.anchor_at`, migracja 58) minęła
  pełna doba, wszystkie daty danych demo przesuwają się o tyle dób. Oferty dalej „wygasają jutro",
  raport ma świeże dane z ostatnich dni, rozmowy są sprzed kilku godzin. Przesuwane są tylko
  rekordy sprzed kotwicy, więc nic nie ląduje w przyszłości, a akcje rekruterów zostają tam,
  gdzie się wydarzyły. Oferty demo, które nocny scheduler zdążył wygasić, wracają do `ACTIVE`.
- **Raz na dobę** — konta do logowania wracają do stanu wyjściowego: hasło, typ konta,
  odblokowanie, anulowane usunięcie, aktywność pracowników. Skasowane konto jest zakładane
  od nowa. Oferty sklepów, które ktoś „wykupił", dostają kilka sztuk.
- **Zawsze** — klient demo ma co najmniej dwie aktywne rezerwacje w Zielonym Koszyku,
  żeby kasjer miał co potwierdzić.

Wszystko dotyczy wyłącznie kont `demo.*@example.com` i ich danych.

## Zdjęcia ofert

Opcjonalne: `backend/src/main/resources/demo/images/<klucz-oferty>.jpg` (lista kluczy w README
w tym katalogu). Bez nich frontend pokazuje grafikę zastępczą. Zdjęcia są czytane tylko przy
seedzie — żeby dodać je do istniejącego demo, trzeba zaseedować od nowa.

## Seed od nowa

Usuwa **tylko** dane demo (pozostali użytkownicy i ich dane zostają). Po tym restart backendu
zakłada wszystko na nowo.

```bash
docker compose exec -T mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' <<'SQL'
SET @demo := 'demo.%@example.com';
DELETE FROM user_rates          WHERE user_id IN (SELECT id FROM users WHERE email LIKE @demo);
DELETE FROM register_code       WHERE user_id IN (SELECT id FROM users WHERE email LIKE @demo);
DELETE FROM reset_password_code WHERE user_id IN (SELECT id FROM users WHERE email LIKE @demo);
DELETE FROM chats WHERE id IN (
    SELECT chat_id FROM (SELECT cp.chat_id FROM chat_participants cp
                         JOIN users u ON u.id = cp.user_id WHERE u.email LIKE @demo) x);
DELETE FROM images WHERE file_path LIKE 'images/offer/%/demo\_%';
DELETE FROM users WHERE email LIKE @demo AND type = 'STORE_EMPLOYEE';
DELETE FROM users WHERE email LIKE @demo;
DELETE FROM demo_seed_state;
SQL
docker compose restart backend
```

Reszta usuwa się kaskadowo (oferty, rezerwacje, statystyki, ulubione, zgłoszenia).
Pliki zdjęć w wolumenie `uploads-data` zostają — nie przeszkadzają.

## Uwagi

- **Maile.** Akcje na kontach demo (np. zmiana oferty przez moderatora) wysyłają maile
  na adresy `@example.com` — nie dojdą, a na skrzynkę SMTP może wrócić bounce.
- **Wspólne konta.** Kilku rekruterów naraz widzi nawzajem swoje zmiany. Dobowe przywracanie
  kont naprawia najczęstsze „zepsucia" (hasło, ban, usunięcie, zmiana roli); usuniętych ofert nie odtwarza.
- **Limit logowań per IP** (`RATELIMIT_LOGIN_*`) dotyczy też kont demo.
- Seeder zapisuje przez JPA z pominięciem serwisów (bez maili i pushy, z datami wstecz).
  Reguły ważne dla spójności sprawdza sam: dozwolone typy transakcji kategorii, dostępność sztuk,
  unikalność kodów odbioru. Błąd w danych katalogu (np. literówka w nazwie kategorii) kończy start
  czytelnym komunikatem.
