# Dokumentacja API - Czat z Konsultantem

## Endpointy dla użytkowników

### Użytkownik: Rozpocznij czat z konsultantem

- **Metoda**: POST
- **Ścieżka**: `/api/user/consultant-chat/start`
- **Autoryzacja**: wymagany zalogowany użytkownik
- **Opis**: Tworzy nowy czat z konsultantem. Jeśli użytkownik ma już aktywny czat, zwraca istniejący zamiast tworzyć nowy.

### Parametry zapytania

- Brak

### Body żądania

- Brak

### Struktura odpowiedzi 200 OK

Obiekt `ConsultantChatDto`:

- **id**: identyfikator czatu (number)
- **userId**: identyfikator użytkownika (number)
- **userName**: imię i nazwisko użytkownika (string)
- **moderatorId**: zawsze `null` dla użytkownika (użytkownik nie widzi informacji o przypisaniu moderatora)
- **moderatorName**: zawsze `null` dla użytkownika
- **status**: zawsze `"OPENED"` dla użytkownika (użytkownik nie widzi rzeczywistego statusu)
- **createdAt**: data utworzenia czatu (string, ISO 8601)
- **lastMessageAt**: data ostatniej wiadomości (string, ISO 8601 | null)
- **closedAt**: data zamknięcia czatu (string, ISO 8601 | null)
- **lastMessagePreview**: podgląd ostatniej wiadomości (string | null)

### Przykładowa odpowiedź

```json
{
  "id": 1,
  "userId": 123,
  "userName": "Jan Kowalski",
  "moderatorId": null,
  "moderatorName": null,
  "status": "OPENED",
  "createdAt": "2025-01-20T10:30:00",
  "lastMessageAt": null,
  "closedAt": null,
  "lastMessagePreview": null
}
```

**Uwaga**: Dla użytkownika `moderatorId` i `moderatorName` są zawsze `null`, a `status` zawsze `"OPENED"`. Użytkownik nie widzi informacji o przypisaniu moderatora.

### Kody odpowiedzi

- **200 OK**: czat utworzony lub zwrócony istniejący
- **401 Unauthorized**: brak autoryzacji
- **400 Bad Request**: błąd podczas tworzenia czatu

### Przykład (curl)

```bash
curl -X POST \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/user/consultant-chat/start"
```

---

### Użytkownik: Pobierz listę czatów z konsultantem

- **Metoda**: GET
- **Ścieżka**: `/api/user/consultant-chat`
- **Autoryzacja**: wymagany zalogowany użytkownik
- **Opis**: Zwraca listę wszystkich czatów z konsultantem dla zalogowanego użytkownika (w tym zamkniętych).

### Parametry zapytania

- Brak

### Body żądania

- Brak

### Struktura odpowiedzi 200 OK

Tablica obiektów `ConsultantChatDto` (jak wyżej).

### Przykładowa odpowiedź

```json
[
  {
    "id": 1,
    "userId": 123,
    "userName": "Jan Kowalski",
    "moderatorId": null,
    "moderatorName": null,
    "status": "OPENED",
    "createdAt": "2025-01-20T10:30:00",
    "lastMessageAt": "2025-01-20T11:15:00",
    "closedAt": null,
    "lastMessagePreview": "Dzień dobry, mam pytanie dotyczące..."
  },
  {
    "id": 2,
    "userId": 123,
    "userName": "Jan Kowalski",
    "moderatorId": null,
    "moderatorName": null,
    "status": "OPENED",
    "createdAt": "2025-01-19T14:20:00",
    "lastMessageAt": "2025-01-19T15:30:00",
    "closedAt": "2025-01-19T15:45:00",
    "lastMessagePreview": "Dziękuję za pomoc!"
  }
]
```

**Uwaga**: Dla użytkownika zawsze `moderatorId` i `moderatorName` są `null`, a `status` zawsze `"OPENED"` (nawet jeśli czat jest zamknięty - wtedy `closedAt` nie jest `null`).

