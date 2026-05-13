# Dokumentacja zmian w WebSocket - Rozróżnianie typów czatów

## Opis problemu

Wcześniej zarówno zwykłe czaty (użytkownik-użytkownik) jak i czaty z konsultantem (użytkownik-moderator) działały na jednym WebSocketcie, co powodowało mieszanie się notyfikacji w aplikacji frontowej. Frontend nie mógł rozróżnić, czy otrzymana wiadomość pochodzi ze zwykłego czatu czy z czatu z konsultantem, co prowadziło do błędnej obsługi powiadomień.

## Rozwiązanie

Dodano pole `chatType` do wszystkich odpowiedzi WebSocket związanych z wiadomościami. To pole pozwala frontendowi jednoznacznie rozróżnić typ czatu i odpowiednio obsłużyć wiadomość.

## Zmiany w strukturze DTO

### 1. ChatMessageResponse (zwykłe czaty)

Dodano pole `chatType` z wartością `"REGULAR"` dla wszystkich wiadomości ze zwykłych czatów.

**Przed zmianą:**
```json
{
  "id": 1,
  "chatId": 123,
  "senderId": 456,
  "senderName": "Jan Kowalski",
  "content": "Cześć!",
  "timestamp": "2025-01-20T10:30:00",
  "messageType": "TEXT"
}
```

**Po zmianie:**
```json
{
  "id": 1,
  "chatId": 123,
  "senderId": 456,
  "senderName": "Jan Kowalski",
  "content": "Cześć!",
  "timestamp": "2025-01-20T10:30:00",
  "messageType": "TEXT",
  "chatType": "REGULAR"
}
```

### 2. ConsultantMessageDto (czaty z konsultantem)

Dodano pole `chatType` z wartością `"CONSULTANT"` dla wszystkich wiadomości z czatów z konsultantem.

**Przed zmianą:**
```json
{
  "id": 1,
  "chatId": 789,
  "senderId": 123,
  "senderName": "Jan Kowalski",
  "content": "Dzień dobry, mam pytanie...",
  "timestamp": "2025-01-20T11:15:00",
  "messageType": "TEXT"
}
```

**Po zmianie:**
```json
{
  "id": 1,
  "chatId": 789,
  "senderId": 123,
  "senderName": "Jan Kowalski",
  "content": "Dzień dobry, mam pytanie...",
  "timestamp": "2025-01-20T11:15:00",
  "messageType": "TEXT",
  "chatType": "CONSULTANT"
}
```

## Wartości pola chatType

Pole `chatType` może przyjmować następujące wartości:

- **`"REGULAR"`** - wiadomość pochodzi ze zwykłego czatu (użytkownik-użytkownik)
- **`"CONSULTANT"`** - wiadomość pochodzi z czatu z konsultantem (użytkownik-moderator)

## Użycie w frontendzie

### Przykład obsługi wiadomości WebSocket (JavaScript)

```javascript
// Połączenie WebSocket
const ws = new WebSocket('ws://localhost:8080/ws/chat?token=' + jwtToken);

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    // Rozróżnienie typu czatu na podstawie pola chatType
    if (message.chatType === "CONSULTANT") {
        // Obsługa wiadomości z czatu z konsultantem
        handleConsultantChatMessage(message);
    } else if (message.chatType === "REGULAR") {
        // Obsługa wiadomości ze zwykłego czatu
        handleRegularChatMessage(message);
    } else {
        // Obsługa powiadomień (ConsultantChatNotificationDto nie ma chatType)
        handleNotification(message);
    }
};

function handleConsultantChatMessage(message) {
    // Aktualizuj interfejs czatu z konsultantem
    updateConsultantChatUI(message.chatId, message);
    // Wyświetl powiadomienie specyficzne dla czatu z konsultantem
    showNotification("Nowa wiadomość w czacie z konsultantem", message.content);
}

function handleRegularChatMessage(message) {
    // Aktualizuj interfejs zwykłego czatu
    updateRegularChatUI(message.chatId, message);
    // Wyświetl powiadomienie specyficzne dla zwykłego czatu
    showNotification("Nowa wiadomość od " + message.senderName, message.content);
}

function handleNotification(notification) {
    // Obsługa powiadomień o zmianach statusu czatu z konsultantem
    // (NEW_CHAT, CHAT_ASSIGNED, CHAT_UNASSIGNED, NEW_MESSAGE)
    if (notification.type === "NEW_CHAT") {
        // Aktualizuj listę dostępnych czatów dla moderatora
        updateAvailableChatsList(notification.chat);
    }
}
```

