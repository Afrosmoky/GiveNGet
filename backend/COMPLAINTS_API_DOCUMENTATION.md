### Moderator: Lista skarg

- **Metoda**: GET
- **Ścieżka**: `/api/mod/complaints`
- **Autoryzacja**: wymagany zalogowany użytkownik z uprawnieniami moderatora
- **Opis**: Zwraca listę wszystkich skarg w systemie. Każda skarga zawiera pole `resolved` (czy została rozwiązana) oraz `type`, który rozróżnia skargi dotyczące czatu (`CHAT`) i skargi dotyczące oferty (`OFFER`).

### Parametry zapytania

- **resolved** (opcjonalny, boolean): filtruj po statusie rozwiązania skargi (`true`/`false`).
- **type** (opcjonalny, string): filtruj po typie skargi (`CHAT` | `OFFER`).

### Body żądania

- Brak

### Struktura odpowiedzi 200 OK

Tablica obiektów:

- **id**: identyfikator skargi (number)
- **type**: typ skargi (string: `CHAT` | `OFFER`)
- **explanation**: opis/uzasadnienie skargi (string)
- **reporterId**: id użytkownika zgłaszającego (number | null)
- **reporterUserName**: nazwa zgłaszającego (imię i nazwisko lub company name) (string | null)
- **reportedUserId**: id zgłaszanego użytkownika (number | null)
- **reportedUserName**: nazwa zgłaszanego (imię i nazwisko lub company name) (string | null)
- **chatId**: id czatu, jeśli dotyczy (number | null)
- **messageId**: id wiadomości, jeśli dotyczy (number | null)
- **offerId**: id oferty, jeśli dotyczy (string | null)
- **resolved**: czy skarga została rozwiązana (boolean)
- **createdAt**: data utworzenia skargi (string, ISO 8601)
- **notesCount**: liczba wewnętrznych notatek do skargi (number) - dostępne tylko dla moderatorów/administratorów

### Przykładowa odpowiedź

```json
[
  {
    "id": 101,
    "type": "CHAT",
    "explanation": "Obraźliwa wiadomość",
    "reporterId": 12,
    "reporterUserName": "Anna Nowak",
    "reportedUserId": 34,
    "reportedUserName": "Jan Kowalski",
    "chatId": 55,
    "messageId": 987,
    "offerId": null,
    "resolved": false,
    "createdAt": "2025-10-05T12:34:56",
    "notesCount": 2
  },
  {
    "id": 102,
    "type": "OFFER",
    "explanation": "Oferta narusza regulamin",
    "reporterId": 45,
    "reporterUserName": "Example Sp. z o.o.",
    "reportedUserId": null,
    "reportedUserName": "Example Sp. z o.o.",
    "chatId": null,
    "messageId": null,
    "offerId": "OF1234567890",
    "resolved": true,
    "createdAt": "2025-10-04T09:10:11",
    "notesCount": 0
  }
]
```

### Kody odpowiedzi

- **200 OK**: lista skarg zwrócona poprawnie
- **401 Unauthorized**: brak ważnego tokena
- **403 Forbidden**: użytkownik bez uprawnień moderatora

### Przykład (curl)

```bash
# Bez filtrów
curl -X GET \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/mod/complaints"

# Tylko nierozwiązane skargi z czatu
curl -X GET \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/mod/complaints?resolved=false&type=CHAT"

# Rozwiązane skargi dotyczące ofert
curl -X GET \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/mod/complaints?resolved=true&type=OFFER"
```

---

### Moderator: Oznaczenie skargi jako rozwiązanej/ponowne otwarcie

- **Metoda**: PATCH
- **Ścieżka**: `/api/mod/complaints/{id}/resolve`
- **Autoryzacja**: wymagany zalogowany użytkownik z uprawnieniami moderatora
- **Opis**: Ustawia status `resolved` dla wskazanej skargi. Przekazanie `resolved=true` oznacza rozwiązanie skargi, `resolved=false` – ponowne otwarcie.

### Parametry ścieżki

- **id** (wymagany, number): identyfikator skargi