### Kody odpowiedzi

- **200 OK**: lista czatów zwrócona poprawnie
- **401 Unauthorized**: brak autoryzacji
- **400 Bad Request**: błąd podczas pobierania czatów

### Przykład (curl)

```bash
curl -X GET \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/user/consultant-chat"
```

---

### Użytkownik: Pobierz wiadomości z czatu

- **Metoda**: GET
- **Ścieżka**: `/api/user/consultant-chat/{chatId}/messages`
- **Autoryzacja**: wymagany zalogowany użytkownik
- **Opis**: Zwraca wszystkie wiadomości z czatu z konsultantem, posortowane chronologicznie (najstarsze pierwsze).

### Parametry ścieżki

- **chatId** (wymagany, number): identyfikator czatu

### Parametry zapytania

- Brak

### Body żądania

- Brak

### Struktura odpowiedzi 200 OK

Tablica obiektów `ConsultantMessageDto`:

- **id**: identyfikator wiadomości (number)
- **chatId**: identyfikator czatu (number)
- **senderId**: identyfikator nadawcy (number)
- **senderName**: imię i nazwisko nadawcy (string)
- **content**: treść wiadomości (string)
- **timestamp**: data i czas wysłania wiadomości (string, ISO 8601)
- **messageType**: typ wiadomości (string: `TEXT` | `IMAGE` | `FILE`)

### Przykładowa odpowiedź

```json
[
  {
    "id": 1,
    "chatId": 1,
    "senderId": 123,
    "senderName": "Jan Kowalski",
    "content": "Dzień dobry, mam pytanie dotyczące zwrotu produktu.",
    "timestamp": "2025-01-20T10:30:00",
    "messageType": "TEXT"
  },
  {
    "id": 2,
    "chatId": 1,
    "senderId": 456,
    "senderName": "Anna Moderator",
    "content": "Dzień dobry! Z przyjemnością pomogę. Proszę podać numer zamówienia.",
    "timestamp": "2025-01-20T10:35:00",
    "messageType": "TEXT"
  }
]
```

### Kody odpowiedzi

- **200 OK**: wiadomości zwrócone poprawnie
- **401 Unauthorized**: brak autoryzacji
- **400 Bad Request**: błąd podczas pobierania wiadomości lub brak uprawnień do czatu

### Przykład (curl)

```bash
curl -X GET \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/user/consultant-chat/1/messages"
```

---

### Użytkownik: Wyślij wiadomość w czacie z konsultantem

- **Metoda**: POST
- **Ścieżka**: `/api/user/consultant-chat/message`
- **Autoryzacja**: wymagany zalogowany użytkownik
- **Opis**: Wysyła wiadomość w czacie z konsultantem. Automatycznie wysyła powiadomienie FCM do drugiego uczestnika.

### Parametry zapytania

- Brak

### Body żądania

Obiekt `SendConsultantMessageRequest`:

- **chatId** (wymagany, number): identyfikator czatu
- **content** (wymagany, string): treść wiadomości
- **messageType** (opcjonalny, string): typ wiadomości, domyślnie `"TEXT"`

### Struktura odpowiedzi 200 OK

Obiekt `ConsultantMessageDto` (jak wyżej).

### Przykładowa odpowiedź

```json
{
  "id": 3,
  "chatId": 1,
  "senderId": 123,
  "senderName": "Jan Kowalski",
  "content": "Numer zamówienia to 12345",
  "timestamp": "2025-01-20T10:40:00",
  "messageType": "TEXT"
}
```

### Kody odpowiedzi

- **200 OK**: wiadomość wysłana poprawnie
- **401 Unauthorized**: brak autoryzacji
- **400 Bad Request**: błąd podczas wysyłania wiadomości lub brak uprawnień do czatu

### Przykład (curl)