### Przykład obsługi wiadomości WebSocket (TypeScript)

```typescript
interface ChatMessageResponse {
    id: number;
    chatId: number;
    senderId: number;
    senderName: string;
    content: string;
    timestamp: string;
    messageType: string;
    chatType: "REGULAR" | "CONSULTANT";
}

interface ConsultantMessageDto {
    id: number;
    chatId: number;
    senderId: number;
    senderName: string;
    content: string;
    timestamp: string;
    messageType: string;
    chatType: "REGULAR" | "CONSULTANT";
}

const ws = new WebSocket('ws://localhost:8080/ws/chat?token=' + jwtToken);

ws.onmessage = (event: MessageEvent) => {
    const message: ChatMessageResponse | ConsultantMessageDto = JSON.parse(event.data);
    
    switch (message.chatType) {
        case "REGULAR":
            handleRegularChatMessage(message);
            break;
        case "CONSULTANT":
            handleConsultantChatMessage(message);
            break;
        default:
            // Może to być powiadomienie (ConsultantChatNotificationDto)
            handleNotification(message);
    }
};
```

## Powiadomienia WebSocket

**Uwaga**: Powiadomienia (`ConsultantChatNotificationDto`) o zmianach statusu czatu z konsultantem (np. `NEW_CHAT`, `CHAT_ASSIGNED`) **nie zawierają** pola `chatType`, ponieważ są to powiadomienia systemowe, nie wiadomości czatu. Te powiadomienia można rozpoznać po obecności pola `type` w strukturze:

```json
{
  "type": "NEW_CHAT",
  "chat": { ... },
  "message": null
}
```

## Kompatybilność wsteczna

- Wszystkie nowe wiadomości wysyłane przez WebSocket zawierają pole `chatType`
- Frontend powinien sprawdzać obecność pola `chatType` przed jego użyciem (dla bezpieczeństwa)
- Jeśli pole `chatType` nie jest obecne, może to oznaczać, że otrzymano powiadomienie systemowe lub starszą wersję wiadomości

### Przykład bezpiecznej obsługi

```javascript
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    // Sprawdź czy to wiadomość czatu (ma chatType)
    if (data.chatType) {
        if (data.chatType === "CONSULTANT") {
            handleConsultantChatMessage(data);
        } else if (data.chatType === "REGULAR") {
            handleRegularChatMessage(data);
        }
    } else if (data.type) {
        // To jest powiadomienie systemowe
        handleNotification(data);
    }
};
```

## Zmiany w kodzie backendu

### Pliki zmodyfikowane:

1. **`src/main/java/com/example/gng/chat/dto/ChatMessageResponse.java`**
   - Dodano pole `chatType` typu `String`
   - Ustawiane automatycznie na `"REGULAR"` w `ChatWebSocketService`

2. **`src/main/java/com/example/gng/consultant/dto/ConsultantMessageDto.java`**
   - Dodano pole `chatType` typu `String`
   - Ustawiane automatycznie na `"CONSULTANT"` w `ConsultantChatService`

3. **`src/main/java/com/example/gng/chat/service/ChatWebSocketService.java`**
   - Metoda `convertToChatMessageResponse()` ustawia `chatType = "REGULAR"`

4. **`src/main/java/com/example/gng/consultant/service/ConsultantChatService.java`**
   - Metoda `convertMessageToDto()` ustawia `chatType = "CONSULTANT"`

## Podsumowanie

Dzięki dodaniu pola `chatType` do odpowiedzi WebSocket, frontend może teraz jednoznacznie rozróżnić typ czatu i odpowiednio obsłużyć wiadomości oraz powiadomienia. To rozwiązanie eliminuje problem mieszania się notyfikacji między zwykłymi czatami a czatami z konsultantem.

