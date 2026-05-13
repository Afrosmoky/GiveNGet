# API Dokumentacja - Kategorie i Podkategorie

## Przegląd
Dokumentacja opisuje zmiany w endpointach związanych z kategoriami i podkategoriami po wprowadzeniu nowej struktury z typami transakcji.

## Zmiany w Strukturze Danych

### Nowe Pola
- **`allowedTransactionTypes`** (JSON) - tablica dozwolonych typów transakcji dla kategorii/podkategorii
- Format: `["free", "exchange", "sale"]`

### Typy Transakcji
- **`free`** - Darowizna (bezpłatne przekazanie)
- **`exchange`** - Wymiana (zamiana na inne produkty)
- **`sale`** - Sprzedaż (za pieniądze)

## Endpointy

### 1. Pobieranie Wszystkich Kategorii

#### Endpoint
```
GET /api/categories/all
```

#### Opis
Pobiera wszystkie kategorie z podkategoriami i nowym polem `allowedTransactionTypes`.

#### Odpowiedź
```json
[
  {
    "id": 1,
    "name": "Dania domowe (prywatne)",
    "allowedTransactionTypes": "[\"free\", \"exchange\"]",
    "subcategories": []
  },
  {
    "id": 2,
    "name": "Nadwyżki restauracyjne/sklepowe",
    "allowedTransactionTypes": "[\"free\", \"exchange\", \"sale\"]",
    "subcategories": []
  },
  {
    "id": 3,
    "name": "Inne",
    "allowedTransactionTypes": "[\"free\", \"exchange\", \"sale\"]",
    "subcategories": []
  },
  {
    "id": 4,
    "name": "Produkty spożywcze i domowego użytku",
    "allowedTransactionTypes": "[\"free\", \"exchange\", \"sale\"]",
    "subcategories": [
      {
        "id": 1,
        "name": "Świeże owoce",
        "allowedTransactionTypes": "[\"free\", \"exchange\", \"sale\"]",
        "category": {
          "id": 4,
          "name": "Produkty spożywcze i domowego użytku"
        }
      },
      {
        "id": 2,
        "name": "Plony z działki (domowe)",
        "allowedTransactionTypes": "[\"free\", \"exchange\"]",
        "category": {
          "id": 4,
          "name": "Produkty spożywcze i domowego użytku"
        }
      }
    ]
  }
]
```

#### Uwagi
- Pole `allowedTransactionTypes` jest zwracane jako string JSON
- Frontend musi sparsować JSON do tablicy stringów
- Podkategorie dziedziczą ograniczenia z kategorii nadrzędnej

### 2. Tworzenie Oferty

#### Endpoint
```
POST /api/offer
```

#### Opis
Tworzy nową ofertę z walidacją typów transakcji dla wybranej kategorii/podkategorii.

#### Request Body
```json
{
  "categoryId": 4,
  "subcategoryId": 2,
  "name": "Świeże jabłka z działki",
  "location": "Warszawa, Mokotów",
  "coordinates": "21.0122,52.2297",
  "description": "Ekologiczne jabłka z własnej działki",
  "pickupTimeFrom": "09:00",
  "pickupTimeTo": "18:00",
  "offerType": "free",
  "expiryDate": "2024-12-31"
}
```

#### Walidacja Podkategorii
- **`subcategoryId`** jest opcjonalne
- **Jeśli kategoria ma podkategorie** - `subcategoryId` jest wymagane
- **Jeśli kategoria nie ma podkategorii** - `subcategoryId` nie może być podane
- **Podkategoria musi należeć do wybranej kategorii**

#### Walidacja Typów Transakcji
- **Kategoria**: "Dania domowe (prywatne)" - tylko `free`, `exchange`
- **Podkategoria**: "Plony z działki (domowe)" - tylko `free`, `exchange`
- **Kategoria**: "Nadwyżki restauracyjne/sklepowe" - wszystkie typy (tylko konta firmowe)
- **Podkategoria**: "Nadwyżki restauracyjne" - wszystkie typy (tylko konta firmowe)

#### Błędy Walidacji
- **400 Bad Request** - jeśli typ transakcji nie jest dozwolony dla kategorii/podkategorii
- **400 Bad Request** - jeśli konto firmowe próbuje sprzedać w kategorii "Dania domowe (prywatne)"

#### Przykład Błędu
```json
{
  "error": "Typ transakcji 'sale' nie jest dozwolony dla kategorii 'Dania domowe (prywatne)'"
}
```

### 3. Edycja Oferty

#### Endpoint
```
PUT /api/offer/{id}
```

#### Opis
Aktualizuje istniejącą ofertę z walidacją typów transakcji.

#### Request Body
```json
{
  "categoryId": 4,
  "subcategoryId": 1,
  "name": "Świeże owoce",
  "description": "Różne owoce sezonowe",
  "offerType": "sale",
  "location": "Kraków, Stare Miasto",
  "coordinates": "19.9445,50.0647",
  "pickupTimeFrom": "10:00",
  "pickupTimeTo": "16:00",
  "expiryDate": "2024-12-25"
}
```

#### Walidacja
- **Podkategorie**: Zasady takie same jak przy tworzeniu oferty
- **Typy transakcji**: Sprawdza czy nowy typ transakcji jest dozwolony dla wybranej kategorii/podkategorii
- **Uprawnienia**: Sprawdza uprawnienia użytkownika (konta firmowe vs prywatne)

### 4. Pobieranie Ofert z Filtrowaniem

#### Endpoint
```
GET /api/offer
```