```bash
curl -X POST \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": 1,
    "content": "Numer zamówienia to 12345",
    "messageType": "TEXT"
  }' \
  "http://localhost:8080/api/user/consultant-chat/message"
```

---

### Użytkownik: Zamknij czat z konsultantem

- **Metoda**: DELETE
- **Ścieżka**: `/api/user/consultant-chat/{chatId}`
- **Autoryzacja**: wymagany zalogowany użytkownik
- **Opis**: Zamyka czat z konsultantem. Tylko właściciel czatu może go zamknąć. Status czatu zmienia się na `CLOSED`.

### Parametry ścieżki

- **chatId** (wymagany, number): identyfikator czatu

### Parametry zapytania

- Brak

### Body żądania

- Brak

### Struktura odpowiedzi 200 OK

- **"OK"** (string): zawsze zwraca "OK" przy sukcesie

### Przykładowa odpowiedź

```
OK
```

### Kody odpowiedzi

- **200 OK**: czat zamknięty poprawnie
- **401 Unauthorized**: brak autoryzacji
- **400 Bad Request**: błąd podczas zamykania czatu lub brak uprawnień

### Przykład (curl)

```bash
curl -X DELETE \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/user/consultant-chat/1"
```

---

## Endpointy dla moderatorów

### Moderator: Pobierz dostępne czaty z konsultantem

- **Metoda**: GET
- **Ścieżka**: `/api/mod/consultant-chat`
- **Autoryzacja**: wymagany zalogowany użytkownik z uprawnieniami moderatora
- **Opis**: Zwraca listę dostępnych czatów z konsultantem dla moderatora. Obejmuje czaty o statusie `OPENED` (nieprzypisane) oraz czaty przypisane do danego moderatora (`ASSIGNED`).

### Parametry zapytania

- Brak

### Body żądania

- Brak

### Struktura odpowiedzi 200 OK

Tablica obiektów `ConsultantChatDto` (jak w sekcji użytkowników).

### Przykładowa odpowiedź

```json
[
  {
    "id": 1,
    "userId": 123,
    "userName": "Jan Kowalski",
    "moderatorId": null,
    "moderatorName": null,
    "status": "OPENED",
    "createdAt": "2025-01-20T10:30:00",
    "lastMessageAt": null,
    "closedAt": null,
    "lastMessagePreview": null
  },
  {
    "id": 3,
    "userId": 789,
    "userName": "Anna Nowak",
    "moderatorId": 456,
    "moderatorName": "Konsultant Moderator",
    "status": "ASSIGNED",
    "createdAt": "2025-01-20T09:15:00",
    "lastMessageAt": "2025-01-20T11:00:00",
    "closedAt": null,
    "lastMessagePreview": "Czy mogę zwrócić produkt?"
  }
]
```

### Kody odpowiedzi

- **200 OK**: lista czatów zwrócona poprawnie
- **401 Unauthorized**: brak autoryzacji
- **400 Bad Request**: błąd podczas pobierania czatów

### Przykład (curl)

```bash
curl -X GET \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/mod/consultant-chat"
```

---

### Moderator: Przypisz czat do moderatora

- **Metoda**: PATCH
- **Ścieżka**: `/api/mod/consultant-chat/{chatId}/assign`
- **Autoryzacja**: wymagany zalogowany użytkownik z uprawnieniami moderatora
- **Opis**: Przypisuje czat z konsultantem do zalogowanego moderatora. Status czatu zmienia się na `ASSIGNED`. Po przypisaniu, czat jest widoczny tylko dla tego moderatora w liście dostępnych czatów.

### Parametry ścieżki

- **chatId** (wymagany, number): identyfikator czatu

### Parametry zapytania

- Brak

### Body żądania

- Brak

### Struktura odpowiedzi 200 OK

Obiekt `ConsultantChatDto` (jak wyżej).

### Przykładowa odpowiedź