### Parametry zapytania

- **resolved** (wymagany, boolean): docelowy status skargi

### Odpowiedzi

- **200 OK**: status zaktualizowany poprawnie
- **400 Bad Request**: nieprawidłowe parametry
- **401 Unauthorized**: brak ważnego tokena
- **403 Forbidden**: użytkownik bez uprawnień moderatora
- **404 Not Found**: skarga nie istnieje

### Przykład (curl)

```bash
curl -X PATCH \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/mod/complaints/123/resolve?resolved=true"
```

### Uwagi

- **CHAT**: wypełnione co najmniej `reportedUserId`, opcjonalnie `chatId` i/lub `messageId`.
- **OFFER**: wypełnione `offerId`; pola czatu/wiadomości puste.
- `resolved` służy do filtrowania i pracy nad kolejką zgłoszeń w panelu moderatora.
- Lista zwracana jest posortowana rosnąco po `createdAt` (od najstarszych).
- Pole `notesCount` zawiera liczbę wewnętrznych notatek do skargi (dostępne tylko dla moderatorów/administratorów).

---

### Moderator: Dodanie wewnętrznej notatki do skargi

- **Metoda**: POST
- **Ścieżka**: `/api/mod/complaints/{complaintId}/notes`
- **Autoryzacja**: wymagany zalogowany użytkownik z uprawnieniami moderatora lub administratora
- **Opis**: Dodaje wewnętrzną notatkę do skargi. Notatki są widoczne tylko dla moderatorów i administratorów, nie są widoczne dla zwykłych użytkowników.

### Parametry ścieżki

- **complaintId** (wymagany, number): identyfikator skargi

### Body żądania

```json
{
  "content": "Treść notatki"
}
```

- **content** (wymagany, string): treść notatki (nie może być pusta)

### Struktura odpowiedzi 200 OK

```json
{
  "id": 1,
  "complaintId": 123,
  "authorId": 456,
  "authorName": "Jan Moderator",
  "content": "Treść notatki",
  "createdAt": "2025-01-20T10:30:00"
}
```

- **id**: identyfikator notatki (number)
- **complaintId**: identyfikator skargi (number)
- **authorId**: identyfikator autora notatki (number)
- **authorName**: imię i nazwisko autora notatki (string)
- **content**: treść notatki (string)
- **createdAt**: data utworzenia notatki (string, ISO 8601)

### Kody odpowiedzi

- **200 OK**: notatka została utworzona pomyślnie
- **400 Bad Request**: treść notatki jest pusta lub nieprawidłowe parametry
- **401 Unauthorized**: brak ważnego tokena
- **403 Forbidden**: użytkownik bez uprawnień moderatora/administratora
- **404 Not Found**: skarga nie istnieje
- **500 Internal Server Error**: błąd serwera

### Przykład (curl)

```bash
curl -X POST \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"content": "Sprawdzono - użytkownik został upomniany"}' \
  "http://localhost:8080/api/mod/complaints/123/notes"
```

### Uwagi

- Tylko moderatorzy (EMPLOYEE) i administratorzy (ADMIN) mogą dodawać notatki
- Notatki są wewnętrzne i nie są widoczne dla zwykłych użytkowników
- Treść notatki nie może być pusta

---

### Moderator: Pobranie listy notatek do skargi

- **Metoda**: GET
- **Ścieżka**: `/api/mod/complaints/{complaintId}/notes`
- **Autoryzacja**: wymagany zalogowany użytkownik z uprawnieniami moderatora lub administratora
- **Opis**: Zwraca listę wszystkich wewnętrznych notatek dla danej skargi, posortowanych od najstarszej do najnowszej.

### Parametry ścieżki

- **complaintId** (wymagany, number): identyfikator skargi

### Body żądania

- Brak

### Struktura odpowiedzi 200 OK

Tablica obiektów notatek:

```json
[
  {
    "id": 1,
    "complaintId": 123,
    "authorId": 456,
    "authorName": "Jan Moderator",
    "content": "Sprawdzono - użytkownik został upomniany",
    "createdAt": "2025-01-20T10:30:00"
  },
  {
    "id": 2,
    "complaintId": 123,
    "authorId": 789,
    "authorName": "Anna Administrator",
    "content": "Dodatkowe informacje od użytkownika",
    "createdAt": "2025-01-20T14:15:00"
  }
]
```

### Kody odpowiedzi

- **200 OK**: lista notatek zwrócona poprawnie
- **401 Unauthorized**: brak ważnego tokena
- **403 Forbidden**: użytkownik bez uprawnień moderatora/administratora
- **404 Not Found**: skarga nie istnieje
- **500 Internal Server Error**: błąd serwera

### Przykład (curl)

```bash
curl -X GET \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/mod/complaints/123/notes"
```

### Uwagi

- Tylko moderatorzy (EMPLOYEE) i administratorzy (ADMIN) mogą przeglądać notatki
- Notatki są posortowane chronologicznie od najstarszej do najnowszej
- Jeśli skarga nie ma notatek, zwracana jest pusta tablica `[]`

---

### Moderator: Usunięcie notatki do skargi

- **Metoda**: DELETE
- **Ścieżka**: `/api/mod/complaints/{complaintId}/notes/{noteId}`
- **Autoryzacja**: wymagany zalogowany użytkownik z uprawnieniami moderatora lub administratora
- **Opis**: Usuwa wewnętrzną notatkę do skargi. Tylko autor notatki lub administrator może ją usunąć.

### Parametry ścieżki

- **complaintId** (wymagany, number): identyfikator skargi
- **noteId** (wymagany, number): identyfikator notatki

### Body żądania

- Brak

### Struktura odpowiedzi 200 OK

```
"OK"
```

### Kody odpowiedzi

- **200 OK**: notatka została usunięta pomyślnie
- **401 Unauthorized**: brak ważnego tokena
- **403 Forbidden**: użytkownik bez uprawnień lub próba usunięcia cudzej notatki przez moderatora
- **404 Not Found**: notatka nie istnieje
- **500 Internal Server Error**: błąd serwera

### Przykład (curl)

```bash
curl -X DELETE \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/mod/complaints/123/notes/456"
```

### Uwagi

- Tylko autor notatki może ją usunąć (moderatorzy mogą usuwać tylko swoje notatki)
- Administratorzy mogą usuwać wszystkie notatki
- Operacja jest nieodwracalna - notatka zostanie trwale usunięta
- W przypadku próby usunięcia cudzej notatki przez moderatora, zwracany jest błąd 403 z komunikatem: "Możesz usunąć tylko swoje notatki"

---

### Moderator: Fragment konwersacji (wokół wskazanej wiadomości)

- **Metoda**: GET
- **Ścieżka**: `/api/mod/chats/{chatId}/messages/snippet`
- **Autoryzacja**: wymagany zalogowany użytkownik z uprawnieniami moderatora
- **Opis**: Zwraca fragment rozmowy zawierający wskazaną wiadomość (`messageId`) oraz do 5 wcześniejszych i 5 późniejszych wiadomości (jeśli istnieją). Wynik jest posortowany chronologicznie (rosnąco po czasie wysłania).

### Parametry ścieżki

- **chatId** (wymagany, number): identyfikator czatu

### Parametry zapytania

- **messageId** (wymagany, number): identyfikator wiadomości, wokół której budowany jest fragment

### Struktura odpowiedzi 200 OK

Tablica obiektów w formacie wiadomości czatu (`MessageDto`):

- **id**: identyfikator wiadomości (number)
- **chatId**: identyfikator czatu (number)
- **senderId**: identyfikator nadawcy (number)
- **senderName**: imię i nazwisko nadawcy (string)
- **content**: treść wiadomości (string)
- **timestamp**: znacznik czasu (string, ISO 8601)
- **messageType**: typ wiadomości (string, np. `TEXT`)

### Przykładowa odpowiedź

