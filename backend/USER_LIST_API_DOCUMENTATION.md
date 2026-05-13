# API Dokumentacja - Lista Użytkowników

## Endpoint
```
GET /api/admin/users
```

## Opis
Endpoint do pobierania listy użytkowników z możliwością filtrowania, sortowania, wyszukiwania i paginacji. Dostępny tylko dla administratorów.

## Parametry

### Paginacja
- `page` (int, opcjonalne, domyślnie: 0) - numer strony (0-indexed)
- `size` (int, opcjonalne, domyślnie: 20) - liczba elementów na stronę

### Sortowanie
- `sortBy` (string, opcjonalne, domyślnie: "createDate") - pole do sortowania
  - Dostępne pola: `id`, `firstName`, `lastName`, `email`, `phoneNumber`, `verified`, `banned`, `createDate`
- `sortDirection` (string, opcjonalne, domyślnie: "desc") - kierunek sortowania
  - Dostępne wartości: `asc`, `desc`

### Wyszukiwanie
- `searchTerm` (string, opcjonalne) - wyszukiwanie w imieniu, nazwisku, emailu i numerze telefonu
  - Case-insensitive
  - Wyszukuje w sklejonym imieniu i nazwisku (np. "Jan Kowalski")

### Filtrowanie
- `userType` (string, opcjonalne) - typ użytkownika
  - Dostępne wartości: `USER`, `COMPANY`, `ADMIN`, `EMPLOYEE`
- `verified` (boolean, opcjonalne) - status weryfikacji
  - `true` - tylko zweryfikowani
  - `false` - tylko niezweryfikowani
- `banned` (boolean, opcjonalne) - status zablokowania
  - `true` - tylko zablokowani
  - `false` - tylko niezablokowani

## Przykłady użycia

### Podstawowe zapytania
```
GET /api/admin/users
GET /api/admin/users?page=1&size=10
GET /api/admin/users?sortBy=firstName&sortDirection=asc
```

### Wyszukiwanie
```
GET /api/admin/users?searchTerm=jan
GET /api/admin/users?searchTerm=kowalski
GET /api/admin/users?searchTerm=@gmail.com
```

### Filtrowanie
```
GET /api/admin/users?userType=USER
GET /api/admin/users?verified=true
GET /api/admin/users?banned=false
GET /api/admin/users?userType=COMPANY&verified=true
```

### Kombinacje
```
GET /api/admin/users?searchTerm=jan&userType=USER&verified=true&banned=false
GET /api/admin/users?page=0&size=5&sortBy=createDate&sortDirection=desc&userType=COMPANY
```

## Odpowiedź

### Struktura odpowiedzi
```json
{
  "users": [
    {
      "id": 1,
      "firstName": "Jan",
      "lastName": "Kowalski",
      "email": "jan.kowalski@example.com",
      "phoneNumber": "+48123456789",
      "verified": true,
      "banned": false,
      "createDate": "2024-01-15T10:30:00"
    }
  ],
  "totalElements": 150,
  "totalPages": 8,
  "currentPage": 0,
  "pageSize": 20
}
```

### Pola odpowiedzi
- `users` - lista użytkowników
  - `id` - ID użytkownika
  - `firstName` - imię
  - `lastName` - nazwisko
  - `email` - adres email
  - `phoneNumber` - numer telefonu
  - `verified` - status weryfikacji
  - `banned` - status zablokowania
  - `createDate` - data utworzenia konta
- `totalElements` - całkowita liczba użytkowników
- `totalPages` - całkowita liczba stron
- `currentPage` - aktualna strona
- `pageSize` - rozmiar strony

## Kody odpowiedzi
- `200 OK` - pomyślne pobranie listy
- `401 Unauthorized` - brak autoryzacji
- `403 Forbidden` - brak uprawnień administratora

## Uwagi
- Wszystkie operacje filtrowania i wyszukiwania są wykonywane w bazie danych
- Wyszukiwanie jest case-insensitive
- Filtry można łączyć dowolnie
- Jeśli podano nieprawidłowy `userType`, filtr jest ignorowany
- Domyślnie sortowanie jest po dacie utworzenia malejąco (najnowsze pierwsze)