```json
{
  "id": 1,
  "userId": 123,
  "userName": "Jan Kowalski",
  "moderatorId": 456,
  "moderatorName": "Konsultant Moderator",
  "status": "ASSIGNED",
  "createdAt": "2025-01-20T10:30:00",
  "lastMessageAt": null,
  "closedAt": null,
  "lastMessagePreview": null
}
```

### Kody odpowiedzi

- **200 OK**: czat przypisany poprawnie
- **401 Unauthorized**: brak autoryzacji
- **400 Bad Request**: błąd podczas przypisywania czatu

### Przykład (curl)

```bash
curl -X PATCH \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/mod/consultant-chat/1/assign"
```

---

### Moderator: Odepnij czat od moderatora

- **Metoda**: PATCH
- **Ścieżka**: `/api/mod/consultant-chat/{chatId}/unassign`
- **Autoryzacja**: wymagany zalogowany użytkownik z uprawnieniami moderatora
- **Opis**: Odepina czat od moderatora. Status czatu zmienia się na `OPENED`, a czat staje się widoczny dla wszystkich moderatorów.

### Parametry ścieżki

- **chatId** (wymagany, number): identyfikator czatu

### Parametry zapytania

- Brak

### Body żądania

- Brak

### Struktura odpowiedzi 200 OK

Obiekt `ConsultantChatDto` (jak wyżej).

### Przykładowa odpowiedź

```json
{
  "id": 1,
  "userId": 123,
  "userName": "Jan Kowalski",
  "moderatorId": null,
  "moderatorName": null,
  "status": "OPENED",
  "createdAt": "2025-01-20T10:30:00",
  "lastMessageAt": "2025-01-20T11:00:00",
  "closedAt": null,
  "lastMessagePreview": "Dziękuję za pomoc!"
}
```

### Kody odpowiedzi

- **200 OK**: czat odpięty poprawnie
- **401 Unauthorized**: brak autoryzacji
- **400 Bad Request**: błąd podczas odpinania czatu

### Przykład (curl)

```bash
curl -X PATCH \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/mod/consultant-chat/1/unassign"
```

---

### Moderator: Pobierz wiadomości z czatu

- **Metoda**: GET
- **Ścieżka**: `/api/mod/consultant-chat/{chatId}/messages`
- **Autoryzacja**: wymagany zalogowany użytkownik z uprawnieniami moderatora
- **Opis**: Zwraca wszystkie wiadomości z czatu z konsultantem. Moderator może pobrać wiadomości tylko z czatów przypisanych do niego lub czatów o statusie `OPENED`.

### Parametry ścieżki

- **chatId** (wymagany, number): identyfikator czatu

### Parametry zapytania

- Brak

### Body żądania

- Brak

### Struktura odpowiedzi 200 OK

Tablica obiektów `ConsultantMessageDto` (jak w sekcji użytkowników).

### Kody odpowiedzi

- **200 OK**: wiadomości zwrócone poprawnie
- **401 Unauthorized**: brak autoryzacji
- **400 Bad Request**: błąd podczas pobierania wiadomości lub brak uprawnień

### Przykład (curl)

```bash
curl -X GET \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/mod/consultant-chat/1/messages"
```

---

### Moderator: Wyślij wiadomość w czacie z konsultantem

- **Metoda**: POST
- **Ścieżka**: `/api/mod/consultant-chat/message`
- **Autoryzacja**: wymagany zalogowany użytkownik z uprawnieniami moderatora
- **Opis**: Wysyła wiadomość w czacie z konsultantem jako moderator. Automatycznie wysyła powiadomienie FCM do użytkownika. Moderator może wysyłać wiadomości tylko w czatach przypisanych do niego.

### Parametry zapytania

- Brak

### Body żądania

Obiekt `SendConsultantMessageRequest` (jak w sekcji użytkowników).

### Struktura odpowiedzi 200 OK

Obiekt `ConsultantMessageDto` (jak w sekcji użytkowników).

