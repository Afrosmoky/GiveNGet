# API Dokumentacja - Ulubione Oferty

## Przegląd

Funkcjonalność ulubionych ofert pozwala użytkownikom na dodawanie i usuwanie ofert z listy ulubionych oraz przeglądanie swoich ulubionych ofert.

## Endpointy

### 1. Dodaj ofertę do ulubionych

**POST** `/api/favorites/{offerId}`

Dodaje ofertę do ulubionych dla aktualnie zalogowanego użytkownika.

**Parametry:**
- `offerId` (path) - ID oferty do dodania

**Nagłówki:**
- `Authorization: Bearer {token}` - Token JWT użytkownika

**Odpowiedź sukcesu (200):**
```json
"Oferta została dodana do ulubionych"
```

**Odpowiedź błędu (400):**
```json
"Użytkownik musi być zalogowany"
"Użytkownik nie znaleziony"
"Oferta nie znaleziona"
"Nie możesz dodać własnej oferty do ulubionych"
"Oferta jest już w ulubionych"
```

### 2. Usuń ofertę z ulubionych

**DELETE** `/api/favorites/{offerId}`

Usuwa ofertę z ulubionych dla aktualnie zalogowanego użytkownika.

**Parametry:**
- `offerId` (path) - ID oferty do usunięcia

**Nagłówki:**
- `Authorization: Bearer {token}` - Token JWT użytkownika

**Odpowiedź sukcesu (200):**
```json
"Oferta została usunięta z ulubionych"
```

**Odpowiedź błędu (400):**
```json
"Użytkownik musi być zalogowany"
"Użytkownik nie znaleziony"
"Oferta nie jest w ulubionych"
```

### 3. Pobierz ulubione oferty

**GET** `/api/favorites`

Pobiera wszystkie ulubione oferty dla aktualnie zalogowanego użytkownika.

**Nagłówki:**
- `Authorization: Bearer {token}` - Token JWT użytkownika

**Odpowiedź sukcesu (200):**
```json
[
  {
    "id": "abc123def456",
    "name": "Nazwa oferty",
    "location": "Warszawa",
    "lat": 52.2297,
    "lon": 21.0122,
    "imageUrl": "/static/offer/abc123def456/offerImage_123.jpg",
    "transactionType": "SELL",
    "recommended": false,
    "isFavorite": true
  }
]
```

**Odpowiedź błędu (400):**
```json
"Użytkownik musi być zalogowany"
"Użytkownik nie znaleziony"
```

### 4. Sprawdź czy oferta jest w ulubionych

**GET** `/api/favorites/{offerId}/check`

Sprawdza czy oferta jest w ulubionych dla aktualnie zalogowanego użytkownika.

**Parametry:**
- `offerId` (path) - ID oferty do sprawdzenia

**Nagłówki:**
- `Authorization: Bearer {token}` - Token JWT użytkownika (opcjonalny)

**Odpowiedź sukcesu (200):**
```json
true
```
lub
```json
false
```

## Struktura bazy danych

### Tabela `favorite_offers`

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | BIGINT | Klucz główny (auto-increment) |
| `user_id` | BIGINT | ID użytkownika (klucz obcy do `users.id`) |
| `offer_id` | VARCHAR(12) | ID oferty (klucz obcy do `offer.id`) |
| `created_at` | TIMESTAMP | Data dodania do ulubionych |

**Indeksy:**
- `idx_favorite_offers_user_id` - dla lepszej wydajności zapytań po użytkowniku
- `idx_favorite_offers_offer_id` - dla lepszej wydajności zapytań po ofercie
- `idx_favorite_offers_created_at` - dla sortowania po dacie dodania
- `unique_user_offer` - unikalny klucz (user_id, offer_id) - zapobiega duplikatom

## Uwagi implementacyjne

1. **Autoryzacja**: Wszystkie endpointy wymagają zalogowanego użytkownika (z wyjątkiem sprawdzania czy oferta jest w ulubionych)
2. **Walidacja**: System sprawdza czy użytkownik nie próbuje dodać własnej oferty do ulubionych
3. **Duplikaty**: System zapobiega dodawaniu tej samej oferty do ulubionych wielokrotnie
4. **Cascade**: Usunięcie użytkownika lub oferty automatycznie usuwa powiązane wpisy z ulubionych
5. **Sortowanie**: Ulubione oferty są sortowane po dacie dodania (najnowsze pierwsze)

## Przykłady użycia

### Dodanie oferty do ulubionych
```bash
curl -X POST "http://localhost:8080/api/favorites/abc123def456" \
  -H "Authorization: Bearer your-jwt-token"
```

### Pobranie ulubionych ofert
```bash
curl -X GET "http://localhost:8080/api/favorites" \
  -H "Authorization: Bearer your-jwt-token"
```

### Sprawdzenie czy oferta jest w ulubionych
```bash
curl -X GET "http://localhost:8080/api/favorites/abc123def456/check" \
  -H "Authorization: Bearer your-jwt-token"
```

### Usunięcie oferty z ulubionych
```bash
curl -X DELETE "http://localhost:8080/api/favorites/abc123def456" \
  -H "Authorization: Bearer your-jwt-token"
```
