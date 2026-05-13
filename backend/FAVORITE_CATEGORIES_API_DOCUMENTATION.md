# API Dokumentacja - Ulubione Kategorie i Podkategorie

## Przegląd
System ulubionych kategorii pozwala użytkownikom na dodawanie kategorii lub podkategorii do ulubionych oraz wyświetlanie najnowszych ofert z tych kategorii/podkategorii.

**Ważne:** 
- Użytkownik może polubić całą kategorię lub konkretne podkategorie
- Jeśli użytkownik ma ulubioną całą kategorię i doda podkategorię, cała kategoria zostanie automatycznie usunięta z ulubionych
- Jeśli użytkownik ma ulubione podkategorie i doda całą kategorię, wszystkie podkategorie zostaną automatycznie usunięte z ulubionych
- Można dodawać wiele podkategorii z tej samej kategorii

## Endpointy

### 1. Dodaj kategorie i podkategorie do ulubionych
**POST** `/api/favorite-categories`

Dodaje kategorie i podkategorie do ulubionych dla aktualnie zalogowanego użytkownika. Można dodać wiele kategorii i podkategorii w jednym żądaniu.

**Body (JSON) - opcja 1 (tylko kategorie):**
```json
{
  "categoryIds": [1, 2, 3]
}
```

**Body (JSON) - opcja 2 (tylko podkategorie):**
```json
{
  "subcategories": [
    {"categoryId": 1, "subcategoryId": 5},
    {"categoryId": 1, "subcategoryId": 6},
    {"categoryId": 2, "subcategoryId": 10}
  ]
}
```

**Body (JSON) - opcja 3 (kategorie i podkategorie razem):**
```json
{
  "categoryIds": [1, 2],
  "subcategories": [
    {"categoryId": 3, "subcategoryId": 15},
    {"categoryId": 3, "subcategoryId": 16}
  ]
}
```

**Odpowiedź:**
- `200 OK` - Kategorie/podkategorie zostały dodane do ulubionych (z szczegółowym opisem)
- `400 Bad Request` - Błąd (np. kategoria/podkategoria już w ulubionych, użytkownik niezalogowany, nieprawidłowe dane)

**Uwagi:**
- **System porównuje istniejące ulubione z żądanymi i wykonuje tylko niezbędne operacje**
- **Elementy istniejące i żądane** - pozostają bez zmian
- **Elementy istniejące, ale nie żądane** - są usuwane
- **Elementy żądane, ale nie istniejące** - są dodawane
- Można dodawać wiele podkategorii z tej samej kategorii
- **Optymalizacja: operacje są wykonywane w batch'ach (deleteAll/saveAll)**
- **Uproszczenie: encja używa bezpośrednio ID zamiast relacji JPA - eliminuje problemy z mapowaniem**

**Przykład dodawania kategorii:**
```bash
POST /api/favorite-categories
Content-Type: application/json
Authorization: Bearer your-token

{
  "categoryIds": [1, 2, 3]
}
```

**Przykład dodawania podkategorii:**
```bash
POST /api/favorite-categories
Content-Type: application/json
Authorization: Bearer your-token

{
  "subcategories": [
    {"categoryId": 1, "subcategoryId": 5},
    {"categoryId": 1, "subcategoryId": 6}
  ]
}
```

**Przykład dodawania kategorii i podkategorii razem:**
```bash
POST /api/favorite-categories
Content-Type: application/json
Authorization: Bearer your-token

{
  "categoryIds": [1, 2],
  "subcategories": [
    {"categoryId": 3, "subcategoryId": 15},
    {"categoryId": 3, "subcategoryId": 16}
  ]
}
```

### 2. Usuń kategorię z ulubionych
**DELETE** `/api/favorite-categories/category/{categoryId}`

Usuwa kategorię z ulubionych dla aktualnie zalogowanego użytkownika.

**Parametry:**
- `categoryId` (path) - ID kategorii do usunięcia

**Przykład:**
```bash
DELETE /api/favorite-categories/category/1
Authorization: Bearer your-token
```

### 2a. Usuń podkategorię z ulubionych
**DELETE** `/api/favorite-categories/subcategory/{subcategoryId}`

Usuwa podkategorię z ulubionych dla aktualnie zalogowanego użytkownika.

**Parametry:**
- `subcategoryId` (path) - ID podkategorii do usunięcia

**Przykład:**
```bash
DELETE /api/favorite-categories/subcategory/5
Authorization: Bearer your-token
```

### 3. Pobierz ulubione kategorie i podkategorie
**GET** `/api/favorite-categories`

Pobiera wszystkie ulubione kategorie i podkategorie dla aktualnie zalogowanego użytkownika w formacie przyjaznym dla frontendu.

**Odpowiedź:**
- `200 OK` - Lista ulubionych kategorii i podkategorii w uproszczonym formacie
- `400 Bad Request` - Błąd (np. użytkownik niezalogowany)

**Przykład odpowiedzi:**
```json
{
  "favoriteCategoryIds": [1, 2, 3],
  "favoriteSubcategories": [
    {
      "categoryId": 4,
      "subcategoryId": 15
    },
    {
      "categoryId": 4,
      "subcategoryId": 16
    },
    {
      "categoryId": 5,
      "subcategoryId": 20
    }
  ]
}
```