### Kody odpowiedzi

- **200 OK**: wiadomość wysłana poprawnie
- **401 Unauthorized**: brak autoryzacji
- **400 Bad Request**: błąd podczas wysyłania wiadomości lub brak uprawnień

### Przykład (curl)

```bash
curl -X POST \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": 1,
    "content": "Dzień dobry! Z przyjemnością pomogę.",
    "messageType": "TEXT"
  }' \
  "http://localhost:8080/api/mod/consultant-chat/message"
```

---

## Statusy czatu

- **OPENED**: Czat rozpoczęty przez użytkownika, oczekuje na przypisanie do moderatora. Widoczny dla wszystkich moderatorów.

- **ASSIGNED**: Czat przypisany do konkretnego moderatora. Widoczny tylko dla tego moderatora w liście dostępnych czatów.

- **CLOSED**: Czat zamknięty przez użytkownika lub automatycznie przez system (brak aktywności od 30 minut). Zamknięte czaty nie są widoczne w liście dostępnych czatów dla moderatorów.

## Automatyczne zamykanie czatów

System automatycznie zamyka czaty z konsultantem, w których nie pojawiła się nowa wiadomość od 30 minut. Scheduler uruchamiany jest co 10 minut.

## Powiadomienia FCM

System automatycznie wysyła powiadomienia FCM przy nowych wiadomościach w czacie z konsultantem:

- **Tytuł**: "Give n' Get. Nowa wiadomość w czacie z konsultantem"
- **Treść**: Imię nadawcy + treść wiadomości
- **Click Action**: `/consultant-chat?chatId={chatId}`

## WebSocket

Czat z konsultantem obsługuje WebSocket dla wiadomości i powiadomień w czasie rzeczywistym.

### Wiadomości w czacie

Gdy użytkownik lub moderator wysyła wiadomość przez endpoint REST, wiadomość jest automatycznie wysyłana przez WebSocket do drugiego uczestnika czatu.

**Format wiadomości WebSocket**: Obiekt `ConsultantMessageDto` w formacie JSON (identyczny jak odpowiedź z endpointu `POST /api/user/consultant-chat/message`).

### Powiadomienia dla moderatorów

Moderatorzy otrzymują powiadomienia WebSocket o następujących zdarzeniach:

1. **Nowy czat z konsultantem** (`NEW_CHAT`)
2. **Przypisanie czatu do moderatora** (`CHAT_ASSIGNED`)
3. **Odpięcie czatu od moderatora** (`CHAT_UNASSIGNED`)
4. **Nowa wiadomość w nieprzypisanym czacie** (`NEW_MESSAGE`)

**Format powiadomienia WebSocket**:

Obiekt `ConsultantChatNotificationDto`:

```json
{
  "type": "NEW_CHAT" | "CHAT_ASSIGNED" | "CHAT_UNASSIGNED" | "NEW_MESSAGE",
  "chat": {
    // Obiekt ConsultantChatDto (z pełnymi informacjami dla moderatora)
  },
  "message": {
    // Obiekt ConsultantMessageDto (tylko dla typu "NEW_MESSAGE")
  }
}
```

**Przykładowe powiadomienia**:

**Nowy czat**:
```json
{
  "type": "NEW_CHAT",
  "chat": {
    "id": 1,
    "userId": 123,
    "userName": "Jan Kowalski",
    "moderatorId": null,
    "moderatorName": null,
    "status": "OPENED",
    "createdAt": "2025-01-20T10:30:00",
    "lastMessageAt": null,
    "closedAt": null,
    "lastMessagePreview": null
  },
  "message": null
}
```