#### Parametry
- `categoryId` (opcjonalne) - lista ID kategorii
- `subcategoryId` (opcjonalne) - lista ID podkategorii
- `transactionType` (opcjonalne) - lista typów transakcji: `free`, `exchange`, `sale`
- `lat` (wymagane) - szerokość geograficzna
- `lon` (wymagane) - długość geograficzna
- `range` (wymagane) - zasięg w kilometrach
- `distanceUnit` (wymagane) - jednostka odległości

#### Przykład
```
GET /api/offer?categoryId=4&subcategoryId=1,2&transactionType=free,exchange&lat=52.2297&lon=21.0122&range=25&distanceUnit=KILOMETERS
```

#### Odpowiedź
```json
[
  {
    "id": "ABC123",
    "name": "Świeże owoce",
    "description": "Różne owoce sezonowe",
    "transactionType": "free",
    "category": {
      "id": 4,
      "name": "Produkty spożywcze i domowego użytku",
      "allowedTransactionTypes": "[\"free\", \"exchange\", \"sale\"]"
    },
    "subcategory": {
      "id": 1,
      "name": "Świeże owoce",
      "allowedTransactionTypes": "[\"free\", \"exchange\", \"sale\"]"
    },
    "location": "Warszawa, Mokotów",
    "distance": 2.5,
    "expiryDate": "2024-12-31"
  }
]
```

### 5. Ulubione Kategorie

#### Endpoint
```
GET /api/favorite-categories
```

#### Opis
Pobiera ulubione kategorie użytkownika z nowymi polami `allowedTransactionTypes`.

#### Odpowiedź
```json
{
  "categories": [
    {
      "id": 4,
      "name": "Produkty spożywcze i domowego użytku",
      "allowedTransactionTypes": "[\"free\", \"exchange\", \"sale\"]",
      "subcategories": [
        {
          "id": 1,
          "name": "Świeże owoce",
          "allowedTransactionTypes": "[\"free\", \"exchange\", \"sale\"]"
        }
      ]
    }
  ],
  "subcategories": [
    {
      "id": 2,
      "name": "Plony z działki (domowe)",
      "allowedTransactionTypes": "[\"free\", \"exchange\"]",
      "category": {
        "id": 4,
        "name": "Produkty spożywcze i domowego użytku"
      }
    }
  ]
}
```

### 6. Oferty z Ulubionych Kategorii

#### Endpoint
```
GET /api/favorite-categories/offers/latest
```

#### Opis
Pobiera najnowsze oferty z ulubionych kategorii użytkownika.

#### Parametry
- `lat` (opcjonalne) - szerokość geograficzna
- `lon` (opcjonalne) - długość geograficzna
- `distanceUnit` (opcjonalne, domyślnie: KILOMETERS) - jednostka odległości

#### Odpowiedź
```json
[
  {
    "id": "ABC123",
    "name": "Świeże owoce",
    "transactionType": "free",
    "category": {
      "id": 4,
      "name": "Produkty spożywcze i domowego użytku",
      "allowedTransactionTypes": "[\"free\", \"exchange\", \"sale\"]"
    },
    "subcategory": {
      "id": 1,
      "name": "Świeże owoce",
      "allowedTransactionTypes": "[\"free\", \"exchange\", \"sale\"]"
    },
    "distance": 2.5
  }
]
```

## Ograniczenia i Walidacja

### Ograniczenia Typów Transakcji

#### Kategorie z Ograniczeniami
1. **"Dania domowe (prywatne)"**
   - Dozwolone: `free`, `exchange`
   - Niedozwolone: `sale`

2. **"Nadwyżki restauracyjne/sklepowe"**
   - Dozwolone: `free`, `exchange`, `sale`
   - **Uwaga**: Sprzedaż tylko dla kont firmowych

#### Podkategorie z Ograniczeniami
1. **"Plony z działki (domowe)"**
   - Dozwolone: `free`, `exchange`
   - Niedozwolone: `sale`

2. **"Dania domowe"** (podkategoria)
   - Dozwolone: `free`, `exchange`
   - Niedozwolone: `sale`

3. **"Nadwyżki restauracyjne"** (podkategoria)
   - Dozwolone: `free`, `exchange`, `sale`
   - **Uwaga**: Sprzedaż tylko dla kont firmowych

### Walidacja Kont Firmowych
- Sprawdzanie typu użytkownika (`UserType.COMPANY`) przed zezwoleniem na sprzedaż
- Błąd 403 Forbidden dla kont prywatnych próbujących sprzedać w kategoriach firmowych

## Kody Błędów

### 400 Bad Request
- Nieprawidłowy typ transakcji dla kategorii/podkategorii
- Brak wymaganych pól w request body

### 403 Forbidden
- Konto prywatne próbuje sprzedać w kategorii firmowej
- Brak uprawnień do określonego typu transakcji

### 404 Not Found
- Kategoria/podkategoria nie istnieje
- Oferta nie istnieje

## Uwagi dla Frontendu

1. **Parsowanie JSON**: Pole `allowedTransactionTypes` jest zwracane jako string JSON - wymaga parsowania
2. **Walidacja**: Sprawdzać dozwolone typy transakcji przed wysłaniem formularza
3. **UI**: Ukrywać opcję sprzedaży dla kategorii z ograniczeniami
4. **Komunikaty**: Wyświetlać odpowiednie komunikaty o ograniczeniach dla użytkownika
5. **Ulubione**: Po migracji użytkownicy będą musieli ponownie wybrać ulubione kategorie

## Migracja Danych

- Wszystkie istniejące kategorie i podkategorie zostały usunięte
- Ulubione kategorie użytkowników zostały wyczyszczone
- Użytkownicy będą musieli ponownie wybrać ulubione kategorie
- Istniejące oferty zachowają swoje kategorie, ale mogą wymagać aktualizacji typów transakcji