**Opis pól:**
- `favoriteCategoryIds` - lista ID kategorii, które użytkownik ma w ulubionych
- `favoriteSubcategories` - lista obiektów zawierających `categoryId` i `subcategoryId` dla ulubionych podkategorii

### 4. Pobierz najnowsze oferty z ulubionych kategorii i podkategorii
**GET** `/api/favorite-categories/offers/latest`

Pobiera najnowsze oferty z ulubionych kategorii i podkategorii użytkownika z filtrowaniem geograficznym.

**Parametry opcjonalne:**
- `lat` (query) - Szerokość geograficzna dla obliczenia odległości
- `lon` (query) - Długość geograficzna dla obliczenia odległości
- `distanceUnit` (query) - Jednostka odległości (`KILOMETERS` lub `MILES`), domyślnie `KILOMETERS`

**Uwagi:**
- **Zasięg wyszukiwania: 25km** od podanych współrzędnych
- Jeśli współrzędne GPS nie zostaną podane, system użyje współrzędnych z profilu użytkownika
- Oferty są filtrowane według statusu `ACTIVE`
- **Response zawiera ID kategorii i podkategorii** każdej oferty
- Oferty są sortowane: najpierw polecane, potem według odległości
- System pobiera oferty zarówno z ulubionych kategorii jak i podkategorii
- **Optymalizacja: cache'owanie użytkowników** - `findByEmail` jest cache'owane na 5 minut
- **Optymalizacja: pojedyncze zapytanie** - pobiera kategorie i podkategorie w jednym wywołaniu

**Odpowiedź:**
- `200 OK` - Lista ofert z ulubionych kategorii i podkategorii
- `400 Bad Request` - Błąd (np. użytkownik niezalogowany)

**Przykład:**
```bash
GET /api/favorite-categories/offers/latest?lat=52.2297&lon=21.0122&distanceUnit=KILOMETERS
```

**Przykład odpowiedzi:**
```json
[
  {
    "id": "abc123def456",
    "name": "Świeże mleko",
    "transactionType": "FREE",
    "lat": 52.2297,
    "lon": 21.0122,
    "distance": "2.5 km",
    "location": "Warszawa",
    "imageUrl": "/uploads/images/offer/abc123/photo1.jpg",
    "recommended": false,
    "isFavorite": true,
    "status": "ACTIVE",
    "categoryId": 1,
    "subcategoryId": 15
  }
]
```

## Struktura bazy danych

### Tabela `favorite_categories`
```sql
CREATE TABLE favorite_categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    category_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_category (user_id, category_id)
);
```

## Uwagi implementacyjne

1. **Autoryzacja**: Wszystkie endpointy wymagają zalogowanego użytkownika
2. **Unikalność**: Użytkownik może mieć daną kategorię tylko raz w ulubionych
3. **Kaskadowe usuwanie**: Usunięcie użytkownika lub kategorii automatycznie usuwa powiązane rekordy
4. **Filtrowanie ofert**: Oferty są filtrowane według:
   - Kategorii ulubionych użytkownika
   - Daty utworzenia (ostatni tydzień)
   - Statusu `ACTIVE`
5. **Obliczanie odległości**: System automatycznie oblicza odległość między współrzędnymi użytkownika a ofertami

## Przykłady użycia

### Dodanie kategorii do ulubionych
```javascript
fetch('/api/favorite-categories', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({
    categoryIds: [1, 2, 3]
  })
})
.then(response => response.text())
.then(message => console.log(message));
```

### Dodanie podkategorii do ulubionych
```javascript
fetch('/api/favorite-categories', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({
    subcategories: [
      {categoryId: 1, subcategoryId: 5},
      {categoryId: 1, subcategoryId: 6},
      {categoryId: 2, subcategoryId: 10}
    ]
  })
})
.then(response => response.text())
.then(message => console.log(message));
```

### Dodanie kategorii i podkategorii razem
```javascript
fetch('/api/favorite-categories', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({
    categoryIds: [1, 2],
    subcategories: [
      {categoryId: 3, subcategoryId: 15},
      {categoryId: 3, subcategoryId: 16}
    ]
  })
})
.then(response => response.text())
.then(message => console.log(message));
```

### Pobranie ulubionych kategorii i podkategorii (dla modala)
```javascript
fetch('/api/favorite-categories', {
  headers: {
    'Authorization': 'Bearer your-token'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Ulubione kategorie:', data.favoriteCategoryIds);
  console.log('Ulubione podkategorie:', data.favoriteSubcategories);
  
  // Przykład użycia w modalu:
  // data.favoriteCategoryIds.forEach(categoryId => {
  //   document.getElementById(`category-${categoryId}`).checked = true;
  // });
  // 
  // data.favoriteSubcategories.forEach(sub => {
  //   document.getElementById(`subcategory-${sub.subcategoryId}`).checked = true;
  // });
});
```

### Pobranie najnowszych ofert z ulubionych kategorii i podkategorii
```javascript
fetch('/api/favorite-categories/offers/latest?lat=52.2297&lon=21.0122', {
  headers: {
    'Authorization': 'Bearer your-token'
  }
})
.then(response => response.json())
.then(offers => console.log(offers));
```