**Nowa wiadomość w nieprzypisanym czacie**:
```json
{
  "type": "NEW_MESSAGE",
  "chat": {
    "id": 1,
    "userId": 123,
    "userName": "Jan Kowalski",
    "moderatorId": null,
    "moderatorName": null,
    "status": "OPENED",
    "createdAt": "2025-01-20T10:30:00",
    "lastMessageAt": "2025-01-20T11:15:00",
    "closedAt": null,
    "lastMessagePreview": "Dzień dobry, mam pytanie..."
  },
  "message": {
    "id": 5,
    "chatId": 1,
    "senderId": 123,
    "senderName": "Jan Kowalski",
    "content": "Dzień dobry, mam pytanie...",
    "timestamp": "2025-01-20T11:15:00",
    "messageType": "TEXT"
  }
}
```

**Przypisanie czatu**:
```json
{
  "type": "CHAT_ASSIGNED",
  "chat": {
    "id": 1,
    "userId": 123,
    "userName": "Jan Kowalski",
    "moderatorId": 456,
    "moderatorName": "Anna Moderator",
    "status": "ASSIGNED",
    "createdAt": "2025-01-20T10:30:00",
    "lastMessageAt": "2025-01-20T11:15:00",
    "closedAt": null,
    "lastMessagePreview": "Dzień dobry, mam pytanie..."
  },
  "message": null
}
```

**Uwaga**: 
- Frontend powinien nasłuchiwać wiadomości WebSocket dla użytkownika/moderatora i aktualizować interfejs w czasie rzeczywistym
- Moderatorzy otrzymują powiadomienia o nowych czatach i wiadomościach w nieprzypisanych czatach, aby mogli reagować bez odświeżania strony
- Powiadomienia o nowych wiadomościach są wysyłane tylko dla czatów o statusie `OPENED` (nieprzypisanych)

## Uwagi implementacyjne

1. **Jeden aktywny czat na użytkownika**: Użytkownik może mieć tylko jeden aktywny czat z konsultantem. Próba utworzenia nowego czatu zwróci istniejący aktywny czat.

2. **Ukrywanie informacji o moderatorze**: Użytkownik nie widzi żadnych informacji o przypisaniu moderatora. W odpowiedziach dla użytkownika:
   - `moderatorId` i `moderatorName` są zawsze `null`
   - `status` jest zawsze `"OPENED"` (nawet jeśli czat jest przypisany lub zamknięty)

3. **Uprawnienia**: 
   - Użytkownik może wysyłać wiadomości i pobierać wiadomości tylko z własnych czatów
   - Moderator może pobierać i wysyłać wiadomości tylko z czatów przypisanych do niego lub czatów o statusie `OPENED`

4. **Przypisanie czatu**: Po przypisaniu czatu do moderatora, jest on widoczny tylko dla tego moderatora w liście dostępnych czatów. Użytkownik nie widzi tej zmiany.

5. **Odpięcie czatu**: Po odpięciu czatu od moderatora, status zmienia się na `OPENED` i czat staje się widoczny dla wszystkich moderatorów.

6. **Zamykanie czatu**: Tylko użytkownik będący właścicielem czatu może go zamknąć. Zamknięte czaty nie są widoczne w liście dostępnych dla moderatorów.

7. **Typy wiadomości**: Obecnie obsługiwany jest typ `TEXT`. Inne typy (`IMAGE`, `FILE`) mogą być dodane w przyszłości.

8. **WebSocket**: 
   - Wiadomości są automatycznie wysyłane przez WebSocket do drugiego uczestnika czatu
   - Moderatorzy otrzymują powiadomienia WebSocket o:
     - Nowych czatach z konsultantem (`NEW_CHAT`)
     - Przypisaniu czatu (`CHAT_ASSIGNED`)
     - Odpięciu czatu (`CHAT_UNASSIGNED`)
     - Nowych wiadomościach w nieprzypisanych czatach (`NEW_MESSAGE`)
   - Frontend powinien nasłuchiwać wiadomości WebSocket i aktualizować interfejs w czasie rzeczywistym
   - Powiadomienia o nowych wiadomościach są wysyłane tylko dla czatów o statusie `OPENED` (nieprzypisanych)