```json
[
  {
    "id": 190,
    "chatId": 42,
    "senderId": 12,
    "senderName": "Jan Kowalski",
    "content": "Hej, mam pytanie",
    "timestamp": "2025-10-05T12:30:00",
    "messageType": "TEXT"
  },
  {
    "id": 191,
    "chatId": 42,
    "senderId": 34,
    "senderName": "Anna Nowak",
    "content": "Jasne, słucham",
    "timestamp": "2025-10-05T12:31:05",
    "messageType": "TEXT"
  }
]
```

### Kody odpowiedzi

- **200 OK**: fragment rozmowy zwrócony poprawnie
- **400 Bad Request**: `messageId` nie należy do wskazanego `chatId` lub nieprawidłowe parametry
- **401 Unauthorized**: brak ważnego tokena
- **403 Forbidden**: użytkownik bez uprawnień moderatora

### Przykład (curl)

```bash
curl -X GET \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/mod/chats/42/messages/snippet?messageId=191"
```

---

## Admin: Usuwanie oferty

- **Metoda**: DELETE
- **Ścieżka**: `/api/admin/offers/{id}`
- **Autoryzacja**: wymagany zalogowany użytkownik z uprawnieniami administratora
- **Opis**: Usuwa ofertę z systemu wraz z powiązanymi obrazami oraz wysyła powiadomienie emailowe do twórcy oferty z podanym powodem usunięcia.

### Parametry ścieżki

- **id** (wymagany, string): identyfikator oferty

### Parametry zapytania

- **reason** (wymagany, string): powód usunięcia oferty

### Body żądania

- Brak

### Struktura odpowiedzi

- **200 OK**: oferta została usunięta pomyślnie
- **400 Bad Request**: nieprawidłowe parametry
- **401 Unauthorized**: brak ważnego tokena
- **403 Forbidden**: użytkownik bez uprawnień administratora
- **404 Not Found**: oferta nie istnieje

### Przykład (curl)

```bash
curl -X DELETE \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/admin/offers/OF1234567890?reason=Naruszenie regulaminu platformy"
```

### Uwagi

- Operacja usuwa ofertę wraz z wszystkimi powiązanymi obrazami (zarówno pliki fizyczne, jak i rekordy w bazie danych)
- Twórca oferty otrzyma powiadomienie emailowe z podanym powodem usunięcia
- Operacja jest nieodwracalna - oferta i jej dane zostaną trwale usunięte
- W przypadku błędu wysyłania emaila, operacja usuwania i tak zostanie wykonana

---

## Moderator: Blokowanie oferty

- **Metoda**: PATCH
- **Ścieżka**: `/api/mod/offers/{id}/block`
- **Autoryzacja**: wymagany zalogowany użytkownik z uprawnieniami moderatora
- **Opis**: Blokuje ofertę ustawiając jej status na `BLOCKED`. Zablokowane oferty nie są widoczne dla innych użytkowników, ale pozostają widoczne dla ich twórcy. Po edycji przez użytkownika oferta automatycznie przechodzi do statusu `PENDING` w celu ponownej weryfikacji.

### Parametry ścieżki

- **id** (wymagany, string): identyfikator oferty

### Parametry zapytania

- **reason** (wymagany, string): powód blokowania oferty

### Body żądania

- Brak

### Struktura odpowiedzi

- **200 OK**: oferta została zablokowana pomyślnie
- **400 Bad Request**: nieprawidłowe parametry
- **401 Unauthorized**: brak ważnego tokena
- **403 Forbidden**: użytkownik bez uprawnień moderatora
- **404 Not Found**: oferta nie istnieje

### Przykład (curl)

```bash
curl -X PATCH \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/mod/offers/OF1234567890/block?reason=Naruszenie regulaminu - nieprawidłowa kategoria"
```

### Uwagi

- Oferta zostanie ukryta przed innymi użytkownikami, ale pozostanie widoczna dla jej twórcy
- Twórca oferty otrzyma powiadomienie emailowe z nazwą oferty i powodem blokady
- Po edycji oferty przez użytkownika, automatycznie zmieni się ona na status `PENDING` i będzie wymagała ponownej weryfikacji
- W przypadku błędu wysyłania emaila, operacja blokowania i tak zostanie wykonana
